import { prisma } from '@/lib/db';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { rateLimitByKey } from '@/lib/rate-limit';

const googleEnabled =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

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

        // Brute-force protection: cap attempts per email address.
        if (!rateLimitByKey(`login:${email}`, { windowMs: 15 * 60 * 1000, max: 10 }).ok) {
          return null;
        }

        let user: any = null;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (err) {
          console.error('Auth DB lookup failed:', err);
          // Fail closed if we can't even query the DB. Never grant access on error.
          return null;
        }

        // Unknown email → fail. There are no built-in/seed accounts: the first
        // admin is promoted manually in the database:
        //   UPDATE "User" SET role = 'admin' WHERE email = 'you@example.com';
        if (!user) return null;

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
            // Never auto-link a Google login onto an existing password account —
            // that would let whoever controls the Google identity take it over.
            allowDangerousEmailAccountLinking: false,
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
