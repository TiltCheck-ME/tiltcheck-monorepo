/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { affiliateRouter } from '../../src/routes/affiliate.js';
import * as trustScoreTypes from '@tiltcheck/trust-score-types';
import * as eventTypes from '@tiltcheck/event-types';

vi.mock('@tiltcheck/trust-score-types', () => ({
    calculateAffiliateTrustScore: vi.fn(),
}));

vi.mock('@tiltcheck/event-types', () => ({
    createEvent: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/affiliate', affiliateRouter);

describe('Affiliate Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /affiliate/score', () => {
        it('should return 400 if affiliateId is missing', async () => {
            const response = await request(app).post('/affiliate/score').send({ sources: [] });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('affiliateId is required');
        });

        it('should return 400 if sources array is missing or empty', async () => {
            const response = await request(app).post('/affiliate/score').send({ affiliateId: 'aff-1', sources: [] });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('sources array is required');
        });

        it('should return 400 if no valid source ratings are provided', async () => {
            const response = await request(app).post('/affiliate/score').send({
                affiliateId: 'aff-1',
                sources: [{ source: 'invalid-no-categories' }],
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('No valid source ratings provided');
        });

        it('should calculate score and return 200 on valid input', async () => {
            const mockResult = {
                score: 85,
                categories: { fairness: 90, support: 80, payouts: 85, compliance: 90, bonusQuality: 80 },
                sourceCount: 1,
                sourceCoverage: 1,
                weights: { fairness: 0.3, support: 0.2, payouts: 0.2, compliance: 0.2, bonusQuality: 0.1 },
            };

            const mockEvent = { id: 'evt-1', name: 'trust.affiliate.score.updated' };

            vi.mocked(trustScoreTypes.calculateAffiliateTrustScore).mockReturnValueOnce(mockResult);
            vi.mocked(eventTypes.createEvent).mockReturnValueOnce(mockEvent as any);

            const validSource = {
                source: 'ReviewSiteA',
                categories: { fairness: 90, support: 80, payouts: 85, compliance: 90, bonusQuality: 80 },
            };

            const response = await request(app)
                .post('/affiliate/score')
                .set('x-correlation-id', 'corr-123')
                .send({
                    affiliateId: 'aff-1',
                    sources: [validSource],
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.affiliateId).toBe('aff-1');
            expect(response.body.result).toEqual(mockResult);
            expect(response.body.event).toEqual(mockEvent);

            expect(trustScoreTypes.calculateAffiliateTrustScore).toHaveBeenCalledWith([
                {
                    source: 'ReviewSiteA',
                    lastUpdatedAt: undefined,
                    categories: validSource.categories,
                }
            ]);

            expect(eventTypes.createEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'trust.affiliate.score.updated',
                source: 'api-gateway',
                payload: {
                    affiliateId: 'aff-1',
                    score: 85,
                    categories: mockResult.categories,
                    sourceCount: 1,
                },
                correlationId: 'corr-123',
            }));
        });
    });
});
