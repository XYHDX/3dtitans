import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n-server';
import { ContentPage } from '@/content/content-page';
import { shippingContent, SHIPPING_UPDATED } from '@/content/shipping';

export function generateMetadata(): Metadata {
  const doc = shippingContent[getServerLocale()];
  return { title: doc.title, description: doc.description, alternates: { canonical: '/shipping' } };
}

export default function ShippingPage() {
  const locale = getServerLocale();
  return <ContentPage doc={shippingContent[locale]} locale={locale} updated={SHIPPING_UPDATED} path="/shipping" />;
}
