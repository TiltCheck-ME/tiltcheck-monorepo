import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock Supabase
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn(),
}));

const createClientMock = vi.hoisted(() => vi.fn(() => mockSupabase));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

async function createAppWithModRouter(configureSupabase: boolean) {
  vi.resetModules();

  if (configureSupabase) {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  } else {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_KEY;
  }

  const modRouter = (await import('../../src/routes/mod.js')).default;
  const app = express();
  app.use(express.json());
  app.use('/mod', modRouter);
  return app;
}

describe('Mod Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /mod/report', () => {
    it('should return 503 when Supabase is unconfigured', async () => {
      const app = await createAppWithModRouter(false);
      const response = await request(app).post('/mod/report').send({
        targetId: 'user-1',
        moderatorId: 'mod-1',
        actionType: 'BAN',
        reason: 'Violation of Terms',
      });

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Moderation service unavailable (unconfigured)');
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', async () => {
      const app = await createAppWithModRouter(true);
      const response = await request(app).post('/mod/report').send({
        targetId: 'user-1',
        // missing moderatorId, actionType, reason
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should insert report and return 200 on success', async () => {
      const app = await createAppWithModRouter(true);
      const mockResult = { id: 'report-1', target_user_id: 'user-1' };
      mockSupabase.single.mockResolvedValueOnce({ data: mockResult, error: null });

      const payload = {
        targetId: 'user-1',
        moderatorId: 'mod-1',
        actionType: 'BAN',
        reason: 'Violation of Terms',
      };

      const response = await request(app).post('/mod/report').send(payload);

      expect(mockSupabase.from).toHaveBeenCalledWith('mod_logs');
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          target_user_id: payload.targetId,
          moderator_id: payload.moderatorId,
          action_type: payload.actionType,
          reason: payload.reason,
          evidence_url: undefined,
        },
      ]);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should return 500 if supabase insert fails', async () => {
      const app = await createAppWithModRouter(true);
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });

      const payload = {
        targetId: 'user-1',
        moderatorId: 'mod-1',
        actionType: 'BAN',
        reason: 'Violation of Terms',
      };

      const response = await request(app).post('/mod/report').send(payload);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to log report');
    });
  });
});
