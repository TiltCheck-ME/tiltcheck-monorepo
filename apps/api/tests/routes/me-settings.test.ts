/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockedDb = vi.hoisted(() => ({
  getUserSettingsRow: vi.fn(),
  upsertUserSettingsRow: vi.fn(),
}));

const mockAuthUser = vi.hoisted(() => ({
  id: 'user-1',
  discordId: 'discord-self',
  walletAddress: 'wallet-1',
}));

vi.mock('@tiltcheck/db', () => mockedDb);
vi.mock('../../src/middleware/auth.js', () => ({
  optionalAuthMiddleware: (req: any, _res: any, next: any) => {
    if (!req.user) {
      req.user = { ...mockAuthUser };
    }
    next();
  },
}));

import { meRouter } from '../../src/routes/me.js';
import { errorHandler } from '../../src/middleware/error.js';

describe('Me settings routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/me', meRouter);
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults when no settings exist', async () => {
    mockedDb.getUserSettingsRow.mockResolvedValueOnce(null);

    const res = await request(app).get('/me/settings');

    expect(res.status).toBe(200);
    expect(res.headers.etag).toBeTruthy();
    expect(res.body.userId).toBe('user-1');
    expect(res.body.settings.settingsVersion).toBe(1);
    expect(res.body.settings.limits.cooldownEnabled).toBe(true);
  });

  it('updates settings with optimistic concurrency via If-Match', async () => {
    mockedDb.getUserSettingsRow.mockResolvedValueOnce(null);
    mockedDb.upsertUserSettingsRow.mockImplementationOnce(async ({ userId, settingsVersion, settings }: any) => ({
      user_id: userId,
      settings_version: settingsVersion,
      settings,
      updated_at: new Date(),
    }));

    const initial = await request(app).get('/me/settings');
    const etag = initial.headers.etag;

    const update = await request(app)
      .put('/me/settings')
      .set('If-Match', etag)
      .send({
        notifications: { promos: true },
      });

    expect(update.status).toBe(200);
    expect(update.body.settings.notifications.promos).toBe(true);
    expect(mockedDb.upsertUserSettingsRow).toHaveBeenCalled();
  });

  it('rejects updates when If-Match does not match', async () => {
    mockedDb.getUserSettingsRow.mockResolvedValueOnce(null);
    const initial = await request(app).get('/me/settings');
    expect(initial.status).toBe(200);

    const update = await request(app)
      .put('/me/settings')
      .set('If-Match', 'W/"nope"')
      .send({
        notifications: { promos: true },
      });

    expect(update.status).toBe(412);
  });
});

