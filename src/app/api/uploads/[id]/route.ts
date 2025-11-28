import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'store-owner')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.upload.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { assignedOwnerId, status } = body;

  const upload = await prisma.upload.update({
    where: { id: params.id },
    data: {
      assignedOwnerId: assignedOwnerId || null,
      status: status || (assignedOwnerId ? 'assigned' : 'new'),
      assignedAt: assignedOwnerId ? new Date() : null,
    },
  });

  return NextResponse.json({ upload });
}
