import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lockvault } from '../../src/commands/lockvault.js';

// Mock dependencies
vi.mock('discord.js', () => ({
  SlashCommandBuilder: vi.fn().mockReturnValue({
    setName: vi.fn().mockReturnThis(),
    setDescription: vi.fn().mockReturnThis(),
    addSubcommand: vi.fn().mockReturnThis(),
  }),
  ChatInputCommandInteraction: vi.fn(),
  EmbedBuilder: vi.fn().mockReturnValue({
    setColor: vi.fn().mockReturnThis(),
    setTitle: vi.fn().mockReturnThis(),
    setDescription: vi.fn().mockReturnThis(),
    addFields: vi.fn().mockReturnThis(),
    setFooter: vi.fn().mockReturnThis(),
  }),
}));

vi.mock('@tiltcheck/lockvault', () => ({
  lockVault: vi.fn(),
  unlockVault: vi.fn(),
  extendVault: vi.fn(),
  getVaultStatus: vi.fn(),
  setAutoVault: vi.fn(),
  getAutoVault: vi.fn(),
  setReloadSchedule: vi.fn(),
  getReloadSchedule: vi.fn(),
}));

vi.mock('@tiltcheck/natural-language-parser', () => ({
  parseAmount: vi.fn(),
  parseDuration: vi.fn(),
}));

import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import {
  lockVault,
  unlockVault,
  extendVault,
  getVaultStatus,
  setAutoVault,
  getAutoVault,
  setReloadSchedule,
  getReloadSchedule,
} from '@tiltcheck/lockvault';
import { parseAmount, parseDuration } from '@tiltcheck/natural-language-parser';

describe('lockvault command', () => {
  let mockInteraction: any;

  beforeEach(() => {
    mockInteraction = {
      user: { id: '123' },
      options: {
        getSubcommand: vi.fn(),
        getString: vi.fn(),
        getNumber: vi.fn(),
      },
      reply: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('lock subcommand', () => {
    it('should lock a vault successfully', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('lock');
      mockInteraction.options.getString
        .mockReturnValueOnce('$100')
        .mockReturnValueOnce('24h')
        .mockReturnValueOnce('anti-tilt');

      (parseAmount as any).mockReturnValue({ success: true, data: 100 });
      (parseDuration as any).mockReturnValue({ success: true, data: 86400000 });
      (lockVault as any).mockReturnValue({
        id: 'vault_123',
        vaultAddress: 'addr123',
        unlockAt: Date.now() + 86400000,
        lockedAmountSOL: 0.1,
      });

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
        ephemeral: true,
      });
    });

    it('should handle invalid amount', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('lock');
      mockInteraction.options.getString
        .mockReturnValueOnce('invalid')
        .mockReturnValueOnce('24h');

      (parseAmount as any).mockReturnValue({ success: false, error: 'Invalid amount' });

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ Invalid amount',
        ephemeral: true,
      });
    });
  });

  describe('unlock subcommand', () => {
    it('should unlock a vault successfully', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('unlock');
      mockInteraction.options.getString.mockReturnValue('vault_123');

      (unlockVault as any).mockReturnValue({
        id: 'vault_123',
        lockedAmountSOL: 0.1,
      });

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
        ephemeral: true,
      });
    });

    it('should handle unlock error', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('unlock');
      mockInteraction.options.getString.mockReturnValue('vault_123');

      (unlockVault as any).mockImplementation(() => {
        throw new Error('Vault not found');
      });

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ Vault not found',
        ephemeral: true,
      });
    });
  });

  describe('extend subcommand', () => {
    it('should extend a vault successfully', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('extend');
      mockInteraction.options.getString
        .mockReturnValueOnce('vault_123')
        .mockReturnValueOnce('12h');

      (extendVault as any).mockReturnValue({
        id: 'vault_123',
        unlockAt: Date.now() + 86400000,
        extendedCount: 1,
      });

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
        ephemeral: true,
      });
    });
  });

  describe('status subcommand', () => {
    it('should show vault status', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('status');

      (getVaultStatus as any).mockReturnValue([
        {
          id: 'vault_123',
          status: 'locked',
          unlockAt: Date.now() + 86400000,
          lockedAmountSOL: 0.1,
        },
      ]);
      (getAutoVault as any).mockReturnValue(null);
      (getReloadSchedule as any).mockReturnValue(null);

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
        ephemeral: true,
      });
    });

    it('should handle no vaults', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('status');

      (getVaultStatus as any).mockReturnValue([]);
      (getAutoVault as any).mockReturnValue(null);
      (getReloadSchedule as any).mockReturnValue(null);

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'ℹ️ No active vaults, auto-vault, or reload schedule.',
        ephemeral: true,
      });
    });
  });

  describe('autovault subcommand', () => {
    it('should set auto-vault successfully', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('autovault');
      mockInteraction.options.getNumber.mockReturnValue(20);
      mockInteraction.options.getString.mockReturnValue('api_key_123');

      await lockvault.execute(mockInteraction);

      expect(setAutoVault).toHaveBeenCalledWith('123', 20, 'api_key_123');
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
        ephemeral: true,
      });
    });

    it('should reject invalid percentage', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('autovault');
      mockInteraction.options.getNumber.mockReturnValue(150);

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ Percentage must be between 0 and 100.',
        ephemeral: true,
      });
    });
  });

  describe('reload subcommand', () => {
    it('should set reload schedule successfully', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('reload');
      mockInteraction.options.getString
        .mockReturnValueOnce('$50')
        .mockReturnValueOnce('weekly');

      (parseAmount as any).mockReturnValue({ success: true, data: 50 });

      await lockvault.execute(mockInteraction);

      expect(setReloadSchedule).toHaveBeenCalledWith('123', '$50', 'weekly');
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
        ephemeral: true,
      });
    });

    it('should reject invalid interval', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('reload');
      mockInteraction.options.getString
        .mockReturnValueOnce('$50')
        .mockReturnValueOnce('invalid');

      (parseAmount as any).mockReturnValue({ success: true, data: 50 });

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ Interval must be "daily", "weekly", or "monthly".',
        ephemeral: true,
      });
    });
  });

  describe('unknown subcommand', () => {
    it('should handle unknown subcommand', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('unknown');

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Unknown subcommand',
        ephemeral: true,
      });
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('lock');
      mockInteraction.options.getString
        .mockReturnValueOnce('$100')
        .mockReturnValueOnce('24h');

      (parseAmount as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await lockvault.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: '❌ Unexpected error: Unexpected error',
        ephemeral: true,
      });
    });
  });
});
