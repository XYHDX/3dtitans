import { prisma } from '@/lib/db';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';

const googleEnabled =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

const seedUsers: Record<
  string,
  { name: string; password: string; role: 'admin' | 'store-owner' | 'user' }
> = {
  'admin@3dtitans.com': { name: 'Admin Titan', password: 'admin123', role: 'admin' },
  'yahyademeriah@gmail.com': { name: 'Yahya Demeriah', password: 'admin123', role: 'admin' },
  'owner@3dtitans.com': { name: 'Store Owner', password: 'owner123', role: 'store-owner' },
  'aboude.murad@gmail.com': { name: 'Aboude Murad', password: 'owner123', role: 'store-owner' },
  'user@3dtitans.com': { name: 'Regular User', password: 'user123', role: 'user' },
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === 'development' ? 'dev-secret' : undefined),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = credentials.email.toLowerCase();
        let user = await prisma.user.findUnique({
          where: { email },
        });

        // If DB is empty, auto-create known seed accounts so admin/store-owner logins work.
        if (!user && seedUsers[email]) {
          const seed = seedUsers[email];
          const passwordHash = await bcrypt.hash(seed.password, 10);
          user = await prisma.user.create({
            data: {
              email,
              name: seed.name,
              passwordHash,
              role: seed.role,
              emailVerified: new Date(),
            },
          });
        }

        // If the user exists but has no passwordHash and matches a seed, set it.
        if (user && !user.passwordHash && seedUsers[email]) {
          const seed = seedUsers[email];
          const passwordHash = await bcrypt.hash(seed.password, 10);
          user = await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, role: seed.role, name: user.name || seed.name, emailVerified: user.emailVerified || new Date() },
          });
        }

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role || 'user';
        token.isPrioritizedStore = (user as any).isPrioritizedStore || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || 'user';
        (session.user as any).isPrioritizedStore = token.isPrioritizedStore || false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
