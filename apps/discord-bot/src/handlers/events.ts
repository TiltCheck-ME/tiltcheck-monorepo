/**
 * Event Handler
 * 
 * Manages Discord client events and Event Router subscriptions.
 */

import { Client, Events } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import { extractUrls } from '@tiltcheck/discord-utils';
import { suslink } from '@tiltcheck/suslink';
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';

export class EventHandler {
  constructor(
    private client: Client,
    private commandHandler: CommandHandler
  ) {}

  /**
   * Register all Discord event handlers
   */
  registerDiscordEvents(): void {
    // Ready event
    this.client.once(Events.ClientReady, (client) => {
      console.log(`[Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);
    });

    // Interaction create (slash commands)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commandHandler.getCommand(interaction.commandName);

      if (!command) {
        console.warn(
          `[Bot] Unknown command: ${interaction.commandName}`
        );
        return;
      }

      try {
        await command.execute(interaction);
        console.log(
          `[Bot] ${interaction.user.tag} used /${interaction.commandName}`
        );
      } catch (error) {
        console.error(
          `[Bot] Error executing ${interaction.commandName}:`,
          error
        );

        const errorMessage = {
          content: 'There was an error executing this command!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    });

    // Message create (auto-scan links if enabled)
    if (config.suslinkAutoScan) {
      this.client.on(Events.MessageCreate, async (message) => {
        // Ignore bot messages
        if (message.author.bot) return;

        // Extract URLs from message
        const urls = extractUrls(message.content);

        if (urls.length > 0) {
          console.log(
            `[Bot] Auto-scanning ${urls.length} URLs from ${message.author.tag}`
          );

          // Scan each URL (Event Router will handle notifications)
          for (const url of urls) {
            try {
              await suslink.scanUrl(url, message.author.id);
            } catch (error) {
              console.error('[Bot] Auto-scan error:', error);
            }
          }
        }
      });
    }

    console.log('[EventHandler] Discord events registered');
  }

  /**
   * Subscribe to Event Router events
   */
  subscribeToEvents(): void {
    // Subscribe to link flagged events (high-risk links)
    eventRouter.subscribe(
      'link.flagged',
      async (event) => {
        const { url, riskLevel } = event.data;
        
        console.log(
          `[EventHandler] High-risk link flagged: ${url} (${riskLevel})`
        );

        // In production, you might want to:
        // 1. Notify moderators in a specific channel
        // 2. Log to a database
        // 3. Take automatic action (delete message, warn user, etc.)
        
        // For now, just log it
        // TODO: Implement mod notification system
      },
      'discord-bot'
    );

    console.log('[EventHandler] Event Router subscriptions registered');
  }
}
