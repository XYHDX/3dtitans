import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** The admin list shows the newest users first, capped so the page stays fast. */
const MAX_USERS = 1000;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

/** Legacy store priority list (before User.isPrioritizedStore existed). Read-only. */
async function getPrioritizedIds() {
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
    const [prioritizedIds, users] = await Promise.all([
      getPrioritizedIds(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: MAX_USERS,
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
      }),
    ]);

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
      truncated: users.length === MAX_USERS,
    });
  } catch (error) {
    console.error('Users GET failed', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
