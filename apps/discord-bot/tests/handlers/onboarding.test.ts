/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { needsOnboarding, markOnboarded, getUserPreferences, saveUserPreferences, handleOnboardingInteraction } from '../../src/handlers/onboarding.js';

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
            expect(args.embeds[0].data.title).toContain('Legal Stuff');
        });

        it('should show wallet setup when terms are accepted', async () => {
            mockInteraction.customId = 'onboard_accept_terms';
            await handleOnboardingInteraction(mockInteraction);

            expect(mockUpdate).toHaveBeenCalled();
            const args = mockUpdate.mock.calls[0][0];
            expect(args.embeds[0].data.title).toContain('Connect Your Wallet');

            // Should initialize basic preferences behind the scenes
            expect(getUserPreferences('interact-user')).toBeDefined();
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
            expect(args.embeds[0].data.title).toContain('You\'re All Set');
        });
    });
});
