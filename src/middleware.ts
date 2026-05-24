import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Auth + role guard for protected routes.
 *
 * Path categories:
 *  - ADMIN_ONLY: requires role === 'admin'
 *  - ADMIN_OR_OWNER: requires role === 'admin' OR 'store-owner'
 *  - LOGGED_IN: any authenticated user is allowed
 *
 * Everything else passes through untouched.
 */

const ADMIN_ONLY_PREFIXES = [
  '/admin/users',
  '/admin/settings',
  '/admin/contact',
  '/admin/newsletter',
];

// Pages requiring login but no specific role — checkout, orders, wishlist,
// account management. Previously these did client-side redirects only, which
// briefly leaked their UI to unauthenticated visitors and was inconsistent
// with the admin paths.
const LOGGED_IN_PREFIXES = [
  '/checkout',
  '/orders',
  '/wishlist',
  '/account',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPath = pathname.startsWith('/admin');
  const isStoreDashboard = pathname.startsWith('/store-dashboard');
  const requiresLogin = LOGGED_IN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!isAdminPath && !isStoreDashboard && !requiresLogin) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not signed in → bounce to login with a `next` param so we return to the
  // intended page after auth.
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin paths — split into admin-only vs admin-or-owner.
  if (isAdminPath) {
    const adminOnly = ADMIN_ONLY_PREFIXES.some((seg) => pathname.startsWith(seg));
    if (adminOnly && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (!adminOnly && token.role !== 'admin' && token.role !== 'store-owner') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Store-dashboard — admin or store-owner only.
  if (isStoreDashboard && token.role !== 'store-owner' && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // For LOGGED_IN paths, the token check above is enough. Allow store-owners
  // through too — they can still have a wishlist or check on orders they placed
  // as customers.

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/store-dashboard',
    '/store-dashboard/:path*',
    '/checkout',
    '/checkout/:path*',
    '/orders',
    '/orders/:path*',
    '/wishlist',
    '/wishlist/:path*',
    '/account/:path*',
  ],
};
