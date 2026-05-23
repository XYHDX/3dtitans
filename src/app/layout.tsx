import type { Metadata } from 'next';
import { Press_Start_2P, Space_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/options';
import { getServerSession } from 'next-auth';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MaintenanceScreen } from '@/components/maintenance-screen';
import { AppProviders } from './providers';

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org'),
  title: {
    default: '3D Titans | Build Worlds, Create Legends.',
    template: '%s | 3D Titans',
  },
  description: 'A pixel-first 3D model marketplace. Discover, sell, print, and collect high-quality 3D models from creators around the world.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: '3D Titans',
    title: '3D Titans | Build Worlds, Create Legends.',
    description: 'A pixel-first 3D model marketplace. Discover, sell, print, and collect high-quality 3D models.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3D Titans — Build Worlds, Create Legends.',
    creator: '@3DTitans',
  }
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
 */
async function getMaintenanceStatus(): Promise<{ active: boolean; message: string }> {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: ['site.maintenanceMode', 'site.maintenanceMessage'] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      active: map['site.maintenanceMode'] === 'true',
      message: map['site.maintenanceMessage'] || 'Be back shortly.',
    };
  } catch (err) {
    console.error('maintenance status fetch failed', err);
    return { active: false, message: '' };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenance = await getMaintenanceStatus();
  let isAdmin = false;
  if (maintenance.active) {
    // Only check session when maintenance is on (cost-saving)
    const session = await getServerSession(authOptions);
    isAdmin = session?.user?.role === 'admin';
  }
  const showMaintenance = maintenance.active && !isAdmin;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        pressStart.variable,
        spaceMono.variable,
        'antialiased min-h-screen bg-background text-foreground flex flex-col'
      )}>
        {/* No-flash theme bootstrap — runs before React hydration paints. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppProviders>
          {showMaintenance ? (
            <MaintenanceScreen message={maintenance.message} />
          ) : (
            <>
              <Header />
              <main className="flex-grow w-full">
                {children}
              </main>
              <Footer />
            </>
          )}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
