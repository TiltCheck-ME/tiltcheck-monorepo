/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  app,
  auditPrivilegedAction,
  getPrivilegedActor,
  normalizeIpAddress,
  sanitizeContainer,
} from '../src/server-trust-auth.js';

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('derives privileged actor context for password-authenticated admins', () => {
    const actor = getPrivilegedActor({
      headers: {},
      socket: { remoteAddress: '::ffff:10.0.0.5' },
      ip: '::ffff:10.0.0.5',
      session: { authenticated: true },
      user: null,
    });

    expect(actor).toMatchObject({
      actorId: 'password:10.0.0.5',
      actorLabel: 'admin-password',
      authMode: 'admin-password',
      ipAddress: '10.0.0.5',
    });
  });

  it('writes audit logs with actor and action context', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    auditPrivilegedAction({
      headers: {},
      method: 'POST',
      path: '/api/container/restart/api',
      socket: { remoteAddress: '::ffff:10.0.0.5' },
      ip: '::ffff:10.0.0.5',
      session: { authenticated: true },
      user: null,
    }, 'container.restart', { outcome: 'success', target: 'api' });

    expect(infoSpy).toHaveBeenCalledWith('[control-room][audit]', expect.objectContaining({
      action: 'container.restart',
      actorId: 'password:10.0.0.5',
      actorLabel: 'admin-password',
      authMode: 'admin-password',
      ipAddress: '10.0.0.5',
      method: 'POST',
      path: '/api/container/restart/api',
      outcome: 'success',
      target: 'api',
    }));
  });

  it('audits successful password logins', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const password = process.env.ADMIN_PASSWORD;

    expect(password).toBeTruthy();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ password });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(infoSpy).toHaveBeenCalledWith('[control-room][audit]', expect.objectContaining({
      action: 'auth.login',
      actorLabel: 'admin-password',
      authMode: 'admin-password',
      outcome: 'success',
      method: 'POST',
      path: '/api/auth/login',
    }));
  });
});
