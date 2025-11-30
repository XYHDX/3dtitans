'use client';

import { Gem, ShieldCheck, Users, DownloadCloud } from 'lucide-react';
import { useTranslation } from '../language-provider';

export function WhyChooseUs() {
  const { t } = useTranslation();
  const features = [
    {
      icon: <Gem className="h-8 w-8 text-primary" />,
      title: t('choose.feature1.title'),
      description: t('choose.feature1.desc'),
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: t('choose.feature2.title'),
      description: t('choose.feature2.desc'),
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: t('choose.feature3.title'),
      description: t('choose.feature3.desc'),
    },
    {
      icon: <DownloadCloud className="h-8 w-8 text-primary" />,
      title: t('choose.feature4.title'),
      description: t('choose.feature4.desc'),
    },
  ];
  return (
    <section className="py-16 md:py-24 bg-background w-full">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="font-headline text-4xl md:text-5xl tracking-wide">
          {t('choose.title')}
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          {t('choose.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mt-16">
        {features.map((feature, index) => (
          <div key={index} className="text-center">
            <div className="flex justify-center mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
