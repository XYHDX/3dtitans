'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { LanguageProvider } from '@/components/language-provider';
import { CartSync } from '@/hooks/use-cart';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <SessionProvider>
        {/* Owns guest↔user cart mode + login-time merge. Renders nothing. */}
        <CartSync />
        {children}
      </SessionProvider>
    </LanguageProvider>
  );
}
