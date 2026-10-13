// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decidePublicRoute } from '@/lib/public-route-gate';

export function middleware(request: NextRequest) {
  const decision = decidePublicRoute(request.nextUrl.pathname);
  if (decision.action === 'redirect') {
    const url = request.nextUrl.clone();
    url.pathname = decision.destination;
    url.search = '';
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
