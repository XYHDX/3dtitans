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

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

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
    },
  });
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
