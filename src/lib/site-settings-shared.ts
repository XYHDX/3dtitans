import type { Locale } from './i18n';
import type { SiteSettings } from './types';

/**
 * Public, admin-editable site settings (SiteSetting rows): keys, validation
 * and link helpers. Client-safe (no Prisma) — used by /api/settings, the
 * admin form, the footer, the WhatsApp button and the product page.
 */

export type SiteSettingKey = keyof SiteSettings;

type SettingKind = 'text' | 'facebook' | 'instagram' | 'whatsapp' | 'phone' | 'email';
type SettingRule = { kind: SettingKind; max: number };

/** Every public key with its validation rule. `…Ar` keys hold the Arabic version. */
export const SITE_SETTING_RULES: Record<SiteSettingKey, SettingRule> = {
  aboutHeroTitle: { kind: 'text', max: 120 },
  aboutHeroTitleAr: { kind: 'text', max: 120 },
  aboutHeroSubtitle: { kind: 'text', max: 300 },
  aboutHeroSubtitleAr: { kind: 'text', max: 300 },
  aboutMissionTitle: { kind: 'text', max: 120 },
  aboutMissionTitleAr: { kind: 'text', max: 120 },
  aboutMission: { kind: 'text', max: 2000 },
  aboutMissionAr: { kind: 'text', max: 2000 },
  aboutContactTitle: { kind: 'text', max: 120 },
  aboutContactTitleAr: { kind: 'text', max: 120 },
  aboutContact: { kind: 'text', max: 1000 },
  aboutContactAr: { kind: 'text', max: 1000 },
  aboutContactCardTitle: { kind: 'text', max: 120 },
  aboutContactCardTitleAr: { kind: 'text', max: 120 },
  footerBlurb: { kind: 'text', max: 500 },
  footerBlurbAr: { kind: 'text', max: 500 },
  facebookUrl: { kind: 'facebook', max: 300 },
  instagramUrl: { kind: 'instagram', max: 300 },
  whatsappNumber: { kind: 'whatsapp', max: 32 },
  contactPhone: { kind: 'phone', max: 32 },
  contactEmail: { kind: 'email', max: 254 },
  contactAddress: { kind: 'text', max: 300 },
  contactAddressAr: { kind: 'text', max: 300 },
  contactHours: { kind: 'text', max: 200 },
  contactHoursAr: { kind: 'text', max: 200 },
};

export const SITE_SETTING_KEYS = Object.keys(SITE_SETTING_RULES) as SiteSettingKey[];

export function isSiteSettingKey(key: string): key is SiteSettingKey {
  return Object.prototype.hasOwnProperty.call(SITE_SETTING_RULES, key);
}

export function emptySiteSettings(): Required<SiteSettings> {
  return Object.fromEntries(SITE_SETTING_KEYS.map((k) => [k, ''])) as Required<SiteSettings>;
}

/** Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits → ASCII. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Normalise a WhatsApp number to `+<country code><number>` (8–15 digits).
 * Accepts spaces, dashes, dots, brackets, Arabic digits and a `00` prefix.
 * Local numbers starting with 0 are rejected: wa.me needs the country code.
 */
export function normalizeWhatsappNumber(raw: string): string | null {
  let v = normalizeDigits(raw).trim().replace(/[\s\-().]/g, '');
  if (v.startsWith('00')) v = `+${v.slice(2)}`;
  if (!/^\+?\d{8,15}$/.test(v)) return null;
  const digits = v.replace(/^\+/, '');
  if (digits.startsWith('0')) return null;
  return `+${digits}`;
}

