import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const KEYS = ['aboutMission', 'aboutContact', 'footerBlurb'] as const;

export async function GET() {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: KEYS as unknown as string[] } },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => (map[s.key] = s.value));

  return NextResponse.json({
    settings: {
      aboutMission: map.aboutMission || '',
      aboutContact: map.aboutContact || '',
      footerBlurb: map.footerBlurb || '',
    },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
}
