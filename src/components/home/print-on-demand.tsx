'use client';

import Link from 'next/link';
import { Button } from '../ui/button';
import { useTranslation } from '../language-provider';

export function PrintOnDemand() {
  const { t } = useTranslation();
  return (
    <section className="py-16 md:py-24 bg-card w-full my-16 rounded-lg overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
        <div className="flex justify-center">
          <svg
            width="250"
            height="250"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            <defs>
              <linearGradient id="eye-gradient" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path
              d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
              stroke="url(#eye-gradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
              stroke="url(#eye-gradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center md:text-left">
          <h2 className="font-headline text-4xl md:text-5xl tracking-wide">
            {t('print.title')}
          </h2>
          <p className="mt-2 text-lg text-primary font-semibold">{t('print.subtitle')}</p>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto md:mx-0">
            {t('print.body')}
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link href="/upload">{t('print.cta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
