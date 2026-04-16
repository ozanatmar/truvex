import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  if (!maintenanceMode) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Always allow API routes — webhooks, blog creation, etc. must keep working
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // Allow the coming soon page itself to avoid redirect loop
  if (pathname === '/coming-soon') return NextResponse.next();

  // Allow static assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/apple-touch-icon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp')
  ) {
    return NextResponse.next();
  }

  // Redirect everything else to coming soon
  return NextResponse.redirect(new URL('/coming-soon', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
