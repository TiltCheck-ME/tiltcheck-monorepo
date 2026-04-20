/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20 */
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
});

describe('user-dashboard readiness', () => {
  it('serves health endpoint', async () => {
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test_magic_secret_key';
    const { app } = await import('../src/index.js');
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('exposes public Discord config without leaking secrets', async () => {
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test_magic_secret_key';
    const { app } = await import('../src/index.js');
    const response = await request(app).get('/api/config/public');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        client_id: expect.any(String),
        clientId: expect.any(String),
      }),
    );
    expect(String(response.text)).not.toContain('MAGIC_SECRET_KEY');
    expect(String(response.text)).not.toContain('DISCORD_CLIENT_SECRET');
  });

  it('blocks protected user route without bearer token', async () => {
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test_magic_secret_key';
    const { app } = await import('../src/index.js');
    const response = await request(app).get('/api/user/123456');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Not authenticated' });
  });

  it('still serves health when MAGIC_SECRET_KEY is missing', async () => {
    const previousMagicSecret = process.env.MAGIC_SECRET_KEY;
    process.env.MAGIC_SECRET_KEY = '';
    const { app } = await import('../src/index.js');
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    if (previousMagicSecret) {
      process.env.MAGIC_SECRET_KEY = previousMagicSecret;
    } else {
      delete process.env.MAGIC_SECRET_KEY;
    }
  });
});
