/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('user-dashboard readiness', () => {
  it('serves health endpoint', async () => {
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test_magic_secret_key';
    const { app } = await import('../src/index.js');
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'user-dashboard',
    });
  });

  it('exposes oauth status without leaking secrets', async () => {
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test_magic_secret_key';
    const { app } = await import('../src/index.js');
    const response = await request(app).get('/auth/status');
    expect(response.status).toBe(200);
    expect(response.body.oauth).toEqual(
      expect.objectContaining({
        configured: expect.any(Boolean),
        clientIdPresent: expect.any(Boolean),
        clientSecretPresent: expect.any(Boolean),
      }),
    );
    expect(String(response.text)).not.toContain('MAGIC_SECRET_KEY');
  });

  it('blocks protected user route without bearer token', async () => {
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test_magic_secret_key';
    const { app } = await import('../src/index.js');
    const response = await request(app).get('/api/user/123456');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Access token required' });
  });
});
