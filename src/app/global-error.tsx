'use client';

import { useEffect } from 'react';
import { translate } from '@/lib/i18n';

/**
 * Last-resort error page, used when the root layout itself fails (M-22).
 * It replaces the whole document, so it ships its own <html>/<body>, inline
 * brand styles (no Tailwind, no fonts, no providers) and both languages.
 */

const BLACK = '#0F0F11';
const WHITE = '#F8F9FA';
const YELLOW = '#FFC107';
const RED = '#C44536';

const ar = (key: string) => translate('ar', key);
const en = (key: string) => translate('en', key);

const button: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 20px',
  border: `3px solid ${WHITE}`,
  boxShadow: `4px 4px 0 0 ${YELLOW}`,
  fontWeight: 700,
  fontSize: 15,
  textDecoration: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>3D Titans</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: BLACK,
          color: WHITE,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif",
          backgroundImage:
            'linear-gradient(rgba(248,249,250,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(248,249,250,0.05) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        <main style={{ maxWidth: 560, padding: '48px 20px', textAlign: 'center' }}>
          <div aria-hidden style={{ display: 'inline-flex', gap: 8, marginBottom: 28 }}>
            {[RED, YELLOW, RED].map((c, i) => (
              <span key={i} style={{ width: 22, height: 22, background: c, border: `3px solid ${WHITE}` }} />
            ))}
          </div>
          <p style={{ margin: '0 0 8px', fontWeight: 800, letterSpacing: 2, color: YELLOW }} lang="en" dir="ltr">
            3D TITANS
          </p>

          <h1 style={{ fontSize: 26, margin: '12px 0' }}>{ar('error.title')}</h1>
          <p style={{ margin: '0 0 24px', lineHeight: 1.7, opacity: 0.85 }}>{ar('error.desc')}</p>

          <div lang="en" dir="ltr" style={{ borderTop: `2px solid rgba(248,249,250,0.25)`, paddingTop: 20, marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>{en('error.title')}</h2>
            <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.85 }}>{en('error.desc')}</p>
          </div>

          {error.digest && (
            <p style={{ fontSize: 12, opacity: 0.6, margin: '0 0 24px' }} dir="ltr">
              {en('error.reference')} <code>{error.digest}</code>
            </p>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => reset()} style={{ ...button, background: YELLOW, color: BLACK }}>
              {ar('error.retry')} · <span lang="en">{en('error.retry')}</span>
            </button>
            {/* Plain links (full page load): the app router may be the thing that broke. */}
            <a href="/" style={{ ...button, background: BLACK, color: WHITE }}>
              {ar('error.home')} · <span lang="en">{en('error.home')}</span>
            </a>
            <a href="/support" style={{ ...button, background: BLACK, color: WHITE }}>
              {ar('error.support')} · <span lang="en">{en('error.support')}</span>
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
