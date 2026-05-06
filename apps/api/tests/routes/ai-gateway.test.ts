/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const flexAuthMock = vi.hoisted(() =>
  vi.fn(() => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.headers.authorization === 'Bearer ok-token') {
        (req as express.Request & { auth?: { userId: string } }).auth = { userId: 'user-1' };
        next();
        return;
      }
      res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' });
    };
  })
);

const aiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@tiltcheck/auth/middleware/express.js', () => ({
  flexAuth: flexAuthMock,
}));

vi.mock('@tiltcheck/ai-client', () => ({
  aiClient: {
    request: aiRequestMock,
  },
}));

import { aiGatewayRouter } from '../../src/routes/ai-gateway.js';

const app = express();
app.use(express.json());
app.use('/ai', aiGatewayRouter);

describe('AI Gateway Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-ai-gateway';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POST /ai/api/ai returns 401 without bearer token', async () => {
    const response = await request(app)
      .post('/ai/api/ai')
      .send({ application: 'tilt-detection', context: {} });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('POST /ai/api/ai returns 400 for unknown application', async () => {
    const response = await request(app)
      .post('/ai/api/ai')
      .set('Authorization', 'Bearer ok-token')
      .send({ application: 'not-real', context: {} });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_BODY');
  });

  it('POST /ai/api/ai returns 400 when context exceeds size limit', async () => {
    const huge: Record<string, unknown> = {};
    for (let i = 0; i < 50; i += 1) {
      huge[`k${i}`] = i;
    }
    const response = await request(app)
      .post('/ai/api/ai')
      .set('Authorization', 'Bearer ok-token')
      .send({ application: 'tilt-detection', context: huge });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('CONTEXT_LIMIT');
  });

  it('POST /ai/api/ai proxies tilt-detection for authenticated user', async () => {
    aiRequestMock.mockResolvedValueOnce({
      success: true,
      data: {
        tiltScore: 55,
        riskLevel: 'moderate',
        indicators: ['velocity'],
        patterns: {},
        interventionSuggestions: ['Touch grass'],
        cooldownRecommended: false,
        cooldownDuration: 0,
      },
    });

    const response = await request(app)
      .post('/ai/api/ai')
      .set('Authorization', 'Bearer ok-token')
      .send({
        application: 'tilt-detection',
        context: { sessionDuration: 12, losses: 40 },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tiltScore).toBe(55);
    expect(aiRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        application: 'tilt-detection',
        context: { sessionDuration: 12, losses: 40 },
      })
    );
  });

  it('POST /ai/api/ai returns 502 when upstream AI returns success false', async () => {
    aiRequestMock.mockResolvedValueOnce({
      success: false,
      error: 'All providers unavailable',
    });

    const response = await request(app)
      .post('/ai/api/ai')
      .set('Authorization', 'Bearer ok-token')
      .send({ application: 'tilt-detection', context: {} });

    expect(response.status).toBe(502);
    expect(response.body.success).toBe(false);
  });
});
