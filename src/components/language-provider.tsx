'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Locale, defaultLocale, localeSettings, translations } from '@/lib/i18n';

type TranslationContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

const STORAGE_KEY = '3dtitans-locale';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) as Locale | null) : null;
    if (stored && translations[stored]) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = localeSettings[locale].dir;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const translate = useCallback(
    (key: string, fallback?: string, vars?: Record<string, string | number>) => {
      const template = translations[locale]?.[key] ?? translations.en[key] ?? fallback ?? key;
      return template.replace(/\{(\w+)\}/g, (_, token) => {
        if (vars && token in vars) return String(vars[token]);
        return `{${token}}`;
      });
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: translate,
    }),
    [locale, setLocale, translate]
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
