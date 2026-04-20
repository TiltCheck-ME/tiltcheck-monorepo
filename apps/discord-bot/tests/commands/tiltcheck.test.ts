/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/commands/ping.js', () => ({
  ping: { execute: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../src/commands/help.js', () => ({ help: { execute: vi.fn() } }));
vi.mock('../../src/commands/casino.js', () => ({ casino: { execute: vi.fn() } }));
vi.mock('../../src/commands/setstate.js', () => ({ setstate: { execute: vi.fn() } }));
vi.mock('../../src/commands/status.js', () => ({ status: { execute: vi.fn() } }));
vi.mock('../../src/commands/goal.js', () => ({ goal: { execute: vi.fn() } }));
vi.mock('../../src/commands/intervene.js', () => ({ intervene: { execute: vi.fn() } }));
vi.mock('../../src/commands/cooldown.js', () => ({
  cooldown: { execute: vi.fn() },
  tilt: { execute: vi.fn() },
}));
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

import { session } from '../../src/commands/session.js';
import { status } from '../../src/commands/status.js';
import { goal } from '../../src/commands/goal.js';
import { cooldown, tilt } from '../../src/commands/cooldown.js';
import { intervene } from '../../src/commands/intervene.js';
import { setstate } from '../../src/commands/setstate.js';

describe('Session Command', () => {
  it('registers top-level command and key subcommands', () => {
    const json = session.data.toJSON();
    expect(json.name).toBe('session');
    const optionNames = (json.options || []).map((opt: any) => opt.name);
    expect(optionNames).toEqual(expect.arrayContaining(['status', 'history', 'goal', 'cooldown', 'intervene', 'state']));
  });

  it('routes status subcommand to status executor', async () => {
    const interaction: any = {
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue(null),
        getSubcommand: vi.fn().mockReturnValue('status'),
      },
    };
    await session.execute(interaction);
    expect((status as any).execute).toHaveBeenCalledWith(interaction);
  });

  it('routes history subcommand to tilt executor', async () => {
    const interaction: any = {
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue(null),
        getSubcommand: vi.fn().mockReturnValue('history'),
      },
    };
    await session.execute(interaction);
    expect((tilt as any).execute).toHaveBeenCalledWith(interaction);
  });

  it('routes goal subcommand to goal executor', async () => {
    const interaction: any = {
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue(null),
        getSubcommand: vi.fn().mockReturnValue('goal'),
      },
    };
    await session.execute(interaction);
    expect((goal as any).execute).toHaveBeenCalledWith(interaction);
  });

  it('routes cooldown subcommand to cooldown executor', async () => {
    const interaction: any = {
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue(null),
        getSubcommand: vi.fn().mockReturnValue('cooldown'),
      },
    };
    await session.execute(interaction);
    expect((cooldown as any).execute).toHaveBeenCalledWith(interaction);
  });

  it('routes intervene subcommand to intervene executor', async () => {
    const interaction: any = {
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue(null),
        getSubcommand: vi.fn().mockReturnValue('intervene'),
      },
    };
    await session.execute(interaction);
    expect((intervene as any).execute).toHaveBeenCalledWith(interaction);
  });

  it('routes state subcommand to setstate executor', async () => {
    const interaction: any = {
      options: {
        getSubcommandGroup: vi.fn().mockReturnValue(null),
        getSubcommand: vi.fn().mockReturnValue('state'),
      },
    };
    await session.execute(interaction);
    expect((setstate as any).execute).toHaveBeenCalledWith(interaction);
  });
});
