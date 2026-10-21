'use client';

import { useEffect, useState } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/language-provider';

/**
 * "Continue with Google" block for the login / signup pages. Renders nothing
 * unless Google sign-in is actually configured on the server (asks NextAuth's
 * built-in /api/auth/providers), so customers never see a button that fails.
 * `callbackUrl` must already be a sanitised same-origin path (safeNextPath).
 */
export function GoogleSignInButton({ callbackUrl, label }: { callbackUrl: string; label: string }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    getProviders()
      .then((providers) => {
        if (alive) setEnabled(!!providers?.google);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('authCommon.orContinueWith', 'Or continue with')}</span>
        </div>
      </div>
      <Button variant="outline" type="button" className="w-full" onClick={() => signIn('google', { callbackUrl })}>
        <svg className="me-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {label}
      </Button>
    </>
  );
}

/**
 * Text link style for light AND dark surfaces: dark text with a yellow
 * underline (yellow text on the light background is unreadable), yellow text
 * only in dark mode.
 */
export const AUTH_LINK_CLASS =
  'font-semibold text-foreground underline decoration-primary decoration-[3px] underline-offset-4 hover:bg-accent hover:text-accent-foreground dark:text-primary dark:hover:text-accent-foreground';
