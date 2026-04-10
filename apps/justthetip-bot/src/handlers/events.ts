// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// JustTheTip Bot — Event Handler

import { Client, Events } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import type { CommandHandler } from './commands.js';
import { checkAndOnboard, needsOnboarding } from './onboarding.js';
import { handleCommandError } from './error.js';
import type { TiltCheckEvent } from '@tiltcheck/types';

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

    this.client.on(Events.GuildMemberAdd, async (member) => {
      if (member.user.bot) return;

      if (needsOnboarding(member.user.id)) {
        checkAndOnboard(member.user).catch(err => {
          console.error('[Bot] Failed to send welcome DM to new member:', err);
        });
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      if (needsOnboarding(interaction.user.id)) {
        checkAndOnboard(interaction.user).catch(err => {
          console.error('[Bot] Failed to send welcome DM:', err);
        });
      }

      const command = this.commandHandler.getCommand(interaction.commandName);
      if (!command) {
        console.warn(`[Bot] Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
        console.log(`[Bot] ${interaction.user.tag} used /${interaction.commandName}`);
      } catch (error) {
        await handleCommandError(error, interaction);
      }
    });

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      const isDM = !message.guildId;

      if (isDM) {
        await message.reply('Use slash commands to interact with JustTheTip. Try `/help`.').catch(() => {});
      }
    });

    console.log('[EventHandler] Discord events registered');
  }

  subscribeToEvents(): void {
    eventRouter.subscribe(
      'user.discord_linked',
      async (event: TiltCheckEvent<'user.discord_linked'>) => {
        try {
          const { discordId } = event.data;
          const user = await this.client.users.fetch(discordId);
          if (user && needsOnboarding(user.id)) {
            checkAndOnboard(user).catch(err => {
              console.error('[Bot] Failed to send welcome DM on link:', err);
            });
          }
        } catch (error) {
          console.error('[Bot] Error handling user.discord_linked:', error);
        }
      },
      'justthetip'
    );

    console.log('[EventHandler] Event Router subscriptions active');
  }
}
