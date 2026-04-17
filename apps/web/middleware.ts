import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Order: MAINTENANCE_MODE check runs before the IS_LAUNCHED launch gate so
// that when both flags are on, visitors hit /coming-soon in a single redirect
// instead of bouncing through /pre-launch first. Maintenance mode is the
// higher-priority kill switch and wins.

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/apple-touch-icon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const isLaunched = process.env.IS_LAUNCHED === 'true';

  // --- Maintenance gate (highest priority) ---
  if (maintenanceMode) {
    if (pathname.startsWith('/api/')) return NextResponse.next();
    if (pathname === '/coming-soon') return NextResponse.next();
    if (isStaticAsset(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }

  // --- Launch gate ---
  // When IS_LAUNCHED is anything other than "true" (unset, empty, "false"),
  // the marketing surface is hidden behind /pre-launch. Functional app
  // surfaces (upgrade, success, callouts, subscription) remain reachable so
  // pre-launch purchases and shared callout links keep working.
  if (!isLaunched) {
    if (pathname.startsWith('/api/')) return NextResponse.next();
    if (pathname === '/pre-launch') return NextResponse.next();
    if (pathname === '/about-pre-launch') return NextResponse.next();
    if (pathname === '/coming-soon') return NextResponse.next();
    if (isStaticAsset(pathname)) return NextResponse.next();

    // About paths redirect to the pre-launch About clone, not the waitlist
    // landing, so visitors following About links land on founder copy.
    if (pathname === '/about' || pathname === '/about.html') {
      return NextResponse.redirect(new URL('/about-pre-launch', request.url));
    }

    // Functional surfaces that must keep working pre-launch.
    if (
      pathname === '/success' ||
      pathname === '/upgrade' ||
      pathname === '/subscription' ||
      pathname === '/subscription/cancel' ||
      pathname === '/subscription/return' ||
      pathname.startsWith('/callout/')
    ) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/pre-launch', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
