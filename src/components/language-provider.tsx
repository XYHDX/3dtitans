'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, Locale, defaultLocale, isLocale, localeSettings, translate } from '@/lib/i18n';

type TranslationContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

/** Legacy client-only storage key; still written so older code keeps working. */
const STORAGE_KEY = '3dtitans-locale';
const ONE_YEAR = 60 * 60 * 24 * 365;

function writeLocaleCookie(locale: Locale) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
}

function hasLocaleCookie() {
  return document.cookie.split('; ').some((c) => c.startsWith(`${LOCALE_COOKIE}=`));
}

/**
 * The locale is chosen on the server (cookie → Accept-Language → Arabic) and
 * passed in as `initialLocale`, so the first paint is already in the right
 * language and direction — no English flash, no layout jump (H-11).
 */
export function LanguageProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      try {
        writeLocaleCookie(next);
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage can be blocked (private mode); the cookie usually still works.
      }
      document.documentElement.lang = next;
      document.documentElement.dir = localeSettings[next].dir;
      // Re-render server components (layout <html lang/dir>, metadata, policy pages).
      router.refresh();
    },
    [router]
  );

  // One-time migration: visitors who picked a language before the cookie
  // existed only have it in localStorage. Adopt it once, then the cookie rules.
  useEffect(() => {
    try {
      if (hasLocaleCookie()) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored) && stored !== initialLocale) {
        setLocale(stored);
      } else {
        writeLocaleCookie(initialLocale);
      }
    } catch {
      // ignore
    }
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = useCallback(
    (key: string, fallback?: string, vars?: Record<string, string | number>) => translate(locale, key, fallback, vars),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
