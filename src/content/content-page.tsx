import Link from 'next/link';
import type { ReactNode } from 'react';
import { translate, type Locale } from '@/lib/i18n';
import type { ContentDoc } from './types';

/** Render text with `[label](/path)` internal links (only site-relative paths are linked). */
export function RichText({ text }: { text: string }) {
  const linkRe = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(
      <Link key={match.index} href={match[2]}>
        {match[1]}
      </Link>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** Shared prose styling for policy/help pages (typography plugin, RTL-safe). */
export const PROSE_CLASS =
  'prose prose-neutral dark:prose-invert max-w-3xl mx-auto prose-headings:font-headline prose-h2:text-base md:prose-h2:text-lg prose-h2:mt-10 prose-a:font-bold prose-a:underline prose-a:decoration-accent prose-a:decoration-[3px] prose-a:underline-offset-4 prose-li:my-1';

export function formatContentDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SY' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

const RELATED: Array<{ href: string; key: string }> = [
  { href: '/shipping', key: 'footer.shipping' },
  { href: '/returns', key: 'footer.returns' },
  { href: '/faq', key: 'footer.faq' },
  { href: '/support', key: 'footer.support' },
  { href: '/privacy', key: 'footer.privacy' },
  { href: '/terms', key: 'footer.terms' },
];

/** Links to the other policy/help pages, shown at the bottom of each one. */
export function RelatedPages({ current, locale }: { current: string; locale: Locale }) {
  return (
    <nav aria-label={translate(locale, 'legal.relatedLabel')} className="max-w-3xl mx-auto mt-12 border-t-[3px] border-foreground pt-6">
      <h2 className="font-headline text-xs mb-4">{translate(locale, 'legal.related')}</h2>
      <ul className="flex flex-wrap gap-3">
        {RELATED.filter((r) => r.href !== current).map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="inline-block border-[2px] border-foreground px-3 py-1.5 text-sm font-bold hover:bg-accent hover:text-accent-foreground"
            >
              {translate(locale, r.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A policy page: title, "Last updated", intro and sections from src/content. */
export function ContentPage({
  doc,
  locale,
  updated,
  path,
}: {
  doc: ContentDoc;
  locale: Locale;
  /** ISO date (YYYY-MM-DD). */
  updated: string;
  /** This page's path, to leave it out of the related links. */
  path: string;
}) {
  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="max-w-3xl mx-auto mb-10 text-center">
        <h1 className="font-headline text-2xl md:text-4xl">{doc.title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {translate(locale, 'legal.lastUpdated')}{' '}
          <time dateTime={updated}>{formatContentDate(updated, locale)}</time>
        </p>
      </header>
      <article className={PROSE_CLASS}>
        {doc.intro && (
          <p className="lead">
            <RichText text={doc.intro} />
          </p>
        )}
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((p, i) => (
              <p key={`p${i}`}>
                <RichText text={p} />
              </p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((b, i) => (
                  <li key={`b${i}`}>
                    <RichText text={b} />
                  </li>
                ))}
              </ul>
            )}
            {section.after?.map((p, i) => (
              <p key={`a${i}`}>
                <RichText text={p} />
              </p>
            ))}
          </section>
        ))}
      </article>
      <RelatedPages current={path} locale={locale} />
    </div>
  );
}
