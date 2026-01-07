
import type { Metadata } from 'next';
import { Manrope, Bebas_Neue } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AppProviders } from './providers';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.com'),
  title: {
    default: '3D Titans | Premium 3D Printing & Store',
    template: '%s | 3D Titans',
  },
  description: 'Premium 3D printing services and marketplace for creators.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: '3D Titans',
    title: '3D Titans | Premium 3D Printing & Store',
    description: 'Premium 3D printing services and marketplace for creators.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3D Titans',
    creator: '@3DTitans',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn(
        manrope.variable,
        bebasNeue.variable,
        'font-body antialiased min-h-screen bg-background flex flex-col'
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
