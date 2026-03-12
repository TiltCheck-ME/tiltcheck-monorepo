/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, sanitizeContainer } from '../src/server-trust-auth.js';

describe('control-room readiness', () => {
  it('serves health endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('protects system status behind auth', async () => {
    const response = await request(app).get('/api/system/status');
    expect(response.status).toBe(401);
  });

  it('sanitizes container names for command execution safety', () => {
    expect(sanitizeContainer('discord-bot_1')).toBe('discord-bot_1');
    expect(sanitizeContainer('bad;rm -rf /')).toBeNull();
    expect(sanitizeContainer('../escape')).toBeNull();
  });
});
