'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { LanguageProvider } from '@/components/language-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <SessionProvider>{children}</SessionProvider>
    </LanguageProvider>
  );
}
