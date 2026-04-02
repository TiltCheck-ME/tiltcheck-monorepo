/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2024-07-31 */

interface Env {
  BONUS_DB: D1Database;
  BONUS_CACHE: KVNamespace;
}

interface Bonus {
  id: string;
  casino_name: string;
  bonus_type: string;
  value: string;
  terms: string;
  expiry_date: string;
  discovered_at: string;
  is_verified: boolean;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== '/api/v1/bonuses') {
      return new Response('Not Found', { status: 404 });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const cacheKey = 'all_bonuses_v1'; // Simple cache key for all bonuses
    let cachedResponse = await env.BONUS_CACHE.get(cacheKey, { type: 'json' });

    if (cachedResponse) {
      console.log('Serving from cache');
      return new Response(JSON.stringify(cachedResponse), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
          'x-cache-status': 'HIT',
        },
      });
    }

    console.log('Fetching from database');
    try {
      const { results } = await env.BONUS_DB.prepare(
        'SELECT * FROM casino_bonus_logs ORDER BY discovered_at DESC LIMIT 50'
      ).all<Bonus>();

      // Apply brand voice and frontend-friendly formatting
      const formattedResults = results.map(bonus => ({
        ...bonus,
        message: `New from ${bonus.casino_name}: ${bonus.value} ${bonus.bonus_type}.`, // Main message
        ...getExpiryDetails(bonus.expiry_date), // Spread the expiry details object
      }));

      // Cache the response for future requests
      ctx.waitUntil(env.BONUS_CACHE.put(cacheKey, JSON.stringify(formattedResults), { expirationTtl: 300 })); // Cache for 5 minutes

      return new Response(JSON.stringify(formattedResults), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'x-cache-status': 'MISS',
        },
      });
    } catch (error) {
      console.error('Error fetching bonuses:', error);
      return new Response('Failed to fetch bonuses', { status: 500 });
    }
  },
};

/**
 * Generates a human-readable, brand-aligned expiry message.
 * Now returns an object with the message and expiration status.
 * @param expiryDate ISO string of the expiry date.
 * @returns An object with `expiry_message` and `is_expired` properties.
 */
function getExpiryDetails(expiryDate: string | null): { expiry_message: string; is_expired: boolean } {
  if (!expiryDate) {
    return { expiry_message: 'No expiry listed.', is_expired: false };
  }
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return { expiry_message: 'Expired. Too late.', is_expired: true };
  }
  if (diffHours < 48) {
    return { expiry_message: `Expires in ${Math.ceil(diffHours)} hours. Use it or lose it.`, is_expired: false };
  }
  return {
    expiry_message: `Expires in ${Math.ceil(diffHours / 24)} days.`,
    is_expired: false,
  };
}