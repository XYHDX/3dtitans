import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { PRIVATE_CACHE_CONTROL, PUBLIC_CACHE_CONTROL } from '@/app/products/_lib/http-cache';

// Never pre-rendered or cached by Next itself; CDN caching is set per response below.
export const dynamic = 'force-dynamic';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function mapStore(store: any, extraProductsCount?: number) {
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
    productsCount: extraProductsCount ?? store._count?.products ?? undefined,
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

/**
 * GET /api/stores/[slug]
 *
 * Published store → public, cached on the CDN. A draft store is visible only
 * to its owner or an admin (response never cached); everyone else gets 404.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const store = await prisma.store.findUnique({ where: { slug: slug } });
    if (!store) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': PRIVATE_CACHE_CONTROL } });
    }

    // Only drafts need the session — published stores stay cookie-independent and cacheable.
    if (!store.isPublished) {
      const session = await getServerSession(authOptions);
      if (!canManage(session?.user, store)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': PRIVATE_CACHE_CONTROL } });
      }
    }

    const extraCount = await prisma.product.count({
      where: {
        archivedAt: null,
        OR: [{ storeId: store.id }, { uploaderId: store.ownerId }],
      },
    });

    return NextResponse.json(
      { store: mapStore(store, extraCount) },
      { headers: { 'Cache-Control': store.isPublished ? PUBLIC_CACHE_CONTROL : PRIVATE_CACHE_CONTROL } }
    );
  } catch (error) {
    console.error('Store GET failed', error);
    return NextResponse.json(
      { error: 'Failed to load store' },
      { status: 500, headers: { 'Cache-Control': PRIVATE_CACHE_CONTROL } }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.store.findUnique({ where: { slug: slug } });
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

    const extraCount = await prisma.product.count({
      where: {
        OR: [{ storeId: store.id }, { uploaderId: store.ownerId }],
      },
    });

    // Server-rendered store pages cache for 60 s — show the change right away.
    revalidateTag('stores');
    return NextResponse.json({ store: mapStore(store, extraCount) });
  } catch (error) {
    console.error('Store PATCH failed', error);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}
