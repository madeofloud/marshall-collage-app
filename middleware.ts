import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PASSWORD = 'madeofloud1962';

export function middleware(request: NextRequest) {
  const auth = request.headers.get('authorization');

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const colon = decoded.indexOf(':');
      const pass = decoded.slice(colon + 1);
      if (pass === PASSWORD) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Marshall Collage App"',
    },
  });
}

export const config = {
  matcher: ['/((?!api/|_next/|favicon.ico).*)'],
};
