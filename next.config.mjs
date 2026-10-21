/** @type {import('next').NextConfig} */

// Product, store and avatar images live in the Supabase project's public
// storage. Derive the host from env so a new/recreated Supabase project
// doesn't silently break every image.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://awvsifcergmdemplgddz.supabase.co').hostname;
  } catch {
    return 'awvsifcergmdemplgddz.supabase.co';
  }
})();

// CSP ships as Report-Only first: violations show in the browser console
// without blocking anything. Switch the header name to
// `Content-Security-Policy` once a week of real traffic shows no violations.
const csp = [
  "default-src 'self'",
  `img-src 'self' data: blob: https://${supabaseHost} https://www.googletagmanager.com https://www.facebook.com`,
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    // Upload paths include a timestamp, so an image URL never changes content.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: 'https', hostname: supabaseHost, port: '', pathname: '/storage/v1/object/public/**' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
