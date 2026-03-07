import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import modRouter from '../../src/routes/mod.js';

// Mock Supabase
const mockSupabase = vi.hoisted(() => ({
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabase),
}));

const app = express();
app.use(express.json());
app.use('/mod', modRouter);

describe('Mod Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /mod/report', () => {
        it('should return 400 if required fields are missing', async () => {
            const response = await request(app).post('/mod/report').send({
                targetId: 'user-1',
                // missing moderatorId, actionType, reason
            });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing required fields');
        });

        it('should insert report and return 200 on success', async () => {
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
