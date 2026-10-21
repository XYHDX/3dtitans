import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translate } from '@/lib/i18n';
import { getServerLocale } from '@/lib/i18n-server';
import { faqContent } from '@/content/faq';
import { RelatedPages, RichText } from '@/content/content-page';

export function generateMetadata(): Metadata {
  const doc = faqContent[getServerLocale()];
  return { title: doc.title, description: doc.description, alternates: { canonical: '/faq' } };
}

export default function FAQPage() {
  const locale = getServerLocale();
  const doc = faqContent[locale];
  const t = (key: string) => translate(locale, key);

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="max-w-3xl mx-auto mb-12 text-center">
        <h1 className="font-headline text-2xl md:text-4xl">{doc.title}</h1>
        <p className="mt-4 text-muted-foreground text-lg">{t('faq.subtitle')}</p>
      </header>

      <div className="max-w-3xl mx-auto space-y-12">
        {doc.groups.map((group, gi) => (
          <section key={group.heading} aria-labelledby={`faq-group-${gi}`}>
            <h2 id={`faq-group-${gi}`} className="font-headline text-sm md:text-base mb-5">
              {group.heading}
            </h2>
            <div className="space-y-4">
              {group.items.map((item) => (
                // Native <details>: works without JavaScript and with keyboards/screen readers.
                <details
                  key={item.q}
                  className="group border-[3px] border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_0_hsl(var(--accent))]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-bold hover:bg-accent hover:text-accent-foreground [&::-webkit-details-marker]:hidden">
                    <span>{item.q}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="border-t-[2px] border-foreground/20 p-4 text-sm leading-relaxed text-foreground/90 [&_a]:font-bold [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-[3px] [&_a]:underline-offset-4">
                    <p>
                      <RichText text={item.a} />
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="pixel-frame p-6 md:p-8 text-center">
          <h2 className="font-headline text-sm md:text-base">{t('faq.stillQuestions')}</h2>
          <p className="mt-3 text-muted-foreground">{t('faq.stillQuestionsDesc')}</p>
          <Button asChild className="mt-5">
            <Link href="/support">{t('faq.contactCta')}</Link>
          </Button>
        </div>
      </div>

      <RelatedPages current="/faq" locale={locale} />
    </div>
  );
}
