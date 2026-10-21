import Link from 'next/link';
import { Logo } from './logo';
import { translate, type Locale } from '@/lib/i18n';

/**
 * Full-screen maintenance page shown when site.maintenanceMode is enabled.
 * Admins bypass this (handled in layout.tsx).
 *
 * Server component — no client JS needed. Login link stays accessible so
 * admins can sign in and bypass the screen. `message` is the admin-written
 * text; when empty a translated default is shown.
 */
export function MaintenanceScreen({ message, locale }: { message: string; locale: Locale }) {
  const t = (key: string) => translate(locale, key);
  return (
    <div className="min-h-screen flex flex-col">
      {/* Brand strip */}
      <div className="bg-accent text-accent-foreground border-b-[3px] border-foreground py-3 text-center font-headline text-xs tracking-wider">
        {t('brand.slogan')}
      </div>

      <main className="flex-grow grid place-items-center px-4">
        <div className="max-w-xl w-full text-center">
          <div className="inline-block mb-8">
            <Logo width={280} height={62} />
          </div>

          {/* Pixel "wrench" indicator — animated cubes */}
          <div className="inline-flex gap-2 mb-8" aria-hidden>
            <div className="w-6 h-6 border-[3px] border-foreground bg-accent anim-pulse-cube" />
            <div
              className="w-6 h-6 border-[3px] border-foreground bg-destructive anim-pulse-cube"
              style={{ animationDelay: '300ms' }}
            />
            <div
              className="w-6 h-6 border-[3px] border-foreground bg-foreground anim-pulse-cube"
              style={{ animationDelay: '600ms' }}
            />
          </div>

          <h1 className="font-headline text-2xl md:text-4xl mb-4">{t('maintenance.title')}</h1>

          <p className="text-base md:text-lg text-muted-foreground mb-8 whitespace-pre-wrap">
            {message || t('maintenance.defaultMessage')}
          </p>

          <div className="inline-flex items-center gap-3 border-[3px] border-foreground bg-card px-5 py-3 shadow-[4px_4px_0_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_0_hsl(var(--accent))]">
            <span className="font-headline text-xs tracking-wider">{t('maintenance.admin')}</span>
            <Link
              href="/login"
              className="text-sm font-bold underline decoration-accent decoration-2 underline-offset-4 hover:bg-accent hover:text-accent-foreground px-1"
            >
              {t('maintenance.signIn')}
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t-[3px] border-foreground bg-secondary text-secondary-foreground py-4 text-center text-xs">
        &copy; {new Date().getFullYear()} 3D Titans &middot; {t('maintenance.footer')}
      </footer>
    </div>
  );
}
