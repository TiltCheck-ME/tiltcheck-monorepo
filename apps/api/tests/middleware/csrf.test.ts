import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { csrfProtection } from '../../src/middleware/csrf.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(csrfProtection);
  app.post('/test', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('csrfProtection middleware', () => {
  it('blocks POST without csrf header, auth, or trusted origin', async () => {
    const app = createApp();
    const response = await request(app).post('/test').send({ hello: 'world' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CSRF_MISSING_HEADER');
  });

  it('allows POST with X-Requested-With header', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/test')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ hello: 'world' });
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('allows POST with bearer authorization header', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/test')
      .set('Authorization', 'Bearer token')
      .send({ hello: 'world' });
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('allows POST from trusted tiltcheck origin', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/test')
      .set('Origin', 'https://tiltcheck.me')
      .send({ hello: 'world' });
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('blocks POST from untrusted origin', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/test')
      .set('Origin', 'https://evil.example')
      .send({ hello: 'world' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CSRF_MISSING_HEADER');
  });
});
