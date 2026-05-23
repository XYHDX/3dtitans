'use client';
import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Instagram, Facebook, type LucideIcon } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';
import { useSiteSettings } from '@/hooks/use-data';
import { useNewsletterSubscriptions } from '@/hooks/use-data';
import { useTranslation } from './language-provider';

const footerLinks = {
  Marketplace: [
    { title: 'All Models', href: '/products' },
    { title: 'Characters', href: '/products?category=characters' },
    { title: 'Environments', href: '/products?category=environments' },
    { title: 'Vehicles', href: '/products?category=vehicles' },
  ],
  Resources: [
    { title: 'Upload for Print', href: '/upload' },
    { title: 'Support', href: '/support' },
    { title: 'FAQ', href: '/faq' },
  ],
  Company: [
    { title: 'About Us', href: '/about' },
    { title: 'Careers', href: '/careers' },
    { title: 'Press', href: '/press' },
  ],
};

export function Footer() {
  const { data: settings } = useSiteSettings();
  const { subscribe } = useNewsletterSubscriptions({ skipFetch: true });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const socialLinks = [
    { href: settings?.facebookUrl, icon: Facebook, label: 'Facebook' },
    { href: settings?.instagramUrl, icon: Instagram, label: 'Instagram' },
  ].filter((link): link is { href: string; icon: LucideIcon; label: string } => Boolean(link.href));

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    (async () => {
      try {
        const res = await subscribe(email);
        if (!res) {
          throw new Error('Failed to subscribe');
        }
        toast({
          title: 'Subscribed!',
          description: 'Thanks for joining our newsletter.',
        });
        setEmail('');
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Subscription Failed',
          description: 'Could not subscribe. Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <footer className="border-t-[4px] border-foreground bg-secondary text-secondary-foreground w-full">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 pr-8">
            <Link href="/" className="mb-4 inline-block">
              {/* Footer surface is always dark (Titan Black) regardless of theme,
                  so pin the white-ink lockup. Without forceTone the logo
                  auto-swaps with the global theme and disappears in light mode. */}
              <Logo forceTone="light" />
            </Link>
            <p className="text-secondary-foreground/70 text-sm max-w-sm mb-4">
              {settings?.footerBlurb || t('footer.blurbDefault')}
            </p>
            <form className="flex gap-2 mb-6" onSubmit={handleSubscribe}>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
                className="bg-background text-foreground border-background shadow-[3px_3px_0_0_hsl(var(--accent))]"
              />
              <Button type="submit" variant="default" disabled={loading}>
                {loading ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
            <div className="flex space-x-3">
              {socialLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="border-[2px] border-background p-2 hover:bg-accent hover:text-accent-foreground hover:border-accent transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_0_hsl(var(--accent))]"
                  aria-label={link.label}
                >
                  <link.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-headline text-xs mb-4 text-accent">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-sm text-secondary-foreground/70 hover:text-accent hover:underline">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {/* Accent slogan strip */}
      <div className="bg-accent text-accent-foreground border-t-[3px] border-foreground">
        <div className="container mx-auto py-3 px-4 sm:px-6 lg:px-8 text-center font-headline text-xs tracking-wider">
          Build Worlds, Create Legends.
        </div>
      </div>
      <div className="bg-background text-foreground border-t-[3px] border-foreground">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-4 text-xs px-4 sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} 3D Titans. {t('footer.copyright')}</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-accent-foreground hover:bg-accent px-2 py-1">{t('footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-accent-foreground hover:bg-accent px-2 py-1">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
