#!/usr/bin/env node
/**
 * Test Spin Injector
 * Sends synthetic spin events over WS to gameplay-analyzer ingest.
 */
import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:8083';
const CASINO = process.env.CASINO_ID || 'stake-us';

const sessionToken = JSON.stringify({
  sessionId: 'test-session',
  casinoId: CASINO,
  userId: process.env.TEST_USER_ID || '123456789012345678',
  expires: Date.now() + 30 * 60_000,
  signature: 'demo'
});

function randomSpin() {
  const bet = 1;
  const payout = Math.random() < 0.7 ? 0 : +(bet * (Math.random() * 10)).toFixed(2);
  return { ts: Date.now(), bet, payout, symbols: ['A','K','Q'], bonus: Math.random() < 0.05 };
}

const ws = new WebSocket(WS_URL);
ws.on('open', () => {
  console.log('[Injector] Connected. Sending spins...');
  let count = 0;
  const interval = setInterval(() => {
    const spin = randomSpin();
    ws.send(JSON.stringify({ session: sessionToken, casino: CASINO, spin }));
    if (++count >= 50) {
      clearInterval(interval);
      console.log('[Injector] Done. Sent 50 spins.');
    }
  }, 300);
});

ws.on('message', (m) => console.log('[Injector] Message:', m.toString()));
ws.on('error', (e) => console.error('[Injector] Error:', e));
ws.on('close', () => console.log('[Injector] Closed'));
