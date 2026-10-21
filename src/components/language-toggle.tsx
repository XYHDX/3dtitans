'use client';

import { Button } from './ui/button';
import { useTranslation } from './language-provider';
import { localeSettings } from '@/lib/i18n';

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const nextLocale = locale === 'en' ? 'ar' : 'en';
  const nextLabel = localeSettings[nextLocale].label;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(nextLocale)}
      className="px-3"
      // The label is written in the target language, so tag it for screen readers.
      lang={nextLocale}
      aria-label={nextLabel}
      title={nextLabel}
    >
      {nextLocale === 'ar' ? 'العربية' : 'EN'}
    </Button>
  );
}
