/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { NextRequest, NextResponse } from 'next/server';
import { buildLanOrigin, isLocalDevHost } from '@/lib/lan-origin';
import {
  AUTOVAULT_SHARE_PAGE_PATH,
  AUTOVAULT_SHARE_SCRIPT_PATH,
  AUTOVAULT_SHARE_PAGE_PRODUCTION,
  AUTOVAULT_SHARE_SCRIPT_PRODUCTION,
} from '@/lib/share-qr';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      isLocal: false,
      browserOrigin: 'https://tiltcheck.me',
      phoneOrigin: 'https://tiltcheck.me',
      pageUrl: AUTOVAULT_SHARE_PAGE_PRODUCTION,
      scriptUrl: AUTOVAULT_SHARE_SCRIPT_PRODUCTION,
    });
  }

  const url = new URL(request.url);
  const portParam = url.searchParams.get('port');
  const port = portParam ? Number(portParam) : Number(process.env.PORT) || 3000;
  const lanOrigin = buildLanOrigin(port);
  const browserOrigin = `http://localhost:${port}`;
  const phoneOrigin = lanOrigin ?? browserOrigin;
  const requestHost = request.headers.get('host')?.split(':')[0] ?? null;
  const requestPort = request.headers.get('host')?.split(':')[1] ?? String(port);
  const requestOrigin =
    requestHost && isLocalDevHost(requestHost, requestPort)
      ? `http://${request.headers.get('host')}`
      : browserOrigin;

  return NextResponse.json({
    isLocal: true,
    browserOrigin: requestOrigin,
    phoneOrigin,
    lanIp: lanOrigin ? new URL(lanOrigin).hostname : null,
    pageUrl: `${phoneOrigin}${AUTOVAULT_SHARE_PAGE_PATH}`,
    scriptUrl: `${phoneOrigin}${AUTOVAULT_SHARE_SCRIPT_PATH}`,
  });
}
