// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
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
    .setDescription('Save your state and topic so TiltCheck stops guessing the rules.')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addStringOption((opt) =>
      opt
        .setName('state')
        .setDescription('Two-letter US state code, e.g., NJ')
        .setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName('topic')
        .setDescription('What kind of rules you want loaded')
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
        .setDescription('Wipe your saved state/topic context')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const shouldClear = interaction.options.getBoolean('clear') ?? false;

    if (shouldClear) {
      clearUserTiltAgentContext(interaction.user.id);
      await interaction.reply({
        content: 'Context wiped. TiltCheck stops doing state-specific rule reads until you set it again.',
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
          content: 'No context saved. Run /session state whenever you want the rulebook dialed in.',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `Current context locked: state=${current.stateCode ?? 'unset'}, topic=${current.regulationTopic ?? 'igaming'}.`,
        ephemeral: true,
      });
      return;
    }

    const nextState = (stateInput ?? current?.stateCode ?? '').trim().toUpperCase();
    const nextTopic = (topicInput ?? current?.regulationTopic ?? 'igaming').trim().toLowerCase();

    if (!nextState || !VALID_STATES.has(nextState)) {
      await interaction.reply({
        content: `State code is missing or busted: ${nextState || '(empty)'}. Use something real like NJ, NY, or CA.`,
        ephemeral: true,
      });
      return;
    }

    if (!VALID_TOPICS.has(nextTopic)) {
      await interaction.reply({
        content: `Topic is off: ${nextTopic}. Use igaming, sportsbook, or sweepstakes.`,
        ephemeral: true,
      });
      return;
    }

    const saved = setUserTiltAgentContext(interaction.user.id, {
      stateCode: nextState,
      regulationTopic: nextTopic,
    });

    await interaction.reply({
      content: `Context saved: state=${saved.stateCode}, topic=${saved.regulationTopic}. TiltCheck now reads that lane by default.`,
      ephemeral: true,
    });
  },
};

