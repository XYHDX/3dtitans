'use client';

import Link from 'next/link';
import { Banknote, MessageCircle, Truck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '../language-provider';

/**
 * Branded hero art (M-26): a pixel-art 3D printer printing the 3D Titans
 * cube. Pure SVG in the brand palette + the cube logo from /public — no stock
 * photo, nothing loaded from another site. `currentColor` follows the hero
 * ink, so it works on the dark (light theme) and light (dark theme) hero.
 */
function HeroArt() {
  return (
    <svg
      viewBox="0 0 64 64"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className="pixel-art w-full max-w-[240px] sm:max-w-[320px] md:max-w-[420px] mx-auto text-background"
    >
      {/* Frame */}
      <rect x="6" y="4" width="52" height="3" fill="currentColor" />
      <rect x="6" y="4" width="3" height="53" fill="currentColor" />
      <rect x="55" y="4" width="3" height="53" fill="currentColor" />
      {/* Base + control panel */}
      <rect x="3" y="56" width="58" height="5" fill="currentColor" />
      <rect x="44" y="57" width="12" height="3" style={{ fill: 'hsl(var(--accent))' }} />
      <rect x="46" y="58" width="2" height="1" style={{ fill: 'hsl(var(--pixel-red))' }} />
      <rect x="49" y="58" width="5" height="1" style={{ fill: 'hsl(var(--titan-black))' }} />
      {/* Spool feed */}
      <rect x="31" y="7" width="2" height="2" style={{ fill: 'hsl(var(--accent))' }} />
      {/* Gantry rail */}
      <rect x="9" y="14" width="46" height="2" style={{ fill: 'hsl(var(--interface-gray))' }} />
      {/* Print head (sweeps left/right; frozen with reduced motion) */}
      <g className="anim-print-head">
        <rect x="25" y="9" width="14" height="12" fill="currentColor" />
        <rect x="26" y="10" width="12" height="10" style={{ fill: 'hsl(var(--accent))' }} />
        <rect x="28" y="12" width="8" height="1" style={{ fill: 'hsl(var(--titan-black))' }} />
        <rect x="28" y="14" width="8" height="1" style={{ fill: 'hsl(var(--titan-black))' }} />
        <rect x="31" y="21" width="2" height="2" fill="currentColor" />
        <rect x="31" y="23" width="2" height="1" style={{ fill: 'hsl(var(--pixel-red))' }} />
      </g>
      {/* The print: the brand cube (white ink on the dark hero, black ink on the light one) */}
      <image href="/logo-3d-titans-cube-dark.svg" x="20" y="26" width="24" height="24" className="dark:hidden" />
      <image href="/logo-3d-titans-cube.svg" x="20" y="26" width="24" height="24" className="hidden dark:inline" />
      {/* Bed */}
      <rect x="11" y="50" width="42" height="1" fill="currentColor" />
      <rect x="11" y="51" width="42" height="2" style={{ fill: 'hsl(var(--interface-gray))' }} />
      {/* Sparkles */}
      <rect x="14" y="30" width="2" height="2" style={{ fill: 'hsl(var(--accent))' }} />
      <rect x="48" y="24" width="2" height="2" style={{ fill: 'hsl(var(--accent))' }} />
      <rect x="46" y="38" width="1" height="1" style={{ fill: 'hsl(var(--pixel-cyan))' }} />
    </svg>
  );
}

export function Hero() {
  const { t } = useTranslation();
  const heroTitleLines = t('hero.title').split('\n');
  const trust = [
    { icon: Truck, label: t('hero.trust.delivery') },
    { icon: Banknote, label: t('hero.trust.cod') },
    { icon: Wallet, label: t('hero.trust.shamcash') },
    { icon: MessageCircle, label: t('hero.trust.whatsapp') },
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="relative bg-foreground text-background overflow-hidden border-b-[4px] border-foreground"
    >
      {/* Pixel-grid scanline backdrop */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(hsl(var(--background) / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--background) / 0.06) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }} />
      {/* Decorative pixel cubes */}
      <div aria-hidden className="absolute top-10 start-6 w-10 h-10 bg-accent border-[3px] border-background shadow-[4px_4px_0_0_hsl(var(--background))] hidden md:block anim-pulse-cube" />
      <div aria-hidden className="absolute bottom-10 end-8 w-12 h-12 bg-destructive border-[3px] border-background shadow-[4px_4px_0_0_hsl(var(--background))] hidden md:block" />
      <div aria-hidden className="absolute bottom-8 start-1/3 w-6 h-6 bg-background border-[3px] border-accent hidden lg:block" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid gap-12 md:grid-cols-[1.15fr_1fr] items-center">
        <div className="text-center md:text-start">
          <span className="sticker">{t('hero.sticker')}</span>
          <h1 id="hero-title" className="font-headline text-3xl/[1.35] sm:text-4xl/[1.35] lg:text-6xl/[1.3] mt-6 text-background break-words">
            {heroTitleLines.map((line, idx) => (
              <span key={idx} className="block">
                <span
                  className={cn(
                    idx === 1 &&
                      // Yellow on the dark hero; on the light (dark-theme) hero a
                      // yellow highlight with dark ink keeps it readable.
                      // inline-block: the highlight box grows its own line instead
                      // of painting over the line above.
                      'inline-block text-accent dark:text-background dark:bg-accent dark:px-2 dark:py-1 dark:mt-1'
                  )}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl mx-auto md:mx-0 text-base md:text-lg text-background/80">
            {t('hero.subtitle')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
            <Button size="lg" asChild>
              <Link href="/products">{t('hero.ctaPrimary')}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-background text-foreground">
              <Link href="/upload">{t('hero.ctaSecondary')}</Link>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3 text-sm text-background/85">
            {trust.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-accent dark:text-background" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <HeroArt />
      </div>
    </section>
  );
}
