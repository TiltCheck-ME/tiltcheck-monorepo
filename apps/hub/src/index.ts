/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
 * Command Hub: Cloudflare Worker Backend
 * The centralized 'brain' for receiving tilt signals and managing relaying session data.
 */

export interface Env {
  WORKER_ID?: string;
  DB: D1Database;          // Cloudflare D1 for identity
  SESSIONS: KVNamespace;   // Cloudflare KV for telemetry
  API_BASE_URL?: string;
  INTERNAL_API_SECRET?: string;
}

interface Round {
  bet: number;
  win: number;
  timestamp: number;
}

interface UserDataConsentState {
  messageContents: boolean;
  financialData: boolean;
  sessionTelemetry: boolean;
  notifyNftIdentityReady: boolean;
  complianceBypass: boolean;
}

interface CachedConsentState {
  expiresAt: number;
  value: UserDataConsentState;
}

const DEFAULT_DATA_CONSENT_STATE: UserDataConsentState = {
  messageContents: false,
  financialData: false,
  sessionTelemetry: false,
  notifyNftIdentityReady: false,
  complianceBypass: false,
};

const consentCache = new Map<string, CachedConsentState>();
const CONSENT_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveDiscordId(env: Env, userId: string): Promise<string> {
  const row = await env.DB.prepare(
    'SELECT discord_id FROM users WHERE discord_id = ? OR tiltcheck_id = ? LIMIT 1'
  ).bind(userId, userId).first<{ discord_id?: string }>();

  return row?.discord_id || userId;
}

