// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
import http from 'http';
import { generateTrustScore } from './engine.js';

const PORT = process.env.PORT || 3030;
const MAX_REQUEST_BYTES = Math.max(parseInt(process.env.TRUST_SCORER_MAX_BODY_BYTES || '65536', 10) || 65536, 1024);
const CONFIGURED_ALLOWED_ORIGINS = new Set(
    (process.env.TRUST_SCORER_ALLOWED_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
);

function resolveAllowedOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return '';

    if (CONFIGURED_ALLOWED_ORIGINS.size > 0) {
        return CONFIGURED_ALLOWED_ORIGINS.has(origin) ? origin : null;
    }

    try {
        const originUrl = new URL(origin);
        const requestHost = req.headers.host || '';
        const isSameHost = originUrl.host === requestHost;
        const isLocalDev = ['localhost', '127.0.0.1'].includes(originUrl.hostname);
        return isSameHost || isLocalDev ? origin : null;
    } catch {
        return null;
    }
}

function applyCorsHeaders(req, res) {
    const allowedOrigin = resolveAllowedOrigin(req);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    return allowedOrigin;
}

const server = http.createServer((req, res) => {
    const allowedOrigin = applyCorsHeaders(req, res);

    if (req.headers.origin && !allowedOrigin) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Origin not allowed' }));
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === 'POST' && req.url === '/score') {
        const chunks = [];
        let bodyBytes = 0;
        let rejected = false;

        req.on('data', chunk => {
            if (rejected) return;
            bodyBytes += chunk.length;
            if (bodyBytes > MAX_REQUEST_BYTES) {
                rejected = true;
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Request body too large. Limit is ${MAX_REQUEST_BYTES} bytes.` }));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            if (rejected) return;
            try {
                const body = Buffer.concat(chunks).toString('utf8');
                const payload = JSON.parse(body);
                // Accepts payload: { user: {...}, guilds: ["1", "2"] }
                if (!payload.user) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: "Missing 'user' object in payload" }));
                }

                const result = generateTrustScore(payload.user, payload.guilds || [], {
                    bannedGuildIds: payload.bannedGuildIds || [],
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result, null, 2));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON format" }));
            }
        });
        req.on('error', (err) => {
            if (rejected) return;
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message || 'Request stream error' }));
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Not Found. Use POST /score" }));
    }
});

server.listen(PORT, () => {
    console.log(`[Trust Score API] Live on http://localhost:${PORT}/score`);
});
