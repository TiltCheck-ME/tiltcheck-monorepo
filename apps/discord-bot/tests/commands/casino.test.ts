/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { casino } from '../../src/commands/casino.js';
import { db } from '@tiltcheck/database';

vi.mock('@tiltcheck/database', () => ({
    db: {
        getCasino: vi.fn(),
    }
}));

describe('Casino Command', () => {
    let mockInteraction: any;
    let mockDeferReply: any;
    let mockEditReply: any;
    let mockGetString: any;

    beforeEach(() => {
        mockDeferReply = vi.fn();
        mockEditReply = vi.fn();
        mockGetString = vi.fn();

        mockInteraction = {
            deferReply: mockDeferReply,
            editReply: mockEditReply,
            options: {
                getString: mockGetString
            }
        };
    });

    it('should reply with error if casino not found', async () => {
        mockGetString.mockReturnValue('nonexistent.com');
        vi.mocked(db.getCasino).mockResolvedValueOnce(null as any);

        await casino.execute(mockInteraction);

        expect(mockDeferReply).toHaveBeenCalled();
        expect(mockEditReply).toHaveBeenCalledWith({
            content: `❌ No data found for **nonexistent.com**.\n\nTry domains like \`stake.com\`, \`rollbit.com\`, or \`duelbits.com\`.`
        });
    });

    it('should display casino trust data when found', async () => {
        mockGetString.mockReturnValue('validcasino.com');
        vi.mocked(db.getCasino).mockResolvedValueOnce({
            name: 'Valid Casino',
            domain: 'validcasino.com',
            status: 'active',
            claimed_rtp: 95,
            verified_rtp: 94.5,
            updated_at: new Date().toISOString(),
            license_info: { Curacao: '123' }
        } as any);

        await casino.execute(mockInteraction);

        expect(mockDeferReply).toHaveBeenCalled();
        expect(mockEditReply).toHaveBeenCalled();

        const callArg = mockEditReply.mock.calls[0][0];
        expect(callArg.embeds).toBeDefined();
        expect(callArg.embeds[0].data.title).toContain('Valid Casino');
        expect(callArg.embeds[0].data.fields[0].value).toBe('ACTIVE');
    });

    it('should handle service errors gracefully', async () => {
        mockGetString.mockReturnValue('errorcasino.com');
        vi.mocked(db.getCasino).mockRejectedValueOnce(new Error('Db err'));

        await casino.execute(mockInteraction);

        expect(mockDeferReply).toHaveBeenCalled();
        expect(mockEditReply).toHaveBeenCalledWith({ content: '❌ Failed to fetch casino data.' });
    });
});
