import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      role?: 'admin' | 'store-owner' | 'user';
      isPrioritizedStore?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'admin' | 'store-owner' | 'user';
    isPrioritizedStore?: boolean;
    /** Copied into the JWT at sign-in; see lib/auth/options.ts. */
    tokenVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'admin' | 'store-owner' | 'user';
    isPrioritizedStore?: boolean;
    /** User.tokenVersion at sign-in; a mismatch with the database ends the session. */
    tokenVersion?: number;
    /** Epoch ms of the last database re-check of role / tokenVersion. */
    checkedAt?: number;
    /** Set when the session was revoked (user deleted, role changed, password reset). */
    revoked?: boolean;
  }
}
