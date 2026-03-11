import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tiltcheck/trust-engines', () => ({
  trustEngines: {
    getCasinoScore: vi.fn().mockReturnValue(82),
    getCasinoBreakdown: vi.fn().mockReturnValue({
      fairnessScore: 80,
      payoutScore: 85,
      bonusScore: 70,
      userReportScore: 75,
      freespinScore: 78,
      complianceScore: 84,
      supportScore: 79,
      history: [1, 2],
    }),
    explainCasinoScore: vi.fn().mockReturnValue(['Stable payouts']),
    getDegenScore: vi.fn().mockReturnValue(88),
    getDegenBreakdown: vi.fn().mockReturnValue({
      behaviorScore: 90,
      tiltIndicators: 1,
      accountabilityBonus: 5,
      scamFlags: 0,
      communityReports: 2,
      history: [1],
    }),
    getTrustLevel: vi.fn().mockReturnValue('high'),
    explainDegenScore: vi.fn().mockReturnValue(['Good accountability']),
  },
}));

import { trustDashboard } from '../../src/commands/trust.js';

describe('Trust Command', () => {
  let interaction: any;

  beforeEach(() => {
    interaction = {
      user: {
        id: 'u-1',
        username: 'alice',
        displayAvatarURL: vi.fn().mockReturnValue('https://avatar.example'),
      },
      options: {
        getSubcommand: vi.fn().mockReturnValue('explain'),
        getString: vi.fn().mockReturnValue('stake.com'),
        getUser: vi.fn().mockReturnValue(null),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('registers trust command with expected subcommands', () => {
    const json = trustDashboard.data.toJSON();
    expect(json.name).toBe('trust');
    const names = (json.options || []).map((opt: any) => opt.name);
    expect(names).toEqual(expect.arrayContaining(['casino', 'user', 'explain']));
  });

  it('executes explain subcommand and replies with embed', async () => {
    await trustDashboard.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [expect.any(Object)],
    });
  });

  it('executes casino subcommand and includes score text', async () => {
    interaction.options.getSubcommand.mockReturnValue('casino');
    await trustDashboard.execute(interaction);
    const payload = interaction.reply.mock.calls[0][0];
    expect(payload.embeds[0].data.description).toContain('Overall Score: 82/100');
  });
});
