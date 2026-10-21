'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Instagram, Facebook, Phone, Mail, Clock, MapPin, type LucideIcon } from 'lucide-react';
import { Logo } from './logo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import type { SiteSettings } from '@/lib/types';
import { useTranslation } from './language-provider';
import { WhatsAppIcon } from './whatsapp-button';
import { isAllowedSocialUrl, localizedSetting, telHref, whatsappHref } from '@/lib/site-settings-shared';

/**
 * Real catalogue categories. `/products?category=` matches the value as a
 * case-insensitive substring of the product category, so short stems cover
 * spelling variants ("keychain"/"Keychains", "book ends", "Phone  Accessories").
 */
const CATEGORY_LINKS = [
  { value: 'keychain', key: 'footer.cat.keychains' },
  { value: 'vase', key: 'footer.cat.vases' },
  { value: 'planter', key: 'footer.cat.planters' },
  { value: 'holder', key: 'footer.cat.holders' },
  { value: 'decor', key: 'footer.cat.decor' },
  { value: 'phone', key: 'footer.cat.phone' },
  { value: 'book', key: 'footer.cat.bookends' },
];

const HELP_LINKS = [
  { href: '/upload', key: 'footer.customPrint' },
  { href: '/faq', key: 'footer.faq' },
  { href: '/shipping', key: 'footer.shipping' },
  { href: '/returns', key: 'footer.returns' },
  { href: '/support', key: 'footer.support' },
  { href: '/about', key: 'footer.about' },
];

const linkClass = 'text-sm text-secondary-foreground/80 hover:text-accent hover:underline';

