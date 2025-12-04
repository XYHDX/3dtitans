import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const publishedParam = searchParams.get('published');
    const ownerId = searchParams.get('ownerId');

    const where: any = {};
    if (ownerId) {
      where.ownerId = ownerId;
    } else {
      // Filter out legacy bad rows with null/empty ownerId or slug using string comparisons.
      where.ownerId = { gt: '' };
      where.slug = { gt: '' };
    }
    if (publishedParam !== 'false') where.isPublished = true;

    const stores = await prisma.store.findMany({
      where,
      orderBy: [{ isPublished: 'desc' }, { createdAt: 'desc' }],
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ stores: stores.map(mapStore) });
  } catch (error) {
    console.error('Stores GET failed', error);
    const message = (error as any)?.message || 'Failed to load stores';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'store-owner')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawName = (body.name || '').trim();
    const rawSlug = (body.slug || rawName).trim();
    const bio = body.bio ?? '';
    const avatarUrl = body.avatarUrl ?? null;
    const coverUrl = body.coverUrl ?? null;
    const websiteUrl = body.websiteUrl ?? null;
    const requestPublish = body.isPublished;

    if (!rawName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!rawSlug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const slug = slugify(rawSlug) || slugify(rawName);
    const ownerId = user.role === 'admin' && body.ownerId ? body.ownerId : user.id;

    const existingBySlug = await prisma.store.findUnique({ where: { slug } });
    if (existingBySlug && existingBySlug.ownerId !== ownerId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 400 });
    }
    const existingByOwner = await prisma.store.findFirst({ where: { ownerId } });
    const targetStore = existingByOwner || (existingBySlug?.ownerId === ownerId ? existingBySlug : null);

    const data: any = {
      name: rawName,
      slug,
      bio,
      avatarUrl,
      coverUrl,
      websiteUrl,
      ownerId,
    };

    if (user.role === 'admin' && requestPublish !== undefined) {
      data.isPublished = !!requestPublish;
    }

    const store = targetStore
      ? await prisma.store.update({
          where: { id: targetStore.id },
          data,
          include: { _count: { select: { products: true } } },
        })
      : await prisma.store.create({
          data,
          include: { _count: { select: { products: true } } },
        });

    return NextResponse.json({ store: mapStore(store) });
  } catch (error) {
    console.error('Stores POST failed', error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
        ? `Unique constraint failed on ${error?.meta?.target || 'field'}`
        : (error as any)?.message || 'Failed to save store';
    const status =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
