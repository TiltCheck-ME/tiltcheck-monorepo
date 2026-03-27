/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Command Hub: Cloudflare Worker Backend
 * The centralized 'brain' for receiving tilt signals and managing relaying session data.
 */

export interface Env {
  WORKER_ID?: string;
  DB: D1Database;          // Cloudflare D1 for identity
  SESSIONS: KVNamespace;   // Cloudflare KV for telemetry
}

interface Round {
  bet: number;
  win: number;
  timestamp: number;
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
