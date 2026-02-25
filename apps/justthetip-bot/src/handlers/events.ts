/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Event Handler
 *
 * Manages Discord client events and credit system notifications.
 */

import { Client, Events } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckEvent } from '@tiltcheck/types';
import type { CommandHandler } from './commands.js';

export class EventHandler {
  constructor(
    private client: Client,
    private commandHandler: CommandHandler
  ) {}

  registerDiscordEvents(): void {
    this.client.once(Events.ClientReady, (client) => {
      console.log(`[Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command = this.commandHandler.getCommand(interaction.commandName);
        if (!command) {
          console.warn(`[Bot] Unknown command: ${interaction.commandName}`);
          return;
        }

        try {
          await command.execute(interaction);
          console.log(`[Bot] ${interaction.user.tag} used /${interaction.commandName}`);
        } catch (error) {
          console.error(`[Bot] Error executing ${interaction.commandName}:`, error);
          const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
          } else {
            await interaction.reply(errorMessage);
          }
        }
      }

      // Handle autocomplete
      if (interaction.isAutocomplete()) {
        const command = this.commandHandler.getCommand(interaction.commandName);
        if (command?.autocomplete) {
          try {
            await command.autocomplete(interaction);
          } catch (error) {
            console.error(`[Bot] Autocomplete error for ${interaction.commandName}:`, error);
          }
        }
      }
    });

    console.log('[EventHandler] Discord events registered');
  }

  subscribeToEvents(): void {
    // Credit deposit confirmed → DM user
    eventRouter.subscribe(
      'credit.deposited',
      async (event: TiltCheckEvent) => {
        const { discordId, amountLamports, newBalance } = event.data;
        try {
          const user = await this.client.users.fetch(discordId);
          const solAmount = (amountLamports / 1e9).toFixed(4);
          const balanceSol = (newBalance / 1e9).toFixed(4);
          await user.send(
            `**Deposit Confirmed**\n\n` +
            `+${solAmount} SOL deposited to your credit balance.\n` +
            `New balance: ${balanceSol} SOL\n\n` +
            `Use \`/tip send\` to tip or \`/tip withdraw\` to withdraw.`
          );
        } catch (err) {
          console.warn(`[EventHandler] Could not DM user ${discordId}:`, err);
        }
      },
      'justthetip'
    );

    // Pending tip created → DM recipient to register wallet
    eventRouter.subscribe(
      'credit.pending_tip_created',
      async (event: TiltCheckEvent) => {
        const { recipientId, amountLamports, senderId } = event.data;
        try {
          const user = await this.client.users.fetch(recipientId);
          const solAmount = (amountLamports / 1e9).toFixed(4);
          await user.send(
            `**You have a pending tip!**\n\n` +
            `<@${senderId}> sent you ${solAmount} SOL.\n\n` +
            `Register a wallet with \`/tip wallet register-external\` to claim it.\n` +
            `The tip expires in 7 days if unclaimed.`
          );
        } catch (err) {
          console.warn(`[EventHandler] Could not DM user ${recipientId}:`, err);
        }
      },
      'justthetip'
    );

    console.log('[EventHandler] Event Router subscriptions registered');
  }
}
