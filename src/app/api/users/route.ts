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

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const prioritizedSetting = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
    const prioritizedIds = (() => {
      if (!prioritizedSetting?.value) return new Set<string>();
      try {
        return new Set<string>(JSON.parse(prioritizedSetting.value));
      } catch {
        return new Set<string>();
      }
    })();

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
    const prioritizedSetting = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
    const prioritizedIds = (() => {
      if (!prioritizedSetting?.value) return new Set<string>();
      try {
        return new Set<string>(JSON.parse(prioritizedSetting.value));
      } catch {
        return new Set<string>();
      }
    })();
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
