import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { SITE_SETTINGS_TAG } from '@/lib/site-settings';
import { isSiteSettingKey, validateSiteSettings } from '@/lib/site-settings-shared';

// Admin settings must always be fresh — no caching at any layer
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Admin-only generic site-setting writer.
 *
 * GET  /api/admin/settings?prefix=site.    → returns settings matching the prefix
 * PATCH /api/admin/settings  body { key: value, ... }  → upserts each key/value pair
 *
 * Used by admin tabs (general/maintenance, payments) to update any SiteSetting
 * row without baking the key list into the API. Only admins authorized.
 */
/** Currencies the shop can price in (ShamCash bills only in these). */
const SUPPORTED_CURRENCIES = ['USD', 'SYP'];

function isAdminOnly(role?: string | null) {
  return role === 'admin';
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOnly(session?.user?.role)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get('prefix') || '';
    const rows = await prisma.siteSetting.findMany({
      where: prefix ? { key: { startsWith: prefix } } : {},
      orderBy: { key: 'asc' },
    });
    const map: Record<string, string> = {};
    rows.forEach((r) => (map[r.key] = r.value));
    return NextResponse.json({ settings: map });
  } catch (err: any) {
    console.error('admin settings GET', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOnly(session?.user?.role)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an object of key/value pairs' }, { status: 400 });
    }

    // Whitelist of allowed key prefixes — anything else is rejected to prevent
    // a hijacked admin token from writing arbitrary settings.
    const ALLOWED_PREFIXES = ['site.', 'payment.', 'about', 'footer', 'facebook', 'instagram'];
    const entries: Array<[string, string]> = Object.entries(body as Record<string, unknown>)
      .filter(([k]) => isSiteSettingKey(k) || ALLOWED_PREFIXES.some((p) => k.startsWith(p)))
      .map(([k, v]) => [k, String(v ?? '')]);

    // Public site settings (links, contact details, about/footer texts) get
    // the same validation as POST /api/settings, so this route can't be used
    // to store e.g. a javascript: link (L-04).
    const publicPart = Object.fromEntries(entries.filter(([k]) => isSiteSettingKey(k)));
    const { values, errors } = validateSiteSettings(publicPart);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'Invalid settings', fields: errors }, { status: 400 });
    }
    const normalized = entries.map(([k, v]): [string, string] =>
      isSiteSettingKey(k) ? [k, values[k] ?? ''] : [k, v]
    );

    // Store currency: prices, ShamCash bills and order totals all depend on
    // it, so only the two supported codes are accepted.
    const currencyEntry = normalized.find(([k]) => k === 'payment.currencyLabel');
    if (currencyEntry) {
      const code = currencyEntry[1].trim().toUpperCase();
      if (!SUPPORTED_CURRENCIES.includes(code)) {
        return NextResponse.json(
          { error: `Store currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}.`, fields: { 'payment.currencyLabel': 'unsupportedCurrency' } },
          { status: 400 }
        );
      }
      currencyEntry[1] = code;
    }

    await prisma.$transaction(
      normalized.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    // Maintenance flag, payment settings and public settings are all cached
    // under this tag — make the change visible on the next request.
    revalidateTag(SITE_SETTINGS_TAG);

    return NextResponse.json({ ok: true, updated: normalized.length });
  } catch (err: any) {
    console.error('admin settings PATCH', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
