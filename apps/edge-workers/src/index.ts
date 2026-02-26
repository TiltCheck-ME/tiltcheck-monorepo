import { handleGeoCompliance } from './routes/geo';
import { handleNonceGeneration } from './routes/nonce';
import { handleImageOptimization } from './routes/image';
import { handleEventWebhooks } from './routes/webhooks';

export interface Env {
    // Bindings can be declared here
    WEBHOOK_SECRET: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // 1. Geo-Compliance Edge Worker Middleware (run on all requests first, or specific routes)
        // For demonstration, we apply it as a middleware check
        const geoResponse = handleGeoCompliance(request);
        if (geoResponse) {
            return geoResponse; // Blocks restricted jurisdictions early
        }

        // 2. Routing
        if (path.startsWith('/api/nonce')) {
            return handleNonceGeneration(request);
        }

        if (path.startsWith('/api/image')) {
            return handleImageOptimization(request);
        }

        if (path.startsWith('/api/webhooks')) {
            return handleEventWebhooks(request, env, ctx);
        }

        return new Response('TiltCheck Edge Worker Active.', { status: 200 });
    },
};
