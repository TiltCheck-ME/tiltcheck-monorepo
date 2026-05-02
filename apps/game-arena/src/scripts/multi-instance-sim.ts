// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from '../redis-client.js';
import { io as Client } from 'socket.io-client';

// Simple multi-instance Socket.IO adapter simulation.
// Usage: set REDIS_URL and run with `tsx src/scripts/multi-instance-sim.ts` from apps/game-arena

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('SKIPPING: REDIS_URL not set. Set REDIS_URL to run this simulation.');
    process.exit(0);
  }

  console.log('[Sim] Starting multi-instance Socket.IO simulation');

  // Setup first server
  const server1 = createServer();
  const io1 = new SocketIOServer(server1, { cors: { origin: '*' } });

  // Setup second server
  const server2 = createServer();
  const io2 = new SocketIOServer(server2, { cors: { origin: '*' } });

  // Attach Redis adapter to both
  const raw = redisClient.raw();
  if (!raw) {
    console.error('[Sim] Redis client not available via redisClient.raw() - ensure REDIS_URL is set and redis-client creates a client');
    process.exit(1);
  }

  const pub1 = raw.duplicate();
  const sub1 = raw.duplicate();
  const pub2 = raw.duplicate();
  const sub2 = raw.duplicate();

  // Connect duplicates if needed (ioredis v5)
  await pub1.connect?.();
  await sub1.connect?.();
  await pub2.connect?.();
  await sub2.connect?.();

  io1.adapter(createAdapter(pub1 as any, sub1 as any));
  io2.adapter(createAdapter(pub2 as any, sub2 as any));

  // Start servers
  await new Promise((res) => server1.listen(4001, res));
  await new Promise((res) => server2.listen(4002, res));

  console.log('[Sim] Servers listening on 4001 and 4002');

  // Connect clients
  const clientA = new Client('http://localhost:4001', { transports: ['websocket'] });
  const clientB = new Client('http://localhost:4002', { transports: ['websocket'] });

  const receivedOnB: any[] = [];

  clientB.on('connect', () => {
    console.log('[Sim] clientB connected to server2');
  });

  clientB.on('test-event', (payload) => {
    console.log('[Sim] clientB received test-event:', payload);
    receivedOnB.push(payload);
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Emit from server1 - should be received by clientB through Redis adapter
  console.log('[Sim] server1 broadcasting test-event');
  io1.emit('test-event', { from: 'server1', ts: Date.now() });

  // Wait to allow propagation
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (receivedOnB.length > 0) {
    console.log('[Sim] SUCCESS: clientB received broadcast sent from server1 via Redis adapter');
  } else {
    console.error('[Sim] FAILURE: clientB did not receive broadcast from server1 - check Redis adapter connectivity');
  }

  // Cleanup
  clientA.close();
  clientB.close();
  io1.close();
  io2.close();
  await pub1.quit?.();
  await sub1.quit?.();
  await pub2.quit?.();
  await sub2.quit?.();

  server1.close();
  server2.close();
}

main().catch((err) => {
  console.error('[Sim] Fatal error:', err);
  process.exit(1);
});
