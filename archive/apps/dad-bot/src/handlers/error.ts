// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// DAD Bot — Error Handler

import type { ChatInputCommandInteraction } from 'discord.js';

export async function handleCommandError(
  error: unknown,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  console.error(`[Bot] Command error in /${interaction.commandName}:`, error);
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: `[ERROR] ${message}` });
    } else {
      await interaction.reply({ content: `[ERROR] ${message}`, ephemeral: true });
    }
  } catch {
    // Reply already sent
  }
}
