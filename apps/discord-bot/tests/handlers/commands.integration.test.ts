import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Events } from 'discord.js';

const trackCommandEventMock = vi.fn();
const markUserActiveMock = vi.fn();
const handleCommandErrorMock = vi.fn();
const isOnCooldownMock = vi.fn(() => false);
const recordViolationMock = vi.fn();
const needsOnboardingMock = vi.fn(() => false);
const checkAndOnboardMock = vi.fn();

vi.mock('../../src/config.js', () => ({
  config: {
    modNotifications: {
      modChannelId: 'mod-channel',
      modRoleId: 'mod-role',
      enabled: true,
      rateLimitWindowMs: 60000,
      maxNotificationsPerWindow: 10,
      dedupeWindowMs: 300000,
    },
    suslinkAutoScan: false,
  },
}));

vi.mock('@tiltcheck/discord-utils', () => ({
  extractUrls: vi.fn(() => []),
  createModNotifier: vi.fn(() => ({
    setClient: vi.fn(),
    isEnabled: vi.fn(() => false),
  })),
}));

vi.mock('@tiltcheck/suslink', () => ({
  suslink: { scanUrl: vi.fn() },
}));

vi.mock('@tiltcheck/tiltcheck-core', () => ({
  trackMessage: vi.fn(),
  isOnCooldown: isOnCooldownMock,
  recordViolation: recordViolationMock,
}));

vi.mock('@tiltcheck/event-router', () => ({
  eventRouter: {
    subscribe: vi.fn(),
  },
}));

vi.mock('../../src/handlers/onboarding.js', () => ({
  checkAndOnboard: checkAndOnboardMock,
  handleOnboardingInteraction: vi.fn(),
  needsOnboarding: needsOnboardingMock,
}));

vi.mock('../../src/services/elastic-telemetry.js', () => ({
  trackMessageEvent: vi.fn(),
  trackCommandEvent: trackCommandEventMock,
}));

vi.mock('../../src/services/tilt-agent.js', () => ({
  markUserActive: markUserActiveMock,
}));

vi.mock('../../src/handlers/error.js', () => ({
  handleCommandError: handleCommandErrorMock,
}));

vi.mock('../../src/handlers/button-handlers.js', () => ({
  dispatchButtonInteraction: vi.fn(async () => false),
}));

describe('EventHandler command execute integration', () => {
  let EventHandler: typeof import('../../src/handlers/events.js').EventHandler;
  let client: any;
  let commandHandler: any;
  let interactionHandler: (interaction: any) => Promise<void>;

  beforeEach(async () => {
    ({ EventHandler } = await import('../../src/handlers/events.js'));

    client = {
      once: vi.fn(),
      on: vi.fn(),
      users: { fetch: vi.fn() },
    };
    commandHandler = { getCommand: vi.fn() };

    const handler = new EventHandler(client, commandHandler);
    handler.registerDiscordEvents();

    const interactionCreateCall = client.on.mock.calls.find(
      (call: [string]) => call[0] === Events.InteractionCreate,
    );
    interactionHandler = interactionCreateCall[1];

    vi.clearAllMocks();
  });

  it('routes chat command through execute path', async () => {
    const execute = vi.fn(async () => undefined);
    commandHandler.getCommand.mockReturnValue({ execute });

    const interaction = {
      isButton: () => false,
      isStringSelectMenu: () => false,
      isChatInputCommand: () => true,
      user: { id: 'u1', tag: 'tester#0001' },
      guildId: 'g1',
      commandName: 'tiltcheck',
      reply: vi.fn(),
    };

    await interactionHandler(interaction);

    expect(commandHandler.getCommand).toHaveBeenCalledWith('tiltcheck');
    expect(execute).toHaveBeenCalledWith(interaction);
    expect(trackCommandEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', guildId: 'g1', commandName: 'tiltcheck' }),
    );
    expect(markUserActiveMock).toHaveBeenCalledWith('u1', undefined);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it('blocks command execution during cooldown', async () => {
    isOnCooldownMock.mockReturnValueOnce(true);
    const execute = vi.fn(async () => undefined);
    commandHandler.getCommand.mockReturnValue({ execute });

    const interaction = {
      isButton: () => false,
      isStringSelectMenu: () => false,
      isChatInputCommand: () => true,
      user: { id: 'u2', tag: 'tester#0002' },
      guildId: 'g1',
      commandName: 'tiltcheck',
      reply: vi.fn(),
    };

    await interactionHandler(interaction);

    expect(recordViolationMock).toHaveBeenCalledWith('u2');
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeral: true }),
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('forwards command errors to centralized error handler', async () => {
    const execute = vi.fn(async () => {
      throw new Error('boom');
    });
    commandHandler.getCommand.mockReturnValue({ execute });

    const interaction = {
      isButton: () => false,
      isStringSelectMenu: () => false,
      isChatInputCommand: () => true,
      user: { id: 'u3', tag: 'tester#0003' },
      guildId: null,
      commandName: 'tip',
      reply: vi.fn(),
    };

    await interactionHandler(interaction);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(expect.any(Error), interaction);
  });
});
