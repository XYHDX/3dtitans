import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

type Ctx = { params: { id: string } };

function mapAddress(a: any) {
  return {
    id: a.id,
    label: a.label || '',
    name: a.name,
    line1: a.line1,
    line2: a.line2 || '',
    city: a.city,
    postalCode: a.postalCode,
    country: a.country,
    phone: a.phone || '',
    isDefault: !!a.isDefault,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

async function ownsAddress(userId: string, id: string) {
  const row = await prisma.address.findUnique({ where: { id }, select: { userId: true } });
  return row?.userId === userId;
}

/** PATCH /api/addresses/[id] — update fields, optionally promote to default */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    if (!(await ownsAddress(session.user.id, params.id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    const strFields: Array<[string, number]> = [
      ['label', 40], ['name', 120], ['line1', 200], ['line2', 200],
      ['city', 80], ['postalCode', 20], ['country', 80], ['phone', 30],
    ];
    for (const [k, max] of strFields) {
      if (typeof body[k] === 'string') {
        data[k] = body[k].trim().slice(0, max) || null;
      }
    }
    if (typeof body.isDefault === 'boolean') data.isDefault = body.isDefault;

    const updated = await prisma.address.update({
      where: { id: params.id },
      data,
    });

    // Manual fallback to enforce "single default" when isDefault flips to true
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, id: { not: updated.id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return NextResponse.json({ address: mapAddress(updated) });
  } catch (err: any) {
    console.error('addresses PATCH', err);
    return NextResponse.json({ error: err?.message || 'Failed to update' }, { status: 500 });
  }
}

/** DELETE /api/addresses/[id] — remove an address */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    if (!(await ownsAddress(session.user.id, params.id))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.address.delete({ where: { id: params.id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('addresses DELETE', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
