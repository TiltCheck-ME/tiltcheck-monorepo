import { describe, expect, it, vi } from 'vitest';
import { tip } from '../../src/commands/tip.js';

describe('Tip Command', () => {
  it('registers expected subcommands', () => {
    const json = tip.data.toJSON();
    expect(json.name).toBe('tip');
    const subcommands = (json.options || []).map((option: any) => option.name);
    expect(subcommands).toEqual(
      expect.arrayContaining(['send', 'deposit', 'withdraw', 'balance', 'wallet', 'help']),
    );
  });

  it('fails fast with clear error when tipping deps are not initialized', async () => {
    const interaction: any = {
      reply: vi.fn().mockResolvedValue(undefined),
    };
    await tip.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: '❌ Tipping system is not initialized. Check bot configuration.',
      ephemeral: true,
    });
  });
});
