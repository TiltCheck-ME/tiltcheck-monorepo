/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-16 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    needsOnboarding,
    markOnboarded,
    getUserPreferences,
    saveUserPreferences,
    handleOnboardingInteraction,
    getWebsiteOnboardingUrl,
    getBetaTesterUrl,
    sendWelcomeDM,
} from '../../src/handlers/onboarding.js';

// We need to mock Supabase to avoid actual DB calls during testing
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null })
    })
}));

describe('Onboarding Handler', () => {
    const mockUserId = '888888888888888888';

    beforeEach(() => {
        vi.clearAllMocks();
        // Tests are running in the same process, so we use a different ID for each test modifying state
        // Alternatively, we could export a `clearCache()` function from the module but we don't have that.
    });

    describe('needsOnboarding', () => {
        it('should return true for an unknown user', () => {
            expect(needsOnboarding('unknown-user-id')).toBe(true);
        });
    });

    describe('getWebsiteOnboardingUrl', () => {
        it('should point welcome links at the dashboard onboarding route', () => {
            expect(getWebsiteOnboardingUrl()).toBe('https://tiltcheck.me/login?redirect=%2Fdashboard');
        });
    });

    describe('sendWelcomeDM', () => {
        it('should include the Discord linking and beta buttons in the welcome DM', async () => {
            const send = vi.fn().mockResolvedValue(undefined);
            const createDM = vi.fn().mockResolvedValue({ send });
            const user = {
                username: 'TestUser',
                createDM,
            } as any;

            const sent = await sendWelcomeDM(user);

            expect(sent).toBe(true);
            expect(createDM).toHaveBeenCalledOnce();
            expect(send).toHaveBeenCalledOnce();

            const payload = send.mock.calls[0][0];
            expect(payload.embeds).toHaveLength(1);
            expect(payload.components).toHaveLength(2);
            expect(payload.components[0].components[0].data.label).toBe('LINK DISCORD NOW');
            expect(payload.components[0].components[0].data.url).toBe(getWebsiteOnboardingUrl());
            expect(payload.components[1].components[0].data.label).toBe('APPLY FOR BETA');
            expect(payload.components[1].components[0].data.url).toBe(getBetaTesterUrl());
        });
    });

    describe('markOnboarded', () => {
        it('should mark a user as onboarded', () => {
            const id = 'onboard-test-123';
            expect(needsOnboarding(id)).toBe(true);
            markOnboarded(id);
            expect(needsOnboarding(id)).toBe(false);
        });
    });

    describe('Preferences', () => {
        it('should save and retrieve user preferences', () => {
            const id = 'prefs-test-456';
            const prefs = {
                userId: id,
                discordId: id,
                joinedAt: Date.now(),
                notifications: { tips: true, trivia: false, promos: true },
                riskLevel: 'degen' as const,
                cooldownEnabled: false,
                hasAcceptedTerms: true
            };

            saveUserPreferences(prefs);

            const retrieved = getUserPreferences(id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.riskLevel).toBe('degen');
            expect(retrieved?.notifications.trivia).toBe(false);

            // Should also be marked as onboarded implicitly
            expect(needsOnboarding(id)).toBe(false);
        });
    });

    describe('handleOnboardingInteraction', () => {
        let mockInteraction: any;
        let mockUpdate: any;

        beforeEach(() => {
            mockUpdate = vi.fn();
            mockInteraction = {
                user: { id: 'interact-user', username: 'TestUser' },
                update: mockUpdate,
                customId: '',
            };
        });

        it('should show terms when onboard_start is clicked', async () => {
            mockInteraction.customId = 'onboard_start';
            await handleOnboardingInteraction(mockInteraction);

            expect(mockUpdate).toHaveBeenCalled();
            const args = mockUpdate.mock.calls[0][0];
            expect(args.embeds[0].data.title).toContain('QUICK TERMS');
        });

        it('should show wallet setup when terms are accepted', async () => {
            mockInteraction.customId = 'onboard_accept_terms';
            await handleOnboardingInteraction(mockInteraction);

            expect(mockUpdate).toHaveBeenCalled();
            const args = mockUpdate.mock.calls[0][0];
            expect(args.embeds[0].data.title).toContain('AUDIT CALIBRATION — STEP 1 OF 3');
        });

        it('should complete onboarding successfully', async () => {
            // First initialize prefs
            saveUserPreferences({
                userId: 'interact-user',
                discordId: 'interact-user',
                joinedAt: Date.now(),
                notifications: { tips: true, trivia: false, promos: false },
                riskLevel: 'moderate',
                cooldownEnabled: true,
                hasAcceptedTerms: true
            });

            mockInteraction.customId = 'onboard_complete';
            await handleOnboardingInteraction(mockInteraction);

            expect(mockUpdate).toHaveBeenCalled();
            expect(needsOnboarding('interact-user')).toBe(false);

            const args = mockUpdate.mock.calls[0][0];
            expect(args.embeds[0].data.title).toContain('PROFILE ACTIVATED');
        });
    });
});
