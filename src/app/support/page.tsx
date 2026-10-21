import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Clock, Mail, MapPin, MessageSquareText, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/whatsapp-button';
import { getServerLocale, getServerTranslator } from '@/lib/i18n-server';
import { getPublicSiteSettings } from '@/lib/site-settings';
import { localizedSetting, telHref, whatsappHref } from '@/lib/site-settings-shared';
import { RelatedPages } from '@/content/content-page';

export function generateMetadata(): Metadata {
  const t = getServerTranslator();
  return { title: t('support.title'), description: t('support.metaDescription'), alternates: { canonical: '/support' } };
}

function ChannelCard({
  icon,
  title,
  description,
  children,
  highlight = false,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <li
      className={
        highlight
          ? 'pixel-frame p-6 flex flex-col gap-3 sm:col-span-2'
          : 'border-[3px] border-foreground bg-card p-6 flex flex-col gap-3'
      }
    >
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 grid place-items-center border-[2px] border-foreground bg-accent text-accent-foreground shrink-0">
          {icon}
        </span>
        <h2 className="font-headline text-sm">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div>{children}</div>
    </li>
  );
}

/** Help & contact channels, all from the admin-editable site settings (B-08). */
export default async function SupportPage() {
  const locale = getServerLocale();
  const t = getServerTranslator(locale);
  const settings = await getPublicSiteSettings();

  const waHref = whatsappHref(settings.whatsappNumber, t('whatsapp.prefill'));
  const phoneHref = telHref(settings.contactPhone);
  const hours = localizedSetting(settings, 'contactHours', locale, true);
  const address = localizedSetting(settings, 'contactAddress', locale, true);

  const quickLinks = [
    { href: '/orders', label: t('support.link.orders') },
    { href: '/faq', label: t('footer.faq') },
    { href: '/shipping', label: t('footer.shipping') },
    { href: '/returns', label: t('footer.returns') },
    { href: '/upload', label: t('footer.customPrint') },
  ];

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="max-w-3xl mx-auto mb-12 text-center">
        <h1 className="font-headline text-2xl md:text-4xl">{t('support.title')}</h1>
        <p className="mt-4 text-muted-foreground text-lg">{t('support.subtitle')}</p>
      </header>

      <div className="max-w-4xl mx-auto grid gap-10">
        <ul className="grid gap-6 sm:grid-cols-2">
          {waHref && (
            <ChannelCard
              highlight
              icon={<WhatsAppIcon className="h-5 w-5" />}
              title={t('support.whatsapp')}
              description={t('support.whatsappDesc')}
            >
              <Button asChild size="lg">
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-5 w-5" />
                  {t('support.whatsappCta')}
                </a>
              </Button>
            </ChannelCard>
          )}
          {phoneHref && (
            <ChannelCard icon={<Phone className="h-5 w-5" aria-hidden />} title={t('support.phone')}>
              <a href={phoneHref} className="font-bold underline decoration-accent decoration-[3px] underline-offset-4" dir="ltr">
                {settings.contactPhone}
              </a>
            </ChannelCard>
          )}
          {settings.contactEmail && (
            <ChannelCard icon={<Mail className="h-5 w-5" aria-hidden />} title={t('support.email')}>
              <a
                href={`mailto:${settings.contactEmail}`}
                className="font-bold underline decoration-accent decoration-[3px] underline-offset-4 break-all"
                dir="ltr"
              >
                {settings.contactEmail}
              </a>
            </ChannelCard>
          )}
          <ChannelCard
            icon={<MessageSquareText className="h-5 w-5" aria-hidden />}
            title={t('support.form')}
            description={t('support.formDesc')}
          >
            <Link href="/about#contact" className="font-bold underline decoration-accent decoration-[3px] underline-offset-4">
              {t('support.formCta')}
            </Link>
          </ChannelCard>
        </ul>

        {(hours || address) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {hours && (
              <div className="flex items-start gap-3 border-[2px] border-foreground p-4">
                <Clock className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <h2 className="font-headline text-xs mb-2">{t('support.hours')}</h2>
                  <p className="text-sm">{hours}</p>
                </div>
              </div>
            )}
            {address && (
              <div className="flex items-start gap-3 border-[2px] border-foreground p-4">
                <MapPin className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <h2 className="font-headline text-xs mb-2">{t('support.address')}</h2>
                  <p className="text-sm whitespace-pre-line">{address}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-sm border-s-[4px] border-accent bg-muted p-4">{t('support.referenceTip')}</p>

        <nav aria-labelledby="support-quick-links">
          <h2 id="support-quick-links" className="font-headline text-sm mb-4">{t('support.quickLinks')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex items-center justify-between gap-3 border-[2px] border-foreground px-4 py-3 font-bold hover:bg-accent hover:text-accent-foreground"
                >
                  {l.label}
                  <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <RelatedPages current="/support" locale={locale} />
    </div>
  );
}
