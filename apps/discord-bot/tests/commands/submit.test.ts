/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tiltcheck/suslink', () => ({
  suslink: {
    scanUrl: vi.fn().mockResolvedValue({
      url: 'https://example.com/bonus',
      riskLevel: 'safe',
      reason: 'Safe link. No suspicious patterns detected.',
      scannedAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
  },
}));

vi.mock('@tiltcheck/discord-utils', () => ({
  isValidUrl: vi.fn((url: string) => /^https?:\/\//.test(url)),
}));

const postSubmittedBonus = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/services/alert-service.js', () => ({
  getAlertService: () => ({
    postSubmittedBonus,
  }),
}));

import { submit } from '../../src/commands/submit.js';
import { suslink } from '@tiltcheck/suslink';

describe('Submit Command', () => {
  let interaction: any;

  beforeEach(() => {
    postSubmittedBonus.mockClear();
    interaction = {
      user: { id: 'user-1', tag: 'tester#0001' },
      options: {
        getSubcommand: vi.fn().mockReturnValue('bonus'),
        getString: vi.fn((name: string) => {
          if (name === 'casino') return 'Modo Casino';
          if (name === 'link') return 'https://example.com/bonus';
          if (name === 'details') return '25 free spins on the new slot. Expires tonight.';
          return null;
        }),
      },
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('registers submit command with bonus subcommand', () => {
    const json = submit.data.toJSON();
    expect(json.name).toBe('submit');
    expect(json.options?.[0]?.name).toBe('bonus');
  });

  it('rejects invalid URLs before scanning', async () => {
    interaction.options.getString = vi.fn((name: string) => {
      if (name === 'casino') return 'Modo Casino';
      if (name === 'link') return 'not-a-url';
      if (name === 'details') return '25 free spins on the new slot. Expires tonight.';
      return null;
    });

    await submit.execute(interaction);

    expect((suslink as any).scanUrl).not.toHaveBeenCalled();
    expect(postSubmittedBonus).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ data: expect.objectContaining({ title: 'INVALID BONUS LINK' }) })],
    });
  });

  it('refuses suspicious bonus links', async () => {
    vi.mocked((suslink as any).scanUrl).mockResolvedValueOnce({
      url: 'https://example.com/bonus',
      riskLevel: 'suspicious',
      reason: 'Redirect chain looks sketchy.',
      scannedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await submit.execute(interaction);

    expect(postSubmittedBonus).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ data: expect.objectContaining({ title: 'BONUS NOT VERIFIED' }) })],
    });
  });

  it('posts verified bonus submissions to the alert service', async () => {
    await submit.execute(interaction);

    expect(postSubmittedBonus).toHaveBeenCalledWith(
      expect.objectContaining({
        casinoName: 'Modo Casino',
        bonusUrl: 'https://example.com/bonus',
        submittedById: 'user-1',
      })
    );
    expect(interaction.editReply).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ data: expect.objectContaining({ title: 'BONUS SUBMITTED' }) })],
    });
  });
});
