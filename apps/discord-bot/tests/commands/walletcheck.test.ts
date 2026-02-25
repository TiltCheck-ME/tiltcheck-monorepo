/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walletcheck } from '../../src/commands/walletcheck.js';
import { WalletCheckService } from '@tiltcheck/walletcheck';

// Mock the walletcheck service
vi.mock('@tiltcheck/walletcheck', () => ({
    WalletCheckService: vi.fn().mockImplementation(() => ({
        scanWallet: vi.fn().mockResolvedValue({
            score: 85,
            isCompromised: false,
            details: { ethBalance: '1.5' },
            threats: [],
            recommendations: ['Stay safe']
        })
    }))
}));

describe('WalletCheck Command', () => {
    let mockInteraction: any;
    let mockDeferReply: any;
    let mockEditReply: any;
    let mockReply: any;
    let mockGetString: any;

    beforeEach(() => {
        mockDeferReply = vi.fn();
        mockEditReply = vi.fn();
        mockReply = vi.fn();
        mockGetString = vi.fn();

        mockInteraction = {
            deferReply: mockDeferReply,
            editReply: mockEditReply,
            reply: mockReply,
            options: {
                getString: mockGetString
            }
        };
    });

    it('should reject invalid address formats', async () => {
        mockGetString.mockReturnValue('invalid-address');

        await walletcheck.execute(mockInteraction);

        expect(mockReply).toHaveBeenCalledWith({
            content: '❌ Invalid EVM address format. Please provide a valid 0x... address.',
            ephemeral: true
        });
        expect(mockDeferReply).not.toHaveBeenCalled();
    });

    it('should perform a successful wallet scan on a valid address', async () => {
        mockGetString.mockReturnValue('0x1234567890abcdef1234567890abcdef12345678');

        await walletcheck.execute(mockInteraction);

        expect(mockDeferReply).toHaveBeenCalled();
        expect(mockEditReply).toHaveBeenCalled();
        const callArg = mockEditReply.mock.calls[0][0];
        expect(callArg.embeds).toBeDefined();
        expect(callArg.embeds[0].data.title).toContain('Wallet Security Report');
    });

    it('should handle service errors gracefully', async () => {
        const errorService = {
            scanWallet: vi.fn().mockRejectedValue(new Error('Network error'))
        };

        // Override the mock just for this test
        vi.mocked(WalletCheckService).mockImplementationOnce(() => errorService as any);

        mockGetString.mockReturnValue('0x1234567890abcdef1234567890abcdef12345678');

        await walletcheck.execute(mockInteraction);

        expect(mockDeferReply).toHaveBeenCalled();
        expect(mockEditReply).toHaveBeenCalledWith({
            content: '❌ Failed to perform wallet scan. Please ensure the address is correct and try again.'
        });
    });
});
