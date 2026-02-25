/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Command Builders with Context Support
 * 
 * Helpers for creating commands that work in both Guild and User Install contexts.
 */

import { SlashCommandBuilder, InteractionContextType } from 'discord.js';

/**
 * Create a command for personal/user features (Guild + User Install)
 * Examples: /tilt check, /cooldown, /help
 */
export function createPersonalCommand(name: string, description: string): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM
    );
}

/**
 * Create a command for guild-only features (Guild Install only)
 * Examples: /approvepromo, /setpromochannel, /adminconfig
 */
export function createGuildCommand(name: string, description: string): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setContexts(InteractionContextType.Guild);
}

/**
 * Create a command for mod/admin actions
 * Sets default required permissions to MODERATE_MEMBERS
 */
export function createModCommand(name: string, description: string): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(BigInt(0)); // Restrict to mods via role checks
}

/**
 * Check if interaction is in user install context (DM with bot)
 */
export function isUserInstallContext(interaction: any): boolean {
  return !interaction.guild && interaction.user;
}

/**
 * Check if interaction is in guild context
 */
export function isGuildContext(interaction: any): boolean {
  return !!interaction.guild;
}

/**
 * Safely reply to user install commands (handle no guild)
 */
export async function replyInContext(interaction: any, options: any): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(options);
  } else {
    await interaction.reply(options);
  }
}
