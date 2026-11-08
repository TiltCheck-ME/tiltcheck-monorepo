/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tiltcheck/db', () => ({
  createBetaSignup: vi.fn(),
  findLatestBetaSignupByDiscordId: vi.fn(),
}));

vi.mock('../../src/services/beta-review-queue.js', () => ({
  syncBetaReviewQueue: vi.fn(),
}));

import * as db from '@tiltcheck/db';
import * as betaReviewQueue from '../../src/services/beta-review-queue.js';
import { beta } from '../../src/commands/beta.js';

describe('Beta Command', () => {
  let interaction: any;
  const createBetaSignup = vi.mocked(db.createBetaSignup);
  const findLatestBetaSignupByDiscordId = vi.mocked(db.findLatestBetaSignupByDiscordId);
  const syncBetaReviewQueue = vi.mocked(betaReviewQueue.syncBetaReviewQueue);

  beforeEach(() => {
    createBetaSignup.mockReset();
    findLatestBetaSignupByDiscordId.mockReset();
    syncBetaReviewQueue.mockReset();

    interaction = {
      user: { id: 'user-1', tag: 'tester#0001' },
      options: {
        getSubcommand: vi.fn().mockReturnValue('apply'),
        getString: vi.fn((name: string) => {
          if (name === 'casinos') return 'Modo, WOW Vegas';
          if (name === 'tester_type') return 'Bug hunter';
          if (name === 'wants_to_test') return 'Extension flows and Discord surfaces';
          if (name === 'notes') return 'I file clean bug reports.';
          return null;
        }),
      },
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('registers beta command with apply and status subcommands', () => {
    const json = beta.data.toJSON();
    const subcommands = (json.options || []).map((option: any) => option.name);
    expect(json.name).toBe('beta');
    expect(subcommands).toEqual(expect.arrayContaining(['apply', 'status']));
  });

  it('shows existing signup status instead of duplicating applications', async () => {
    findLatestBetaSignupByDiscordId.mockResolvedValueOnce({
      status: 'pending',
      application_path: 'discord',
      beta_access_web: false,
      beta_access_dashboard: false,
      beta_access_extension: false,
      beta_access_discord: false,
      beta_access_community: false,
      interests: ['Modo'],
      experience_level: 'Bug hunter',
      feedback_preference: 'Extension',
      referral_source: 'Applied from Discord command.',
      reviewer_notes: null,
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });

    await beta.execute(interaction);

    expect(createBetaSignup).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith({
      embeds: [expect.any(Object)],
    });
  });

  it('creates a new discord beta signup and syncs the review queue', async () => {
    findLatestBetaSignupByDiscordId.mockResolvedValueOnce(null);
    createBetaSignup.mockResolvedValueOnce({ id: 'beta-1' });
    syncBetaReviewQueue.mockResolvedValueOnce({ channelId: 'c1', messageId: 'm1' });

    await beta.execute(interaction);

    expect(createBetaSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        application_path: 'discord',
        contact_method: 'discord',
        discord_id: 'user-1',
      })
    );
    expect(syncBetaReviewQueue).toHaveBeenCalledWith({ signupId: 'beta-1', eventType: 'submitted' });
  });

  it('shows no-application message on beta status when nothing exists', async () => {
    interaction.options.getSubcommand.mockReturnValue('status');
    findLatestBetaSignupByDiscordId.mockResolvedValueOnce(null);

    await beta.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: 'No Discord beta application found. Use `/beta apply` when you want in.',
    });
  });
});
