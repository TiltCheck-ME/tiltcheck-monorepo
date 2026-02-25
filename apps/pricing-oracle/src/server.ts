import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pricingOracle } from './index.js';

const PORT = Number(process.env.PRICING_ORACLE_PORT ?? 3010);

const PROBE_TOKENS = ['SOL', 'USDC'];

function isReady(): boolean {
  try {
    for (const token of PROBE_TOKENS) {
      pricingOracle.getUsdPrice(token);
    }
    return true;
  } catch {
    return false;
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function handler(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  if (method !== 'GET') {
    send(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  if (url === '/health') {
    send(res, 200, { status: 'ok', uptime: process.uptime() });
    return;
  }

  if (url === '/ready') {
    const ready = isReady();
    send(res, ready ? 200 : 503, {
      status: ready ? 'ready' : 'not_ready',
      providers: { jupiterPriceApi: ready },
    });
    return;
  }

  send(res, 404, { error: 'Not Found' });
}

export function startServer(): ReturnType<typeof createServer> {
  const server = createServer(handler);
  server.listen(PORT, () => {
    console.log(`[pricing-oracle] health server listening on port ${PORT}`);
  });
  return server;
}
