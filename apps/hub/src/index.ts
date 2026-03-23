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
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

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

    // --- ROUTE: TELEMETRY ROUND (Consumer: Chrome Extension) ---
    // POST /telemetry/round { userId, bet, win }
    if (url.pathname === '/telemetry/round' && method === 'POST') {
      try {
        const { userId, bet, win } = await request.json() as { userId: string, bet: number, win: number };
        if (!userId) throw new Error('Missing userId');
        
        // Fetch current session from KV (High-speed Temporary State)
        const sessionData = await env.SESSIONS.get(userId);
        let rounds: Round[] = sessionData ? JSON.parse(sessionData) : [];
        
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
