/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Centralized Error Handler
 *
 * Provides two surfaces:
 *   - handleCommandError  — wraps a failed slash-command interaction
 *   - handleClientError   — logs non-interaction errors (process events, etc.)
 *
 * Sentry is used when @sentry/node is available at runtime (optional dep).
 * Falls back to console.error otherwise.
 */

import type { CommandInteraction } from 'discord.js';
import { errorEmbed } from '@tiltcheck/discord-utils';

// ---------------------------------------------------------------------------
// Sentry – optional integration
// ---------------------------------------------------------------------------

// We attempt a dynamic import so that the module compiles and runs correctly
// regardless of whether @sentry/node is installed.
type SentryClient = {
  captureException: (err: unknown, ctx?: Record<string, unknown>) => string;
};

let sentry: SentryClient | null = null;

async function loadSentry(): Promise<void> {
  try {
    // Dynamic import keeps this tree-shakeable and avoids a hard dep.
    const mod = await import('@sentry/node');
    // Only treat it as configured when a DSN has been supplied.
    if (process.env.SENTRY_DSN) {
      sentry = mod as unknown as SentryClient;
    }
  } catch {
    // @sentry/node is not installed — no-op.
  }
}

// Fire-and-forget; the module is usable before this resolves.
loadSentry().catch(() => undefined);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred.';
}

function reportToSentry(error: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return;
  try {
    sentry.captureException(error, context);
  } catch {
    // Never let Sentry reporting crash the handler.
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Handle an error that occurred while executing a slash command.
 *
 * - Replies to the interaction with a user-friendly error embed (ephemeral).
 * - Logs to Sentry with the command name and user id as context.
 * - Falls back to console.error when Sentry is unavailable.
 */
export async function handleCommandError(
  error: unknown,
  interaction: CommandInteraction
): Promise<void> {
  const commandName = interaction.commandName;
  const userId = interaction.user.id;
  const userTag = interaction.user.tag;

  console.error(`[ErrorHandler] /${commandName} failed for ${userTag}:`, error);

  reportToSentry(error, {
    extra: { commandName, userId, userTag, guildId: interaction.guildId ?? 'DM' },
  });

  const embed = errorEmbed(
    'Something went wrong',
    'An unexpected error occurred while running this command. Please try again in a moment.\n\nIf the problem persists, let a moderator know.'
  );

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (replyError) {
    // The interaction token may have expired (> 3 s) — log but do not throw.
    console.error(
      `[ErrorHandler] Could not send error reply for /${commandName}:`,
      replyError
    );
  }
}

/**
 * Handle a non-interaction error (process.on('unhandledRejection'), etc.).
 *
 * @param error   The thrown value.
 * @param context Optional label identifying where the error came from.
 */
export function handleClientError(error: unknown, context?: string): void {
  const label = context ? `[${context}]` : '[ClientError]';
  console.error(`${label}`, error);

  reportToSentry(error, context ? { extra: { context } } : undefined);
}
