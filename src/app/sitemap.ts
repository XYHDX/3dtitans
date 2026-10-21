import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org';

// Rebuilt at most once an hour, so new products appear without a redeploy.
export const revalidate = 3600;

const STATIC_PAGES: Array<{ path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }> = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/products', changeFrequency: 'daily', priority: 0.9 },
  { path: '/stores', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/upload', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/shipping', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/returns', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.2 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${baseUrl}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // The database may be unreachable at build time; the static pages above are
  // still a valid sitemap and the dynamic part fills in on the next revalidation.
  try {
    const [products, stores] = await Promise.all([
      // Archived products are hidden from the shop (their pages 404), so they are not listed.
      prisma.product.findMany({
        where: { archivedAt: null },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      prisma.store.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true }, take: 1000 }),
    ]);
    for (const p of products) {
      entries.push({ url: `${baseUrl}/products/${p.id}`, lastModified: p.updatedAt, changeFrequency: 'weekly', priority: 0.8 });
    }
    for (const s of stores) {
      entries.push({ url: `${baseUrl}/stores/${s.slug}`, lastModified: s.updatedAt, changeFrequency: 'weekly', priority: 0.6 });
    }
  } catch (err) {
    console.error('sitemap: could not load products/stores', err);
  }

  return entries;
}
