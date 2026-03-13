/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import {
  ChatInputCommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from 'discord.js';
import type { Command } from '../types.js';
import {
  clearUserTiltAgentContext,
  getUserTiltAgentContext,
  setUserTiltAgentContext,
} from '../services/tilt-agent.js';

const VALID_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]);

const VALID_TOPICS = new Set(['igaming', 'sportsbook', 'sweepstakes']);

export const setstate: Command = {
  data: new SlashCommandBuilder()
    .setName('setstate')
    .setDescription('Set your state so we can tell you what you\'re allowed to lose money on.')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addStringOption((opt) =>
      opt
        .setName('state')
        .setDescription('Your two-letter state code. Don\'t f*** it up. (e.g., NJ, NY, CA)')
        .setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName('topic')
        .setDescription('What\'s your poison? iGaming, Sportsbook, or Sweepstakes?')
        .addChoices(
          { name: 'iGaming', value: 'igaming' },
          { name: 'Sportsbook', value: 'sportsbook' },
          { name: 'Sweepstakes', value: 'sweepstakes' },
        )
        .setRequired(false),
    )
    .addBooleanOption((opt) =>
      opt
        .setName('clear')
        .setDescription('Nuke your saved state/topic context.')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const shouldClear = interaction.options.getBoolean('clear') ?? false;

    if (shouldClear) {
      clearUserTiltAgentContext(interaction.user.id);
      await interaction.reply({
        content: 'Context nuked. We\'ll stop judging you by your state.',
        ephemeral: true,
      });
      return;
    }

    const current = getUserTiltAgentContext(interaction.user.id);
    const stateInput = interaction.options.getString('state');
    const topicInput = interaction.options.getString('topic');

    if (!stateInput && !topicInput) {
      if (!current) {
        await interaction.reply({
          content: 'You haven\'t told us where you live. We\'re not tracking you... yet. Set a state if you want regulation-specific info.',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `Current context: state=${current.stateCode ?? 'unset'}, topic=${current.regulationTopic ?? 'igaming'}. This is how the system judges you.`,
        ephemeral: true,
      });
      return;
    }

    const nextState = (stateInput ?? current?.stateCode ?? '').trim().toUpperCase();
    const nextTopic = (topicInput ?? current?.regulationTopic ?? 'igaming').trim().toLowerCase();

    if (!nextState || !VALID_STATES.has(nextState)) {
      await interaction.reply({
        content: `We use two-letter state codes here, chief. You entered '${nextState || 'nothing'}'. Pretty sure that's not one of them. Try NJ, NY, CA... you get it.`,
        ephemeral: true,
      });
      return;
    }

    if (!VALID_TOPICS.has(nextTopic)) {
      await interaction.reply({
        content: `That's not a topic we track. Stick to 'igaming', 'sportsbook', or 'sweepstakes'. Let's not get creative.`,
        ephemeral: true,
      });
      return;
    }

    const saved = setUserTiltAgentContext(interaction.user.id, {
      stateCode: nextState,
      regulationTopic: nextTopic,
    });

    await interaction.reply({
      content: `Context saved. We now know where you live. state=${saved.stateCode}, topic=${saved.regulationTopic}.`,
      ephemeral: true,
    });
  },
};

