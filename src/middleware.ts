import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPath = pathname.startsWith('/admin');
  const isStoreDashboard = pathname.startsWith('/store-dashboard');

  if (!isAdminPath && !isStoreDashboard) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to login.
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce roles.
  if (isAdminPath) {
    const adminOnlySegments = ['/admin/users', '/admin/settings', '/admin/contact', '/admin/newsletter'];
    const adminOnly = adminOnlySegments.some((seg) => pathname.startsWith(seg));

    if (adminOnly && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Allow both admin and store-owner for other admin routes.
    if (!adminOnly && token.role !== 'admin' && token.role !== 'store-owner') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
  if (isStoreDashboard && token.role !== 'store-owner' && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/store-dashboard'],
};
