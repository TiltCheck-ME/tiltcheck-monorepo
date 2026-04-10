// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// DAD Bot — Event Handler

import { Client, Events, Interaction, ButtonInteraction } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import type { CommandHandler } from './commands.js';
import { checkAndOnboard, needsOnboarding } from './onboarding.js';
import { handleCommandError } from './error.js';
import { dispatchButtonInteraction } from './button-handlers.js';
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
      if (interaction.isButton()) {
        await this.handleButtonInteraction(interaction);
        return;
      }

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

    console.log('[EventHandler] Discord events registered');
  }

  private async handleButtonInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;

    try {
      const handled = await dispatchButtonInteraction(customId, interaction as ButtonInteraction);
      if (handled) return;
    } catch (error) {
      console.error('[EventHandler] Button handler error:', error);
      const btnInteraction = interaction as ButtonInteraction;
      await btnInteraction.reply({
        content: `Failed to process button action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true
      });
      return;
    }

    const btnInteraction = interaction as ButtonInteraction;
    await btnInteraction.reply({ content: 'Unknown button action.', ephemeral: true });
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
      'dad'
    );

    console.log('[EventHandler] Event Router subscriptions active');
  }
}
