'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useTranslation } from '../language-provider';

export function Hero() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-background');
  const { t } = useTranslation();
  const heroTitle = t('hero.title');
  const heroTitleLines = heroTitle.split('\n');

  return (
    <section className="relative bg-foreground text-background overflow-hidden border-b-[4px] border-foreground">
      {/* Pixel-grid scanline backdrop */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(248,249,250,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(248,249,250,0.06) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }} />
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover opacity-25"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      {/* Decorative pixel cubes */}
      <div aria-hidden className="absolute top-12 left-8 w-10 h-10 bg-accent border-[3px] border-background shadow-[4px_4px_0_0_hsl(var(--background))] hidden md:block anim-pulse-cube" />
      <div aria-hidden className="absolute bottom-16 right-10 w-12 h-12 bg-destructive border-[3px] border-background shadow-[4px_4px_0_0_hsl(var(--background))] hidden md:block" />
      <div aria-hidden className="absolute top-1/2 right-1/4 w-6 h-6 bg-background border-[3px] border-accent hidden lg:block" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 min-h-[600px] flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center">
          <span className="sticker mb-6">NEW DROP · LIVE NOW</span>
          <h1 className="font-headline text-4xl md:text-6xl lg:text-7xl mt-4 text-background">
            {heroTitleLines.map((line, idx) => (
              <span key={idx} className={idx === 1 ? 'text-accent' : ''}>
                {line}
                {idx === 0 && <br />}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-background/80">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/products">
                {t('hero.ctaPrimary')}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-background text-foreground">
              <Link href="/about">{t('hero.ctaSecondary')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