async function getUserDataConsentState(env: Env, userId: string): Promise<UserDataConsentState> {
  const discordId = await resolveDiscordId(env, userId);
  const cached = consentCache.get(discordId);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const apiBaseUrl = env.API_BASE_URL || 'https://api.tiltcheck.me';
  const internalSecret = env.INTERNAL_API_SECRET;

  if (!internalSecret) {
    console.warn('[Hub] INTERNAL_API_SECRET missing. Optional telemetry writes will be skipped.');
    return DEFAULT_DATA_CONSENT_STATE;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/user/internal/consents/${encodeURIComponent(discordId)}`, {
      headers: {
        Authorization: `Bearer ${internalSecret}`,
      },
    });

    if (!response.ok) {
      console.warn(`[Hub] Failed to resolve consent for ${discordId}: ${response.status} ${response.statusText}`);
      return DEFAULT_DATA_CONSENT_STATE;
    }

    const payload = await response.json() as Partial<UserDataConsentState>;
    const value: UserDataConsentState = {
      messageContents: payload.messageContents === true,
      financialData: payload.financialData === true,
      sessionTelemetry: payload.sessionTelemetry === true,
      notifyNftIdentityReady: payload.notifyNftIdentityReady === true,
      complianceBypass: payload.complianceBypass === true,
    };

    consentCache.set(discordId, {
      value,
      expiresAt: now + CONSENT_CACHE_TTL_MS,
    });

    return value;
  } catch (error) {
    console.warn(`[Hub] Failed to fetch consent for ${discordId}:`, error);
    return DEFAULT_DATA_CONSENT_STATE;
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    // Allow requests from TiltCheck's Activity, extension, and web app
    const allowedOrigins = new Set([
      'https://tiltcheck.me',
      'https://hub.tiltcheck.me',
      'https://api.tiltcheck.me',
      // Discord proxies Activity iframes via their CDN
      'https://discord.com',
      // Local dev
      'http://localhost:5173',
      'http://localhost:8787',
    ]);
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = allowedOrigins.has(origin) ? origin : 'https://tiltcheck.me';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    // --- COMPLIANCE: GEO-FENCE ---
    const country = request.headers.get('cf-ipcountry');
    const restricted = new Set(['US', 'GB', 'FR', 'AU']);
    
    if (country && restricted.has(country.toUpperCase())) {
      console.warn(`[Hub] Blocked request from restricted region: ${country}`);
      return new Response('Access restricted in your region.', { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    console.log(`[TiltCheck Hub] ${method} ${url.pathname} received.`);

    // --- ROUTE: DEGEN HANDSHAKE (Consumer: Discord Activity Init) ---
    // POST /auth/Handshake { discordId, tiltcheckId }
    if (url.pathname === '/auth/Handshake' && method === 'POST') {
      try {
        const { discordId, tiltcheckId } = await request.json() as { discordId: string, tiltcheckId: string };
        if (!discordId || !tiltcheckId) throw new Error('Missing identity parameters');

        // Map Discord ID to TiltCheck ID in D1 (Persistent Identity)
        await env.DB.prepare(
          "INSERT OR REPLACE INTO users (discord_id, tiltcheck_id) VALUES (?, ?)"
        ).bind(discordId, tiltcheckId).run();

        console.log(`[Hub] Handshake successful: ${discordId} -> ${tiltcheckId}`);
        return new Response(JSON.stringify({ success: true, timestamp: Date.now() }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // --- ROUTE: TELEMETRY WIN-SECURE (Consumer: Chrome Extension) ---
    // POST /telemetry/win-secure { amount, userId }
    if (url.pathname === '/telemetry/win-secure' && method === 'POST') {
      try {
        const { amount, userId } = await request.json() as { amount: number, userId: string };
        if (!userId) throw new Error('Missing userId');

        const consentState = await getUserDataConsentState(env, userId);
        if (!consentState.financialData) {
          return new Response(JSON.stringify({ success: true, skipped: true, reason: 'financial_data_consent_required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Update D1 (Persistent stats in Cloudflare Hub for the user)
        await env.DB.prepare(
          "UPDATE users SET redeem_wins = redeem_wins + 1, total_redeemed = total_redeemed + ? WHERE discord_id = ? OR tiltcheck_id = ?"
        ).bind(Number(amount) || 0, userId, userId).run();

        console.log(`[Hub] Win secured for ${userId}: $${amount}`);
        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // --- ROUTE: TELEMETRY ROUND (Consumer: Chrome Extension) ---
    // POST /telemetry/round { userId, bet, win }
    if (url.pathname === '/telemetry/round' && method === 'POST') {
      try {
        const { userId, bet, win } = await request.json() as { userId: string, bet: number, win: number };
        if (!userId) throw new Error('Missing userId');

        const consentState = await getUserDataConsentState(env, userId);
        if (!consentState.sessionTelemetry || !consentState.financialData) {
          return new Response(JSON.stringify({ success: true, skipped: true, reason: 'telemetry_consent_required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Fetch current session from KV (High-speed Temporary State)
        const sessionData = await env.SESSIONS.get(userId);
        const rounds: Round[] = sessionData ? JSON.parse(sessionData) : [];
        
        rounds.push({ bet, win, timestamp: Date.now() });
        
        // Keep only last 100 rounds for performance
        if (rounds.length > 100) rounds.shift();

        // Write back to KV
        await env.SESSIONS.put(userId, JSON.stringify(rounds), { expirationTtl: 86400 }); // 24h life

        console.log(`[Hub] Telemetry added for ${userId}: Bet $${bet} Win $${win}`);
        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // --- ROUTE: GET SESSION (Consumer: Discord Activity Dashboard) ---
    // GET /session/:userId
    if (url.pathname.startsWith('/session/') && method === 'GET') {
      const userId = url.pathname.split('/')[2];
      const sessionData = await env.SESSIONS.get(userId);
      const rounds = sessionData ? JSON.parse(sessionData) : [];

      return new Response(JSON.stringify({ rounds }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // --- ROUTE: TILT ALERT (Consumer: Discord Activity "Send Tilt Alert" button) ---
    // POST /tilt-alert { user, userId, timestamp, signal, stats }
    if (url.pathname === '/tilt-alert' && method === 'POST') {
      try {
        const body = await request.json() as {
          user: string;
          userId: string;
          timestamp: number;
          signal: string;
          stats: { rounds: number; actualRtp: number; expectedRtp: number; drift: number };
        };

        // Log broadcast — in future, relay to Discord webhook via env binding
        console.log(`[Hub] Tilt Alert from ${body.user} (${body.userId}): ${body.signal}`);
        console.log(`[Hub] Stats: ${JSON.stringify(body.stats)}`);

        return new Response(JSON.stringify({ received: true, timestamp: Date.now() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // --- ROUTE: HEALTH CHECK ---
    if (url.pathname === '/health') {
      return new Response('Hub: Online. Math maths. Logic is distributed.', { 
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    return new Response('Hub: 404. Out of bounds. Relocate.', { 
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  },
};