/** Site footer. `settings` come from the server (cached), so contact details render without a client fetch. */
export function Footer({ settings }: { settings: SiteSettings }) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — real visitors never fill it
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t, locale } = useTranslation();

  const socialLinks = [
    { href: settings.facebookUrl, icon: Facebook, label: t('footer.social.facebook'), network: 'facebook' as const },
    { href: settings.instagramUrl, icon: Instagram, label: t('footer.social.instagram'), network: 'instagram' as const },
  ].filter(
    (link): link is { href: string; icon: LucideIcon; label: string; network: 'facebook' | 'instagram' } =>
      Boolean(link.href) && isAllowedSocialUrl(link.href as string, link.network)
  );

  const waHref = whatsappHref(settings.whatsappNumber, t('whatsapp.prefill'));
  const phoneHref = telHref(settings.contactPhone);
  const hours = localizedSetting(settings, 'contactHours', locale, true);
  const address = localizedSetting(settings, 'contactAddress', locale, true);
  const blurb = localizedSetting(settings, 'footerBlurb', locale) || t('footer.blurbDefault');
  const hasContact = Boolean(waHref || phoneHref || settings.contactEmail || hours || address);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      });
      if (!res.ok) throw new Error('Failed to subscribe');
      toast({ title: t('footer.subscribedTitle'), description: t('footer.subscribedDesc') });
      setEmail('');
    } catch {
      toast({
        variant: 'destructive',
        title: t('footer.subscribeFailedTitle'),
        description: t('footer.subscribeFailedDesc'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t-[4px] border-foreground bg-secondary text-secondary-foreground w-full">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="sm:col-span-2 lg:pe-8">
            <Link href="/" className="mb-4 inline-block" aria-label={t('brand.title')}>
              {/* Footer surface is always dark (Titan Black) regardless of theme,
                  so pin the white-ink lockup. Without forceTone the logo
                  auto-swaps with the global theme and disappears in light mode. */}
              <Logo forceTone="light" priority={false} />
            </Link>
            <p className="text-secondary-foreground/80 text-sm max-w-sm mb-5">{blurb}</p>

            <form className="relative mb-2 max-w-sm" onSubmit={handleSubscribe}>
              <label htmlFor="footer-newsletter-email" className="block text-xs font-bold mb-2">
                {t('footer.newsletterLabel')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="footer-newsletter-email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-background text-foreground border-background shadow-[3px_3px_0_0_hsl(var(--accent))]"
                />
                <Button type="submit" variant="default" disabled={loading}>
                  {loading ? t('footer.subscribing') : t('footer.subscribe')}
                </Button>
              </div>
              {/* Honeypot (M-10): off-screen and hidden from assistive tech. */}
              <div aria-hidden="true" className="absolute -start-[10000px] top-auto h-px w-px overflow-hidden">
                <label htmlFor="footer-newsletter-website">{t('form.honeypotLabel')}</label>
                <input
                  id="footer-newsletter-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </form>
            <p className="text-xs text-secondary-foreground/70 max-w-sm mb-6">
              {t('footer.newsletterConsent')}{' '}
              <Link href="/privacy" className="underline hover:text-accent">
                {t('footer.privacy')}
              </Link>
            </p>

            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.network}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-[2px] border-background p-2 hover:bg-accent hover:text-accent-foreground hover:border-accent transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_0_hsl(var(--accent))]"
                    aria-label={link.label}
                  >
                    <link.icon className="h-4 w-4" aria-hidden />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className="font-headline text-xs mb-4 text-accent">{t('footer.shop')}</h2>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className={linkClass}>{t('footer.allProducts')}</Link>
              </li>
              {CATEGORY_LINKS.map((c) => (
                <li key={c.value}>
                  <Link href={`/products?category=${encodeURIComponent(c.value)}`} className={linkClass}>
                    {t(c.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-help">
            <h2 id="footer-help" className="font-headline text-xs mb-4 text-accent">{t('footer.help')}</h2>
            <ul className="space-y-2">
              {HELP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>{t(l.key)}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-headline text-xs mb-4 text-accent">{t('footer.contact')}</h2>
            <ul className="space-y-3 text-sm">
              {waHref && (
                <li>
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2`}>
                    <WhatsAppIcon className="h-4 w-4 shrink-0" />
                    <span>{t('footer.whatsapp')}</span>
                  </a>
                </li>
              )}
              {phoneHref && (
                <li>
                  <a href={phoneHref} className={`${linkClass} inline-flex items-center gap-2`}>
                    <Phone className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="sr-only">{t('footer.phone')}: </span>
                    <span dir="ltr">{settings.contactPhone}</span>
                  </a>
                </li>
              )}
              {settings.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className={`${linkClass} inline-flex items-center gap-2 break-all`}>
                    <Mail className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="sr-only">{t('footer.email')}: </span>
                    <span dir="ltr">{settings.contactEmail}</span>
                  </a>
                </li>
              )}
              {hours && (
                <li className="flex items-start gap-2 text-secondary-foreground/80">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                  <span>
                    <span className="sr-only">{t('footer.hours')}: </span>
                    {hours}
                  </span>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2 text-secondary-foreground/80">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                  <span className="whitespace-pre-line">
                    <span className="sr-only">{t('footer.address')}: </span>
                    {address}
                  </span>
                </li>
              )}
              {!hasContact && (
                <li>
                  <Link href="/support" className={linkClass}>{t('footer.contactUs')}</Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      {/* Accent slogan strip */}
      <div className="bg-accent text-accent-foreground border-t-[3px] border-foreground">
        <div className="container mx-auto py-3 px-4 sm:px-6 lg:px-8 text-center font-headline text-xs tracking-wider">
          {t('brand.slogan')}
        </div>
      </div>
      <div className="bg-background text-foreground border-t-[3px] border-foreground">
        {/* Extra bottom space on phones so the floating WhatsApp button doesn't cover these links. */}
        <div className={`container mx-auto flex flex-col md:flex-row items-center justify-between py-4 text-xs px-4 sm:px-6 lg:px-8 ${waHref ? 'pb-24 md:pb-4' : ''}`}>
          <p>&copy; {new Date().getFullYear()} 3D Titans. {t('footer.copyright')}</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-foreground hover:bg-accent px-2 py-1">{t('footer.privacy')}</Link>
            <Link href="/terms" className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-foreground hover:bg-accent px-2 py-1">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
