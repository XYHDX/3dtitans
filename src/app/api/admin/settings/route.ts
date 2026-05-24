import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

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
    const entries = Object.entries(body).filter(([k]) =>
      ALLOWED_PREFIXES.some((p) => k.startsWith(p))
    );

    await Promise.all(
      entries.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: String(value ?? '') },
          create: { key, value: String(value ?? '') },
        })
      )
    );

    return NextResponse.json({ ok: true, updated: entries.length });
  } catch (err: any) {
    console.error('admin settings PATCH', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
