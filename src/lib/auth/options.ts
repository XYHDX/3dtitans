import { prisma } from '@/lib/db';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { clientIp, rateLimitByKey } from '@/lib/rate-limit';

const googleEnabled =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

/** Sessions last 7 days (rolling) instead of NextAuth's default 30. */
const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;
/** How often a session re-reads role / tokenVersion from the database. */
const RECHECK_MS = 60 * 1000;

/**
 * bcrypt hash of a random string nobody knows. Unknown emails are compared
 * against it so a failed login takes the same time whether or not the
 * account exists (no user enumeration through timing).
 */
const DUMMY_HASH = '$2a$10$cJpnqTP0Z1DYCCuOn7wjbuBcS9NoUW8kJdUTiOc0zDZ9yV8xtD1wu';

type Role = 'admin' | 'store-owner' | 'user';
type AccessRow = { role: string; tokenVersion: number; isPrioritizedStore: boolean };

/**
 * Per-instance cache of the access check, so a burst of API calls from one
 * user costs one small primary-key query per minute, not one per request.
 * (Route handlers can't write the refreshed token back to the cookie, so the
 * token's own `checkedAt` only advances when the browser polls the session.)
 */
const accessCache = new Map<string, { row: AccessRow | null; at: number }>();

async function loadAccess(userId: string, now: number): Promise<AccessRow | null> {
  const cached = accessCache.get(userId);
  if (cached && now - cached.at < RECHECK_MS) return cached.row;
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tokenVersion: true, isPrioritizedStore: true },
  });
  if (accessCache.size > 10_000) accessCache.clear();
  accessCache.set(userId, { row, at: now });
  return row;
}

/**
 * Drop this instance's cached access row after changing a user's role,
 * tokenVersion or deleting them (other instances catch up within a minute).
 */
export function forgetSessionAccess(userId: string) {
  accessCache.delete(userId);
}

/** Signed out: a token without id / role, which every route treats as anonymous. */
function revoked(): JWT {
  return { revoked: true };
}

function asRole(role: unknown): Role {
  return role === 'admin' || role === 'store-owner' ? role : 'user';
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_S,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_S,
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        // Brute-force protection: cap attempts per client IP (password spraying
        // across many emails) and per email address. The per-email cap is loose
        // enough that a stranger can't lock the real owner out for long.
        if (!rateLimitByKey(`login-ip:${clientIp(req)}`, { windowMs: 15 * 60 * 1000, max: 150 }).ok) {
          return null;
        }
        if (!rateLimitByKey(`login:${email}`, { windowMs: 15 * 60 * 1000, max: 20 }).ok) {
          return null;
        }

        let user: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (err) {
          console.error('Auth DB lookup failed:', err);
          // Fail closed if we can't even query the DB. Never grant access on error.
          return null;
        }

        // Unknown email, or an account registered via Google (no password hash):
        // still run one bcrypt comparison so the response time doesn't reveal
        // whether the account exists. There are no built-in/seed accounts: the
        // first admin is promoted manually in the database:
        //   UPDATE "User" SET role = 'admin' WHERE email = 'you@example.com';
        if (!user || !user.passwordHash) {
          await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
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
          role: asRole(user.role),
          isPrioritizedStore: !!user.isPrioritizedStore,
          tokenVersion: user.tokenVersion ?? 0,
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
    async signIn({ account, profile }) {
      // Only accept Google identities whose email Google has verified.
      if (account?.provider === 'google') {
        return (profile as { email_verified?: unknown } | undefined)?.email_verified === true;
      }
      return true;
    },
    async jwt({ token, user }) {
      const now = Date.now();

      // Sign-in: snapshot the account's role and token version.
      if (user) {
        const u = user as { id: string; role?: unknown; isPrioritizedStore?: unknown; tokenVersion?: unknown };
        token.id = u.id;
        token.role = asRole(u.role);
        token.isPrioritizedStore = !!u.isPrioritizedStore;
        token.tokenVersion = typeof u.tokenVersion === 'number' ? u.tokenVersion : 0;
        token.checkedAt = now;
        delete token.revoked;
        return token;
      }

      if (!token.id || token.revoked) return revoked();
      if (typeof token.checkedAt === 'number' && now - token.checkedAt < RECHECK_MS) return token;

      // Re-check at most once a minute: a deleted user, or a bumped tokenVersion
      // (role change, password reset), ends the session; otherwise refresh the role.
      let row: AccessRow | null;
      try {
        row = await loadAccess(token.id, now);
      } catch (err) {
        // DB unreachable: keep the session for now (every other route fails
        // anyway) and try again on the next request.
        console.error('Session re-check failed:', err);
        return token;
      }
      if (!row || (row.tokenVersion ?? 0) !== (token.tokenVersion ?? 0)) return revoked();

      token.role = asRole(row.role);
      token.isPrioritizedStore = !!row.isPrioritizedStore;
      token.checkedAt = now;
      return token;
    },
    async session({ session, token }) {
      // A revoked / anonymous token yields a session without a user.
      if (!token.id || token.revoked) return { expires: session.expires };
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role || 'user';
        session.user.isPrioritizedStore = token.isPrioritizedStore || false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
