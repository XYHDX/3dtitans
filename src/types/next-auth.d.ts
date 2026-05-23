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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'admin' | 'store-owner' | 'user';
    isPrioritizedStore?: boolean;
  }
}
