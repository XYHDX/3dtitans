import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/admin/stores/reorder
 * Body: { order: [storeId, storeId, ...] }   // top-of-list first
 *
 * Bulk-updates Store.sortOrder so the first ID in the array gets the lowest
 * sortOrder (0), the next gets 10, etc. Step of 10 leaves room to insert
 * single moves without renumbering every row later.
 *
 * Admin-only.
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    const body = await req.json();
    const order: string[] = Array.isArray(body?.order) ? body.order.filter((x: any) => typeof x === 'string') : [];
    if (order.length === 0) {
      return NextResponse.json({ error: 'order array required' }, { status: 400 });
    }

    // Sequential updates — keeps Postgres happy and is fast enough for any
    // reasonable number of stores. Wrapped in a transaction for atomicity.
    await prisma.$transaction(
      order.map((id, idx) =>
        prisma.store.update({ where: { id }, data: { sortOrder: idx * 10 } as any })
      )
    );

    return NextResponse.json({ ok: true, updated: order.length });
  } catch (err: any) {
    // Don't leak raw Prisma messages to the client; log server-side.
    console.error('admin/stores/reorder PATCH', err);
    return NextResponse.json({ error: 'Failed to reorder stores' }, { status: 500 });
  }
}
