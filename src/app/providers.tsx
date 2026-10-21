'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { LanguageProvider } from '@/components/language-provider';
import { CartSync } from '@/hooks/use-cart';
import type { Locale } from '@/lib/i18n';

export function AppProviders({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <SessionProvider refetchOnWindowFocus={false}>
        {/* Owns guest↔user cart mode + login-time merge. Renders nothing. */}
        <CartSync />
        {children}
      </SessionProvider>
    </LanguageProvider>
  );
}
