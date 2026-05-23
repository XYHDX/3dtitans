'use client';

import Link from 'next/link';
import { Button } from '../ui/button';
import { useTranslation } from '../language-provider';

export function PrintOnDemand() {
  const { t } = useTranslation();
  return (
    <section className="py-16 md:py-24 my-16 border-[4px] border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] dark:shadow-[10px_10px_0_0_hsl(var(--accent))] w-full overflow-hidden" style={{ background: 'hsl(var(--kraft-cardboard))' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
        <div className="flex justify-center">
          {/* Pixel-art printed-figurine illustration */}
          <svg width="260" height="260" viewBox="0 0 32 32" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
            {/* Box */}
            <rect x="2" y="14" width="28" height="16" fill="#E6D5B8" stroke="#0F0F11" strokeWidth="1"/>
            <rect x="2" y="14" width="28" height="2" fill="#C29B6C"/>
            {/* Figurine — pixel knight */}
            <rect x="13" y="4" width="6" height="3" fill="#8A8D91"/>
            <rect x="12" y="7" width="8" height="6" fill="#FFC107"/>
            <rect x="14" y="9" width="1" height="1" fill="#0F0F11"/>
            <rect x="17" y="9" width="1" height="1" fill="#0F0F11"/>
            <rect x="11" y="13" width="10" height="2" fill="#8A8D91"/>
            <rect x="10" y="15" width="12" height="6" fill="#C44536"/>
            <rect x="14" y="18" width="4" height="1" fill="#FFC107"/>
            {/* Label sticker */}
            <rect x="4" y="24" width="10" height="4" fill="#FFC107" stroke="#0F0F11" strokeWidth="1"/>
            <text x="9" y="27" textAnchor="middle" fontFamily="monospace" fontSize="2" fill="#0F0F11" fontWeight="bold">3D TITANS</text>
          </svg>
        </div>
        <div className="text-center md:text-left">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-headline text-xs px-3 py-2 bg-foreground text-background">03</span>
            <span className="sticker">PRINT READY</span>
          </div>
          <h2 className="font-headline text-2xl md:text-4xl mt-4">
            {t('print.title')}
          </h2>
          <p className="mt-3 text-base font-bold">{t('print.subtitle')}</p>
          <p className="mt-4 text-foreground/80 max-w-xl mx-auto md:mx-0">
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
