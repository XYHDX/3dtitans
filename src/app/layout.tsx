
import type { Metadata } from 'next';
import { Press_Start_2P, Space_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
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

// Inline no-flash theme script. Runs synchronously before the body renders, so
// dark-mode users never see a light-mode flash on first paint.
const themeScript = `
(function(){try{
  var s = localStorage.getItem('titans-theme');
  var t = (s === 'dark' || s === 'light')
    ? s
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (t === 'dark') document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* No-flash theme bootstrap — must run before any styles paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={cn(
        pressStart.variable,
        spaceMono.variable,
        'antialiased min-h-screen bg-background text-foreground flex flex-col'
      )}>
        <AppProviders>
          <Header />
          <main className="flex-grow w-full">
            {children}
          </main>
          <Footer />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
