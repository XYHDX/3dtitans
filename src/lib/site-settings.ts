import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import type { SiteSettings } from './types';
import { SITE_SETTING_KEYS, emptySiteSettings, sanitizeStoredSettings } from './site-settings-shared';

/** Cache tag for every SiteSetting read; call revalidateTag(SITE_SETTINGS_TAG) after a write. */
export const SITE_SETTINGS_TAG = 'site-settings';

/** Cached read that throws on DB errors (the API uses it to report a 500). */
export const loadPublicSiteSettings = unstable_cache(
  async (): Promise<Required<SiteSettings>> => {
    // Throws on DB errors so a failure is never cached.
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: SITE_SETTING_KEYS as string[] } },
    });
    const map: Record<string, string> = {};
    rows.forEach((r) => (map[r.key] = r.value));
    return sanitizeStoredSettings(map);
  },
  ['public-site-settings'],
  { revalidate: 300, tags: [SITE_SETTINGS_TAG] }
);

/**
 * Public site settings (about texts, footer, social links, contact details),
 * cached for 5 minutes and refreshed immediately when an admin saves.
 * Never throws: on a DB error it returns empty values so the page still renders.
 */
export async function getPublicSiteSettings(): Promise<Required<SiteSettings>> {
  try {
    return await loadPublicSiteSettings();
  } catch (err) {
    console.error('site settings fetch failed', err);
    return emptySiteSettings();
  }
}
