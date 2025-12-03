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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};

  if (body.role) {
    data.role = body.role;
  }

  if (typeof body.emailVerified === 'boolean') {
    data.emailVerified = body.emailVerified ? new Date() : null;
  }

  if (typeof body.isPrioritizedStore === 'boolean') {
    data.isPrioritizedStore = body.isPrioritizedStore;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  try {
    const prioritizedIds = await getPrioritizedIds();

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user.role as any) || 'user',
        image: user.image,
        emailVerified: !!user.emailVerified,
        createdAt: user.createdAt,
        isPrioritizedStore: !!user.isPrioritizedStore || prioritizedIds.has(user.id),
      },
    });
  } catch (error) {
    console.error('User update failed (priority flag)', error);
    const message = (error as any)?.message || '';
    if (message.includes('Unknown column') || message.includes('isPrioritizedStore')) {
      // Fallback: store prioritized IDs in SiteSetting so toggles still work without the column.
      const prioritize = !!body.isPrioritizedStore;
      const ensureOk = await ensureSiteSettingTable();
      if (!ensureOk) {
        return NextResponse.json(
          { error: 'Could not persist priority flag. SiteSetting table is missing and could not be created.' },
          { status: 500 }
        );
      }
      const prioritizedSetting = await prisma.siteSetting.findUnique({ where: { key: 'prioritizedStoreIds' } });
      let ids: string[] = [];
      try {
        ids = prioritizedSetting?.value ? JSON.parse(prioritizedSetting.value) : [];
      } catch {
        ids = [];
      }
      const set = new Set(ids.filter(Boolean));
      if (prioritize) {
        set.add(params.id);
      } else {
        set.delete(params.id);
      }
      const nextValue = JSON.stringify(Array.from(set));
      try {
        await prisma.siteSetting.upsert({
          where: { key: 'prioritizedStoreIds' },
          update: { value: nextValue },
          create: { key: 'prioritizedStoreIds', value: nextValue },
        });
      } catch (err) {
        console.error('Failed to upsert prioritizedStoreIds setting', err);
        return NextResponse.json(
          { error: 'Could not persist priority flag. Ensure SiteSetting table is available.' },
          { status: 500 }
        );
      }

      const user = await prisma.user.findUnique({ where: { id: params.id } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user.role as any) || 'user',
          image: user.image,
          emailVerified: !!user.emailVerified,
          createdAt: user.createdAt,
          isPrioritizedStore: prioritize,
        },
      });
    }
    // Retry without priority flag for legacy DBs that error for other reasons.
    const { isPrioritizedStore, ...rest } = data;
    const user = await prisma.user.update({
      where: { id: params.id },
      data: rest,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user.role as any) || 'user',
        image: user.image,
        emailVerified: !!user.emailVerified,
        createdAt: user.createdAt,
        isPrioritizedStore: !!user.isPrioritizedStore,
      },
    });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.user.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ ok: true });
}
