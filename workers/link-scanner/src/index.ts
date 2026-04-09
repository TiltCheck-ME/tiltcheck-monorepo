// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
// Edge proxy for SusLink/link scanning. No emojis. No fluff.

export interface Env {
  API_BASE_URL: string;
}

const ALLOWED_ORIGINS = new Set([
  'https://tiltcheck.me',
  'https://www.tiltcheck.me',
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Allow chrome extension origins
  if (origin.startsWith('chrome-extension://')) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : 'https://tiltcheck.me';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Only accept POST to /scan
    if (url.pathname !== '/scan' || request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    }

    // Validate request body
    let body: { url?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    }

    if (!body.url || typeof body.url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing required field: url' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    }

    // Forward to production API
    const apiBase = env.API_BASE_URL || 'https://api.tiltcheck.me';
    const upstream = `${apiBase}/suslink/scan`;

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TiltCheck-LinkScanner-Edge/1.0',
        },
        body: JSON.stringify({ url: body.url }),
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream API unreachable' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    }

    const responseData = await upstreamResponse.text();
    const responseHeaders: Record<string, string> = {
      'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json',
      ...corsHeaders(origin),
    };

    // Cache successful scan results briefly at the edge (60 seconds)
    if (upstreamResponse.status === 200) {
      responseHeaders['Cache-Control'] = 'public, max-age=60, s-maxage=60';
    } else {
      responseHeaders['Cache-Control'] = 'no-store';
    }

    return new Response(responseData, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler<Env>;
