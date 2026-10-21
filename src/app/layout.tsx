import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Noto_Kufi_Arabic, Press_Start_2P, Space_Mono } from 'next/font/google';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { cn } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/options';
import { getServerSession } from 'next-auth';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MaintenanceScreen } from '@/components/maintenance-screen';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { AppProviders } from './providers';
import { Analytics } from '@/components/analytics';
import { unstable_cache } from 'next/cache';
import { translate } from '@/lib/i18n';
import { getServerLocale, localeDir } from '@/lib/i18n-server';
import { SITE_SETTINGS_TAG, getPublicSiteSettings } from '@/lib/site-settings';

// Force the root layout to re-render on every request. Without this, Next
// would cache the layout at build time and the maintenance flag toggle would
// only take effect after a redeploy. This makes the maintenance check actually
// work — admins can flip it on/off from /admin/settings and visitors see the
// change immediately on next page load. (The page language also comes from
// the request: the 3dt-locale cookie or Accept-Language.)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Brand v2 fonts — Press Start 2P for headlines, Space Mono for body.
const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
});

// Arabic pairing (neither brand font has Arabic glyphs): Noto Kufi Arabic —
// geometric and blocky like the pixel brand — for headlines, IBM Plex Sans
// Arabic for body text. Wired up for :lang(ar) in globals.css.
const notoKufi = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  variable: '--font-kufi',
  display: 'swap',
});

const plexArabic = IBM_Plex_Sans_Arabic({
  weight: ['400', '500', '700'],
  subsets: ['arabic'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org';

/** Default share image: public/og-image.png (1200×630, brand art + bilingual tagline). */
const OG_IMAGE = '/og-image.png';

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  const t = (key: string) => translate(locale, key);
  const title = t('meta.title');
  const description = t('meta.description');
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: '%s | 3D Titans',
    },
    description,
    applicationName: '3D Titans',
    openGraph: {
      type: 'website',
      locale: locale === 'ar' ? 'ar_SY' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_SY'],
      siteName: '3D Titans',
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: t('meta.ogImageAlt') }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE],
    },
    icons: {
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Matches the Arcade Yellow brand strip at the top of every page.
  themeColor: '#FFC107',
};

// Inline no-flash theme script. Runs synchronously before the body renders.
const themeScript = `
(function(){try{
  var s = localStorage.getItem('titans-theme');
  var t = (s === 'dark' || s === 'light')
    ? s
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (t === 'dark') document.documentElement.classList.add('dark');
}catch(e){}})();
`;

/**
 * Pull the maintenance flag + message from SiteSetting. Wrapped in try/catch
 * so a transient DB hiccup never takes the whole site down — we fail open.
 *
 * Cached for 30 s (tag 'site-settings') so ordinary page views don't query
 * the database at all; an admin toggle takes effect within 30 seconds, or
 * immediately when the settings API calls revalidateTag('site-settings').
 */
const getMaintenanceStatus = unstable_cache(
  async (): Promise<{ active: boolean; message: string }> => {
    try {
      const rows = await prisma.siteSetting.findMany({
        where: { key: { in: ['site.maintenanceMode', 'site.maintenanceMessage'] } },
      });
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      return {
        active: map['site.maintenanceMode'] === 'true',
        // Empty → MaintenanceScreen shows a translated default.
        message: map['site.maintenanceMessage'] || '',
      };
    } catch (err) {
      console.error('maintenance status fetch failed', err);
      return { active: false, message: '' };
    }
  },
  ['site-maintenance'],
  { revalidate: 30, tags: [SITE_SETTINGS_TAG] }
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Arabic by default, chosen on the server so the first paint has the right
  // language and direction (H-11).
  const locale = getServerLocale();
  const [maintenance, siteSettings] = await Promise.all([getMaintenanceStatus(), getPublicSiteSettings()]);
  let isAdmin = false;
  if (maintenance.active) {
    // Only check session when maintenance is on (cost-saving)
    const session = await getServerSession(authOptions);
    isAdmin = session?.user?.role === 'admin';
  }
  const showMaintenance = maintenance.active && !isAdmin;

  return (
    <html
      lang={locale}
      dir={localeDir(locale)}
      suppressHydrationWarning
      className={cn(pressStart.variable, spaceMono.variable, notoKufi.variable, plexArabic.variable)}
    >
      <body className="antialiased min-h-screen bg-background text-foreground flex flex-col">
        {/* No-flash theme bootstrap — runs before React hydration paints. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppProviders initialLocale={locale}>
          {showMaintenance ? (
            <MaintenanceScreen message={maintenance.message} locale={locale} />
          ) : (
            <>
              <Header />
              <main id="main-content" className="flex-grow w-full">
                {children}
              </main>
              <Footer settings={siteSettings} />
              <WhatsAppButton number={siteSettings.whatsappNumber} />
            </>
          )}
          <Toaster />
          <Analytics />
        </AppProviders>
        {/* Vercel Web Analytics + Speed Insights (H-07 / L-26); no-ops outside Vercel. */}
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
