import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { SITE_SETTINGS_TAG, loadPublicSiteSettings } from '@/lib/site-settings';
import { validateSiteSettings } from '@/lib/site-settings-shared';

// Evaluate per request (served from the 'site-settings' data cache), never
// frozen at build time.
export const dynamic = 'force-dynamic';

/**
 * Public site settings: about texts (+ Arabic versions), footer blurb, social
 * links and contact details (whatsappNumber, contactPhone, contactEmail,
 * contactAddress, contactHours). Values are validated on write and sanitised
 * on read.
 */
export async function GET() {
  try {
    const settings = await loadPublicSiteSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings GET failed', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  // Only keys present in the body are written, so a partial save never wipes
  // other settings. URLs must be https on the right network; phone numbers are
  // normalised (L-04).
  const { values, errors } = validateSiteSettings(body as Record<string, unknown>);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Invalid settings', fields: errors }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      Object.entries(values).map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: value ?? '' },
          create: { key, value: value ?? '' },
        })
      )
    );
    revalidateTag(SITE_SETTINGS_TAG);
    return NextResponse.json({ ok: true, settings: values });
  } catch (error) {
    console.error('Settings POST failed', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
