import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/commands/ping.js', () => ({
  ping: { execute: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../src/commands/help.js', () => ({ help: { execute: vi.fn() } }));
vi.mock('../../src/commands/casino.js', () => ({ casino: { execute: vi.fn() } }));
vi.mock('../../src/commands/setstate.js', () => ({ setstate: { execute: vi.fn() } }));
vi.mock('../../src/commands/report.js', () => ({ default: { execute: vi.fn() } }));
vi.mock('../../src/commands/suslink.js', () => ({ linkCmd: { execute: vi.fn() } }));
vi.mock('../../src/commands/buddy.js', () => ({ buddy: { execute: vi.fn() } }));
vi.mock('@tiltcheck/tiltcheck-core', () => ({
  startCooldown: vi.fn(),
  isOnCooldown: vi.fn().mockReturnValue(false),
  getCooldownStatus: vi.fn().mockReturnValue(null),
  getViolationHistory: vi.fn().mockReturnValue(0),
  getUserTiltStatus: vi.fn().mockReturnValue({ onCooldown: false, recentSignals: [] }),
  getUserActivity: vi.fn().mockReturnValue(null),
}));

import { tiltcheck } from '../../src/commands/tiltcheck.js';
import { ping } from '../../src/commands/ping.js';

describe('TiltCheck Command', () => {
  it('registers top-level command and key subcommands', () => {
    const json = tiltcheck.data.toJSON();
    expect(json.name).toBe('tiltcheck');
    const optionNames = (json.options || []).map((opt: any) => opt.name);
    expect(optionNames).toEqual(expect.arrayContaining(['ping', 'status', 'history', 'cooldown']));
  });

  it('routes ping subcommand to ping command executor', async () => {
    const interaction: any = {
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue(null),
        getSubcommand: vi.fn().mockReturnValue('ping'),
      },
    };
    await tiltcheck.execute(interaction);
    expect((ping as any).execute).toHaveBeenCalledWith(interaction);
  });
});
