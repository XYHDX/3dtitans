import 'server-only';
import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, defaultLocale, isLocale, localeSettings, translate, type Locale } from './i18n';

/**
 * Server-side language selection (H-11).
 *
 * 1. The `3dt-locale` cookie set by the language toggle wins.
 * 2. Otherwise the browser's Accept-Language: if it prefers English over
 *    Arabic we serve English; everything else gets Arabic (the shop's market
 *    is Syria, and crawlers that send no header see the Arabic site).
 */
export function pickLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag, weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.tag && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (const { tag } of ranked) {
    if (tag === 'ar' || tag.startsWith('ar-')) return 'ar';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }
  return defaultLocale;
}

/** The locale for the current request (server components / route handlers). */
export function getServerLocale(): Locale {
  const fromCookie = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return pickLocaleFromAcceptLanguage(headers().get('accept-language'));
}

export type ServerTranslator = (key: string, fallback?: string, vars?: Record<string, string | number>) => string;

/** `t()` for server components; same dictionary and fallbacks as the client hook. */
export function getServerTranslator(locale: Locale = getServerLocale()): ServerTranslator {
  return (key, fallback, vars) => translate(locale, key, fallback, vars);
}

export function localeDir(locale: Locale): 'ltr' | 'rtl' {
  return localeSettings[locale].dir;
}

/** BCP-47 tag used for dates/numbers. ar-SY gives Levantine month names. */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-SY' : 'en-GB';
}
