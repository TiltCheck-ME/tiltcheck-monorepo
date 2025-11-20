/**
 * Command Interface
 * 
 * Defines the structure for Discord bot commands.
 */

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export type CommandCollection = Map<string, Command>;
