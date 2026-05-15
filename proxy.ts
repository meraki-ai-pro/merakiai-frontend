import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'meraki_token';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google',
];

/**
 * Next.js Middleware (was proxy.ts — renamed export to 'middleware' so Next.js
 * actually activates it; the file is still named proxy.ts for project convention).
 *
 * Rules:
 *  - Public paths + static assets → always allow through
 *  - /dashboard/* → requires meraki_token cookie
 *  - /admin/*     → requires meraki_token cookie (role check done client-side
 *                   by AdminAuthGuard + server-side by backend admin_guard)
 *  - /auth/*      → redirect to /dashboard if already authenticated
 *  - /            → redirect to /dashboard if already authenticated
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/);

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // ── Protected: /dashboard/* ───────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Protected: /admin/* ───────────────────────────────────────────────────
  // Token presence is checked here. Role verification (admin_guard) is done:
  //   1. Client-side: AdminAuthGuard calls /users/me and checks role
  //   2. Server-side: every /admin API endpoint uses admin_guard
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Redirect authenticated users away from / and /auth/* ─────────────────
  if ((pathname === '/' || pathname.startsWith('/auth/')) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/auth/:path*',
    '/',
  ],
};
