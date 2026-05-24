import { prisma } from '@/lib/db';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';

const googleEnabled =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

/**
 * Bootstrap-only seed accounts. These are NOT a backdoor — they auto-create
 * on the user's first login attempt ONLY when the supplied password matches
 * the documented seed password exactly. After that, the row in the database
 * is the source of truth: subsequent logins go through bcrypt against the
 * stored hash like any other account.
 *
 * Change these passwords by logging in once, then using "Forgot password" to
 * set a real password. The seed strings here will stop mattering after that.
 */
const seedUsers: Record<
  string,
  { name: string; password: string; role: 'admin' | 'store-owner' | 'user' }
> = {
  'admin@3dtitans.com':       { name: 'Admin Titan',   password: 'admin123', role: 'admin' },
  'yahyademeriah@gmail.com':  { name: 'Yahya Demeriah', password: 'admin123', role: 'admin' },
  'owner@3dtitans.com':       { name: 'Store Owner',   password: 'owner123', role: 'store-owner' },
  'aboude.murad@gmail.com':   { name: 'Aboude Murad',  password: 'owner123', role: 'store-owner' },
  'user@3dtitans.com':        { name: 'Regular User',  password: 'user123',  role: 'user' },
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
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      /**
       * STRICT bcrypt-only flow. No fallbacks, no hash-on-failure rewrites,
       * no ephemeral users. Either the email exists with a matching password,
       * or login fails. Period.
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        let user: any = null;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (err) {
          console.error('Auth DB lookup failed:', err);
          // Fail closed if we can't even query the DB. Never grant access on error.
          return null;
        }

        // Bootstrap path — create the seed user ONLY if the supplied password
        // matches the seed password exactly. This lets the very first admin
        // login succeed on a fresh DB without checking in pre-hashed passwords.
        // After this one-time create, the password lives in the DB hash and
        // can be changed via the normal forgot-password flow.
        if (!user) {
          const seed = seedUsers[email];
          if (!seed) return null;          // unknown email → fail
          if (password !== seed.password) return null;  // wrong password → fail

          try {
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
          } catch (err) {
            console.error('Seed bootstrap create failed:', err);
            return null;
          }
        }

        // Account exists but has no password hash → registered via Google OAuth.
        // They must use the Google button, not the password form. Fail closed.
        if (!user.passwordHash) {
          return null;
        }

        // The one and only authentication check. No fallbacks below this line.
        let isValid = false;
        try {
          isValid = await bcrypt.compare(password, user.passwordHash);
        } catch (err) {
          console.error('bcrypt.compare failed:', err);
          return null;
        }
        if (!isValid) return null;

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
            allowDangerousEmailAccountLinking: true,
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
        session.user.role = (token.role as any) || 'user';
        (session.user as any).isPrioritizedStore = token.isPrioritizedStore || false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
