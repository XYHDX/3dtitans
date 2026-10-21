import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n-server';
import { ContentPage } from '@/content/content-page';
import { returnsContent, RETURNS_UPDATED } from '@/content/returns';

export function generateMetadata(): Metadata {
  const doc = returnsContent[getServerLocale()];
  return { title: doc.title, description: doc.description, alternates: { canonical: '/returns' } };
}

export default function ReturnsPage() {
  const locale = getServerLocale();
  return <ContentPage doc={returnsContent[locale]} locale={locale} updated={RETURNS_UPDATED} path="/returns" />;
}
