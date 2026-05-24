import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

type Ctx = { params: { id: string } };

function mapReview(r: any) {
  return {
    id: r.id,
    rating: r.rating,
    title: r.title || '',
    body: r.body || '',
    verifiedPurchase: !!r.verifiedPurchase,
    createdAt: r.createdAt,
    userId: r.userId,
    userName: r.user?.name || 'Anonymous',
    userImage: r.user?.image || null,
  };
}

/** GET /api/products/[id]/reviews — list reviews for a product, newest first */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const productId = params.id;
    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, image: true } } },
      take: 50,
    });
    return NextResponse.json({ reviews: reviews.map(mapReview) });
  } catch (err) {
    console.error('reviews GET', err);
    return NextResponse.json({ reviews: [], error: 'Failed to load reviews' }, { status: 500 });
  }
}

/** POST /api/products/[id]/reviews — create or update the current user's review */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const productId = (params.id || '').trim();
    if (productId.length < 8 || productId.length > 64) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const rawRating = Number(body?.rating);
    if (!Number.isFinite(rawRating) || rawRating < 1 || rawRating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }
    // DB CHECK constraint requires integer 1–5; floor any decimal input
    const rating = Math.floor(rawRating);
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : '';
    const reviewBody = typeof body?.body === 'string' ? body.body.trim().slice(0, 4000) : '';

    // Verify the product exists — pre-validates the FK so we return 404 not 500
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Detect verified purchase — has this user ever ordered this product?
    const verifiedPurchase = !!(await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId: session.user.id },
      },
      select: { id: true },
    }));

    // Upsert keeps "one review per user per product"
    const upserted = await prisma.review.upsert({
      where: { productId_userId: { productId, userId: session.user.id } },
      update: { rating, title, body: reviewBody, verifiedPurchase },
      create: {
        productId,
        userId: session.user.id,
        rating,
        title,
        body: reviewBody,
        verifiedPurchase,
      },
    });

    // The Supabase trigger recalcs Product.rating + reviewCount automatically.
    // If the user hasn't applied the migration yet, we patch them manually here as a fallback.
    try {
      const agg = await prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: true,
      });
      await prisma.product.update({
        where: { id: productId },
        data: {
          rating: agg._avg.rating || 0,
          reviewCount: agg._count,
        },
      });
    } catch (e) {
      // Trigger handles it — non-fatal
    }

    return NextResponse.json({ review: mapReview({ ...upserted, user: session.user }) });
  } catch (err: any) {
    // Race condition: product or user deleted between the existence-check and the upsert.
    if (err?.code === 'P2003') {
      return NextResponse.json({ error: 'Product or user no longer exists' }, { status: 404 });
    }
    console.error('reviews POST', err);
    // Don't leak raw err.message — could surface SQL state or stack info to the client.
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}

/** DELETE /api/products/[id]/reviews — remove the current user's review */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const productId = params.id;
    await prisma.review.delete({
      where: { productId_userId: { productId, userId: session.user.id } },
    }).catch(() => null);

    // Manual fallback recalc in case the trigger isn't installed
    try {
      const agg = await prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: true,
      });
      await prisma.product.update({
        where: { id: productId },
        data: {
          rating: agg._avg.rating || 0,
          reviewCount: agg._count,
        },
      });
    } catch (e) {}

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('reviews DELETE', err);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
