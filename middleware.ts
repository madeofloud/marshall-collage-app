import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PASSWORD = 'madeofloud1962';

function isSafari(ua: string): boolean {
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua) && !/Android/.test(ua);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and API routes through
  if (pathname.startsWith('/api/') || pathname.startsWith('/login') || pathname.startsWith('/unsupported-browser')) {
    return NextResponse.next();
  }

  // Block Safari
  const ua = request.headers.get('user-agent') ?? '';
  if (isSafari(ua)) {
    return NextResponse.redirect(new URL('/unsupported-browser', request.url));
  }

  // Auth check
  const auth = request.cookies.get('auth');
  if (auth?.value === 'true') {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)'],
};
