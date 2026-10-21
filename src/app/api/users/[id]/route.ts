import { authOptions, forgetSessionAccess } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ROLES = ['user', 'store-owner', 'admin'] as const;
type Role = (typeof ROLES)[number];

/** Thrown inside a transaction to abort it with a specific response. */
class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'admin') {
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

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    // Serializable transaction lost a race with another admin action.
    if (error.code === 'P2034') return NextResponse.json({ error: 'Another change happened at the same time. Please try again.' }, { status: 409 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Prisma.UserUpdateInput = {};
  let newRole: Role | null = null;

  if (body?.role !== undefined) {
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }
    newRole = body.role;
  }

  if (typeof body?.emailVerified === 'boolean') {
    data.emailVerified = body.emailVerified ? new Date() : null;
  }

  if (typeof body?.isPrioritizedStore === 'boolean') {
    data.isPrioritizedStore = body.isPrioritizedStore;
  }

  if (!newRole && !Object.keys(data).length) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const actorId = session.user.id;
  try {
    const user = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true } });
        if (!target) throw new HttpError(404, 'User not found.');

        if (newRole && newRole !== target.role) {
          if (target.id === actorId) {
            throw new HttpError(400, "You can't change your own role. Ask another admin to do it.", 'self_role_change');
          }
          if (target.role === 'admin') {
            const admins = await tx.user.count({ where: { role: 'admin' } });
            if (admins <= 1) {
              throw new HttpError(409, 'This is the last admin account. Make another user an admin first.', 'last_admin');
            }
          }
          data.role = newRole;
          // Ends the user's current sessions so the new role applies right away.
          data.tokenVersion = { increment: 1 };
        }

        if (!Object.keys(data).length) {
          return tx.user.findUniqueOrThrow({ where: { id } });
        }
        return tx.user.update({ where: { id }, data });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    forgetSessionAccess(id);

    const prioritizedIds = await getPrioritizedIds();
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
    if (!(error instanceof HttpError)) console.error('User update failed', error);
    return errorResponse(error, 'Failed to update user');
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You can't delete your own account here. Ask another admin to do it.", code: 'self_delete' },
      { status: 400 }
    );
  }

  try {
    const userId = id;

    await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true } });
        if (!target) throw new HttpError(404, 'User not found or already deleted.');
        if (target.role === 'admin') {
          const admins = await tx.user.count({ where: { role: 'admin' } });
          if (admins <= 1) {
            throw new HttpError(409, 'This is the last admin account and cannot be deleted.', 'last_admin');
          }
        }

        // Gather related records to detach before deletion to avoid FK failures.
        const stores = await tx.store.findMany({ where: { ownerId: userId }, select: { id: true } });
        const storeIds = stores.map((s) => s.id);

        const uploaderProducts = await tx.product.findMany({ where: { uploaderId: userId }, select: { id: true } });
        const storeProducts = storeIds.length
          ? await tx.product.findMany({ where: { storeId: { in: storeIds } }, select: { id: true } })
          : [];

        const productIds = Array.from(new Set([...uploaderProducts, ...storeProducts].map((p) => p.id)));

        // Order lines keep their name / price / image; only the product link goes.
        if (productIds.length) {
          await tx.orderItem.updateMany({ where: { productId: { in: productIds } }, data: { productId: null } });
        }

        await tx.orderAssignment.deleteMany({ where: { ownerId: userId } });
        // Orders stay (accounting records) but no longer point at the person:
        // unlinked and without their email, so a future account with the same
        // address can never see them.
        await tx.order.updateMany({ where: { userId }, data: { userId: null, customerEmail: null } });
        if (target.email) {
          await tx.order.updateMany({
            where: { userId: null, customerEmail: { equals: target.email, mode: 'insensitive' } },
            data: { customerEmail: null },
          });
          await tx.passwordResetToken.deleteMany({ where: { email: target.email } });
        }

        await tx.upload.updateMany({ where: { assignedOwnerId: userId }, data: { assignedOwnerId: null, assignedOwnerEmail: null } });
        await tx.upload.deleteMany({ where: { userId } });

        if (productIds.length) {
          await tx.product.deleteMany({ where: { id: { in: productIds } } });
        }

        if (storeIds.length) {
          await tx.store.deleteMany({ where: { id: { in: storeIds } } });
        }

        // Deleting the row also ends every session of this user (lib/auth/options.ts).
        await tx.user.delete({ where: { id: userId } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 }
    );
    forgetSessionAccess(userId);

    return NextResponse.json({ ok: true, message: 'User and related data removed.' });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      console.error('User delete blocked by a foreign key', error);
      return NextResponse.json(
        {
          error:
            'Cannot delete this user while they still own products, stores, uploads, or orders. Remove or reassign those records first.',
        },
        { status: 409 }
      );
    }
    if (!(error instanceof HttpError)) console.error('User delete failed', error);
    return errorResponse(error, 'Failed to delete user');
  }
}
