import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

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

function validateAddress(body: any): { ok: true; data: any } | { ok: false; error: string } {
  const required = ['name', 'line1', 'city', 'postalCode', 'country'];
  for (const k of required) {
    if (!body[k] || typeof body[k] !== 'string' || !body[k].trim()) {
      return { ok: false, error: `${k} is required` };
    }
  }
  return {
    ok: true,
    data: {
      label: typeof body.label === 'string' ? body.label.trim().slice(0, 40) : null,
      name: body.name.trim().slice(0, 120),
      line1: body.line1.trim().slice(0, 200),
      line2: typeof body.line2 === 'string' ? body.line2.trim().slice(0, 200) : null,
      city: body.city.trim().slice(0, 80),
      postalCode: body.postalCode.trim().slice(0, 20),
      country: body.country.trim().slice(0, 80),
      phone: typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : null,
      isDefault: !!body.isDefault,
    },
  };
}

/** GET /api/addresses — list current user's addresses (default first) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ addresses: [] });
    }
    const rows = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ addresses: rows.map(mapAddress) });
  } catch (err) {
    console.error('addresses GET', err);
    return NextResponse.json({ addresses: [], error: 'Failed to load addresses' }, { status: 500 });
  }
}

/** POST /api/addresses — create a new address */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const v = validateAddress(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    // If this is the user's first address, force it to be the default.
    const count = await prisma.address.count({ where: { userId: session.user.id } });
    const isDefault = count === 0 || !!v.data.isDefault;

    const created = await prisma.address.create({
      data: { ...v.data, isDefault, userId: session.user.id },
    });

    // If we set this as default, clear the flag on other addresses (manual
    // fallback in case the SQL trigger isn't installed yet).
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, id: { not: created.id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return NextResponse.json({ address: mapAddress(created) });
  } catch (err: any) {
    console.error('addresses POST', err);
    return NextResponse.json({ error: err?.message || 'Failed to save' }, { status: 500 });
  }
}
