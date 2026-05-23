import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const KEYS = [
  'aboutHeroTitle',
  'aboutHeroSubtitle',
  'aboutMissionTitle',
  'aboutMission',
  'aboutContactTitle',
  'aboutContact',
  'aboutContactCardTitle',
  'footerBlurb',
  'facebookUrl',
  'instagramUrl',
] as const;

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: KEYS as unknown as string[] } },
    });

    const map: Record<string, string> = {};
    settings.forEach((s) => (map[s.key] = s.value));

    const settingsPayload = {
      aboutHeroTitle: map.aboutHeroTitle || '',
      aboutHeroSubtitle: map.aboutHeroSubtitle || '',
      aboutMissionTitle: map.aboutMissionTitle || '',
      aboutMission: map.aboutMission || '',
      aboutContactTitle: map.aboutContactTitle || '',
      aboutContact: map.aboutContact || '',
      aboutContactCardTitle: map.aboutContactCardTitle || '',
      footerBlurb: map.footerBlurb || '',
      facebookUrl: map.facebookUrl || '',
      instagramUrl: map.instagramUrl || '',
    };

    return NextResponse.json({ settings: settingsPayload });
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

  try {
    const body = await req.json();
    const updates = KEYS.map((key) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value: body[key] || '' },
        create: { key, value: body[key] || '' },
      })
    );
    await Promise.all(updates);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Settings POST failed', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
