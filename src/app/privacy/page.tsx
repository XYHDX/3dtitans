import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n-server';
import { ContentPage } from '@/content/content-page';
import { privacyContent, PRIVACY_UPDATED } from '@/content/privacy';

export function generateMetadata(): Metadata {
  const doc = privacyContent[getServerLocale()];
  return { title: doc.title, description: doc.description, alternates: { canonical: '/privacy' } };
}

export default function PrivacyPage() {
  const locale = getServerLocale();
  return <ContentPage doc={privacyContent[locale]} locale={locale} updated={PRIVACY_UPDATED} path="/privacy" />;
}
