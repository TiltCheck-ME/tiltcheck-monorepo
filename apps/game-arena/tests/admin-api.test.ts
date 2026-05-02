// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Ensure required env before importing server so config picks it up
process.env.GAME_ARENA_ADMIN_TOKEN = 'test-token';
process.env.JWT_SECRET = 'test-jwt-secret';

import { app, gameManager, eventRouter } from '../src/server.js';

describe('Admin API (control-room) - game-arena', () => {
  beforeEach(async () => {
    // Clear event history
    eventRouter.clearHistory();
  });

  afterEach(async () => {
    // Best-effort cleanup of games
    try {
      const games = gameManager.getActiveGames();
      for (const g of games) {
        await gameManager.forceEndGame(g.id);
      }
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  it('allows force-ending an active game when admin token is provided', async () => {
    const created = await gameManager.createGame('admin-user', 'Admin', 'dad', { maxPlayers: 4 });
    // Add a second player so DA&D can be started (module requires >=2 players)
    await gameManager.joinGame(created.id, 'user-2', 'Bob');
    await gameManager.startGame(created.id);

    const res = await request(app)
      .post(`/admin/game/${created.id}/force-end`)
      .set('x-admin-token', 'test-token')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const after = gameManager.getGame(created.id);
    expect(after).toBeDefined();
    expect(after?.status).toBe('completed');
  });

  it('exports audit/event history via admin endpoint', async () => {
    // Publish a couple of events
    await eventRouter.publish('game.started' as any, 'test', { gameId: 'g-1' } as any);
    await eventRouter.publish('game.round.ended' as any, 'test', { gameId: 'g-1', round: 1 } as any);

    const res = await request(app)
      .get('/admin/export-audit?limit=10')
      .set('x-admin-token', 'test-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.length).toBeGreaterThanOrEqual(2);
  });

  it('triggers payout reconciliation by publishing event', async () => {
    const res = await request(app)
      .post('/admin/payout-reconcile')
      .set('x-admin-token', 'test-token')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const events = eventRouter.getHistory({ eventType: 'payout.reconcile' as any, limit: 10 });
    expect(events.some(e => e.type === 'payout.reconcile')).toBe(true);
  });
});
