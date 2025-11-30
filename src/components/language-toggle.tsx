'use client';

import { Button } from './ui/button';
import { useTranslation } from './language-provider';

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const nextLocale = locale === 'en' ? 'ar' : 'en';

  return (
    <Button variant="ghost" size="sm" onClick={() => setLocale(nextLocale)} className="px-3">
      {locale === 'en' ? 'العربية' : 'EN'}
    </Button>
  );
}