/** Validate a display phone number: 8–15 digits, optional +, common separators. */
export function normalizePhone(raw: string): string | null {
  const v = normalizeDigits(raw).trim().replace(/\s+/g, ' ');
  if (!/^\+?[\d\s\-().]+$/.test(v)) return null;
  const digits = v.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** https only, and the host must belong to the expected network (L-04). */
export function isAllowedSocialUrl(value: string, network: 'facebook' | 'instagram'): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    const domain = `${network}.com`;
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

/** Strip control characters (keeps line breaks and tabs in multi-line text). */
function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

/** Error codes; the admin form maps them to `settings.errors.<code>` strings. */
export type SettingErrorCode =
  | 'notText'
  | 'tooLong'
  | 'invalidFacebookUrl'
  | 'invalidInstagramUrl'
  | 'invalidWhatsapp'
  | 'invalidPhone'
  | 'invalidEmail';

export function validateSiteSetting(key: SiteSettingKey, raw: unknown): { value?: string; error?: SettingErrorCode } {
  if (raw === null || raw === undefined) return { value: '' };
  if (typeof raw !== 'string') return { error: 'notText' };
  const rule = SITE_SETTING_RULES[key];
  const value = cleanText(raw);
  if (value.length > rule.max) return { error: 'tooLong' };
  if (value === '') return { value };
  switch (rule.kind) {
    case 'facebook':
      return isAllowedSocialUrl(value, 'facebook') ? { value } : { error: 'invalidFacebookUrl' };
    case 'instagram':
      return isAllowedSocialUrl(value, 'instagram') ? { value } : { error: 'invalidInstagramUrl' };
    case 'whatsapp': {
      const normalized = normalizeWhatsappNumber(value);
      return normalized ? { value: normalized } : { error: 'invalidWhatsapp' };
    }
    case 'phone': {
      const normalized = normalizePhone(value);
      return normalized ? { value: normalized } : { error: 'invalidPhone' };
    }
    case 'email':
      return EMAIL_RE.test(value) ? { value: value.toLowerCase() } : { error: 'invalidEmail' };
    default:
      return { value };
  }
}

/**
 * Validate the known keys present in `input` (missing keys are left alone, so
 * a partial save never wipes other settings). Unknown keys are ignored.
 */
export function validateSiteSettings(input: Record<string, unknown>): {
  values: Partial<Record<SiteSettingKey, string>>;
  errors: Partial<Record<SiteSettingKey, SettingErrorCode>>;
} {
  const values: Partial<Record<SiteSettingKey, string>> = {};
  const errors: Partial<Record<SiteSettingKey, SettingErrorCode>> = {};
  for (const key of SITE_SETTING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const result = validateSiteSetting(key, input[key]);
    if (result.error) errors[key] = result.error;
    else values[key] = result.value ?? '';
  }
  return { values, errors };
}

/**
 * Drop stored values that would be unsafe to render (e.g. a `javascript:`
 * link saved before validation existed). Used when reading settings.
 */
export function sanitizeStoredSettings(map: Record<string, string>): Required<SiteSettings> {
  const out = emptySiteSettings();
  for (const key of SITE_SETTING_KEYS) {
    const result = validateSiteSetting(key, map[key] ?? '');
    out[key] = result.error ? '' : result.value ?? '';
  }
  return out;
}

type LocalizedKey =
  | 'aboutHeroTitle'
  | 'aboutHeroSubtitle'
  | 'aboutMissionTitle'
  | 'aboutMission'
  | 'aboutContactTitle'
  | 'aboutContact'
  | 'aboutContactCardTitle'
  | 'footerBlurb'
  | 'contactAddress'
  | 'contactHours';

/**
 * Admin text for the visitor's language. Arabic visitors get the `…Ar` value;
 * English visitors the base value. With `crossFallback` the other language is
 * used when the requested one is empty (for facts like an address); without it
 * the caller shows its translated default instead (for marketing copy).
 */
export function localizedSetting(
  settings: SiteSettings | null | undefined,
  key: LocalizedKey,
  locale: Locale,
  crossFallback = false
): string {
  if (!settings) return '';
  const en = (settings[key] || '').trim();
  const ar = (settings[`${key}Ar` as SiteSettingKey] || '').trim();
  const primary = locale === 'ar' ? ar : en;
  if (primary || !crossFallback) return primary;
  return locale === 'ar' ? en : ar;
}

/** https://wa.me link with an optional pre-filled message, or null. */
export function whatsappHref(number: string | null | undefined, message?: string): string | null {
  if (!number) return null;
  const normalized = normalizeWhatsappNumber(number);
  if (!normalized) return null;
  const digits = normalized.slice(1);
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}

/** tel: link for a display phone number, or null. */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const plus = normalized.trim().startsWith('+') ? '+' : '';
  return `tel:${plus}${normalized.replace(/\D/g, '')}`;
}
