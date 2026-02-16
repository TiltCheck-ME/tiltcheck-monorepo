// Type definitions for Solana RPC responses
interface SolanaRpcResponse {
  jsonrpc: string;
  id: number;
  result: {
    context: {
      slot: number;
      apiVersion: string;
    };
    value: {
      blockhash: string;
      feeCalculator: {
        lamportsPerSignature: number;
      };
      lastValidBlockHeight: number;
      lastValidSlot: number;
    };
  };
}

interface SolanaRpcError {
  jsonrpc: string;
  id: number;
  error: {
    code: number;
    message: string;
  };
}

export interface Env {
  SOLANA_RPC_URL: string;
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Nonce/Entropy Provider
    // Serves fresh Solana blockhashes from the edge
    if (path === '/api/nonce') {
      try {
        const response = await fetch(env.SOLANA_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getLatestBlockhash',
            params: [{ commitment: 'finalized' }]
          })
        });

        const data = await response.json() as SolanaRpcResponse;
        
        // Validate response structure and check for blockhash
        if (!data?.result?.value?.blockhash) {
          return new Response(JSON.stringify({ error: 'Failed to fetch valid blockhash' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const blockhash = data.result.value.blockhash;

        return new Response(JSON.stringify({ blockhash, timestamp: Date.now() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to fetch entropy' }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // 2. Geo-Compliance (Simple Check)
    if (path === '/api/geo') {
      const country = request.cf?.country || 'XX';
      const restricted = ['US', 'KP', 'IR', 'SY'].includes(country as string); // Example list
      
      return new Response(JSON.stringify({ country, restricted }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};