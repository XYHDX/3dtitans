import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n-server';
import { ContentPage } from '@/content/content-page';
import { termsContent, TERMS_UPDATED } from '@/content/terms';

export function generateMetadata(): Metadata {
  const doc = termsContent[getServerLocale()];
  return { title: doc.title, description: doc.description, alternates: { canonical: '/terms' } };
}

export default function TermsPage() {
  const locale = getServerLocale();
  return <ContentPage doc={termsContent[locale]} locale={locale} updated={TERMS_UPDATED} path="/terms" />;
}
