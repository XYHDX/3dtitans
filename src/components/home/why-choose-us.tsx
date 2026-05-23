'use client';

import { Gem, ShieldCheck, Users, DownloadCloud } from 'lucide-react';
import { useTranslation } from '../language-provider';

export function WhyChooseUs() {
  const { t } = useTranslation();
  const features = [
    { icon: <Gem className="h-6 w-6" />, title: t('choose.feature1.title'), description: t('choose.feature1.desc') },
    { icon: <ShieldCheck className="h-6 w-6" />, title: t('choose.feature2.title'), description: t('choose.feature2.desc') },
    { icon: <Users className="h-6 w-6" />, title: t('choose.feature3.title'), description: t('choose.feature3.desc') },
    { icon: <DownloadCloud className="h-6 w-6" />, title: t('choose.feature4.title'), description: t('choose.feature4.desc') },
  ];
  return (
    <section className="py-16 md:py-24 bg-background w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="flex items-start gap-4">
          <span className="font-headline text-xs px-3 py-2 bg-foreground text-background shrink-0">04</span>
          <div>
            <h2 className="font-headline text-2xl md:text-4xl">{t('choose.title')}</h2>
            <p className="mt-3 text-base text-muted-foreground max-w-2xl">{t('choose.subtitle')}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="p-6 border-[3px] border-foreground bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_0_hsl(var(--accent))]">
            <div className="w-12 h-12 mb-4 grid place-items-center bg-accent text-accent-foreground border-[2px] border-foreground">
              {feature.icon}
            </div>
            <h3 className="font-headline text-sm mb-3">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
