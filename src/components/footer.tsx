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
    <footer className="border-t border-border/40 bg-card w-full">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 pr-8">
            <Link href="/" className="mb-4 inline-block">
              <Logo />
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
              {settings?.footerBlurb || t('footer.blurbDefault')}
            </p>
            <form className="flex gap-2 mb-6" onSubmit={handleSubscribe}>
              <Input 
                type="email" 
                placeholder="Your email for our newsletter"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <Button type="submit" variant="secondary" disabled={loading}>
                {loading ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
            <div className="flex space-x-4">
              {socialLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={link.label}
                >
                  <link.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold mb-4">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-background">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-4 text-sm text-muted-foreground px-4 sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} 3D Titans. {t('footer.copyright')}</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-foreground">{t('footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-foreground">{t('footer.terms')}</Link>
            <Link href="/debug/products" className="hover:text-foreground">{t('footer.debug')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
