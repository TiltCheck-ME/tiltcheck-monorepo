/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, normalizeIpAddress, sanitizeContainer } from '../src/server-trust-auth.js';

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

  it('protects report requests behind auth', async () => {
    const response = await request(app).get('/api/report-requests');
    expect(response.status).toBe(401);
  });

  it('reports auth status payload for login screen routing', async () => {
    const response = await request(app).get('/api/auth/status');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('authenticated');
    expect(response.body).toHaveProperty('discordAuthEnabled');
  });

  it('sanitizes container names for command execution safety', () => {
    expect(sanitizeContainer('discord-bot_1')).toBe('discord-bot_1');
    expect(sanitizeContainer('bad;rm -rf /')).toBeNull();
    expect(sanitizeContainer('../escape')).toBeNull();
  });

  it('normalizes ipv4-mapped addresses for allowlist checks', () => {
    expect(normalizeIpAddress('::ffff:68.57.191.75')).toBe('68.57.191.75');
    expect(normalizeIpAddress('2001:4860:7:110e::80')).toBe('2001:4860:7:110e::80');
  });
});
