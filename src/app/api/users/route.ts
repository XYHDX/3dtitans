import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

async function ensureSiteSettingTable() {
  try {
    await prisma.siteSetting.findFirst({ select: { key: true }, take: 1 });
    return true;
  } catch (error) {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SiteSetting" (
          "key" TEXT PRIMARY KEY,
          "value" TEXT NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return true;
    } catch (err) {
      console.error('Failed to ensure SiteSetting table', err);
      return false;
    }
  }
}

async function getPrioritizedIds() {
  const ok = await ensureSiteSettingTable();
  if (!ok) return new Set<string>();
  try {
    const prioritizedSetting = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
    if (!prioritizedSetting?.value) return new Set<string>();
    return new Set<string>(JSON.parse(prioritizedSetting.value));
  } catch (error) {
    console.error('Failed to read prioritizedStoreIds', error);
    return new Set<string>();
  }
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const prioritizedIds = await getPrioritizedIds();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        isPrioritizedStore: true,
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: (u.role as any) || 'user',
        image: u.image,
        emailVerified: !!u.emailVerified,
        createdAt: u.createdAt,
        isPrioritizedStore: !!u.isPrioritizedStore || prioritizedIds.has(u.id),
      })),
    });
  } catch (error) {
    console.error('Users GET failed (priority select)', error);
    const prioritizedIds = await getPrioritizedIds();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: (u.role as any) || 'user',
        image: u.image,
        emailVerified: !!u.emailVerified,
        createdAt: u.createdAt,
        isPrioritizedStore: prioritizedIds.has(u.id),
      })),
    });
  }
}
