© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-02

// k6 load test script for the trivia system
// Usage:
//  - In docker-compose use TARGET_URL=http://api:3000
//  - Locally: docker run --rm -v "${PWD}/apps/game-arena/tests:/scripts:ro" --network host grafana/k6 run /scripts/load_test.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  scenarios: {
    ramping: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '3m', target: 0 },
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.TARGET_URL || 'http://api:3000';
const joinEndpoint = `${BASE}/api/game/join`;
const snapshotEndpoint = `${BASE}/api/game/snapshot`;
const answerEndpoint = `${BASE}/api/game/answer`;

export default function () {
  const playerId = `load-${__VU}-${__ITER}-${Math.floor(Math.random()*1e6)}`;

  // Join the game
  const joinRes = http.post(joinEndpoint, JSON.stringify({ playerId }), { headers: { 'Content-Type': 'application/json' } });
  check(joinRes, { 'joined': (r) => r.status === 200 || r.status === 201 });

  // Poll for snapshots several times to validate snapshot persistence and timers
  for (let i = 0; i < 3; i++) {
    const snap = http.get(`${snapshotEndpoint}?playerId=${encodeURIComponent(playerId)}`);
    check(snap, { 'snapshot_ok': (r) => r.status === 200 });
    sleep(1);
  }

  // Occasionally submit an answer to exercise prize queue/scheduler
  if (Math.random() < 0.3) {
    const ans = http.post(answerEndpoint, JSON.stringify({ playerId, answer: 'A' }), { headers: { 'Content-Type': 'application/json' } });
    check(ans, { 'answered': (r) => r.status === 200 || r.status === 204 });
  }

  // Give the scheduler a short pause window to process
  sleep(1);
}
