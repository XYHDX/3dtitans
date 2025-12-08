import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function mapStore(store: any) {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    bio: store.bio || '',
    avatarUrl: store.avatarUrl || null,
    coverUrl: store.coverUrl || null,
    websiteUrl: store.websiteUrl || null,
    ownerId: store.ownerId,
    isPublished: !!store.isPublished,
    productsCount: store._count?.products ?? undefined,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

function canManage(user: any, store: any) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'store-owner' && store.ownerId === user.id) return true;
  return false;
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    const store = await prisma.store.findUnique({
      where: { slug: params.slug },
      include: { _count: { select: { products: true } } },
    });
    if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!store.isPublished && !canManage(user, store)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ store: mapStore(store) });
  } catch (error) {
    console.error('Store GET failed', error);
    return NextResponse.json({ error: 'Failed to load store' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.store.findUnique({ where: { slug: params.slug } });
  if (!existing || !canManage(user, existing)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data: any = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl;
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;
    if (body.websiteUrl !== undefined) data.websiteUrl = body.websiteUrl;
    if (body.slug !== undefined) {
      const nextSlug = slugify(body.slug);
      if (!nextSlug) return NextResponse.json({ error: 'Slug cannot be empty' }, { status: 400 });
      const slugOwner = await prisma.store.findUnique({ where: { slug: nextSlug } });
      if (slugOwner && slugOwner.id !== existing.id) {
        return NextResponse.json({ error: 'Slug is already taken' }, { status: 400 });
      }
      data.slug = nextSlug;
    }
    if (body.isPublished !== undefined && canManage(user, existing)) {
      data.isPublished = !!body.isPublished;
    }

    const store = await prisma.store.update({
      where: { id: existing.id },
      data,
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ store: mapStore(store) });
  } catch (error) {
    console.error('Store PATCH failed', error);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}
