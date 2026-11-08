// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { status } from './status.js';
import { goal } from './goal.js';
import { cooldown, tilt } from './cooldown.js';
import { intervene } from './intervene.js';
import { setstate } from './setstate.js';

export const session: Command = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Session controls, risk read, and rule context in one lane.')
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Fast read on your live risk state.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('history')
        .setDescription('See the last tilt flags and how fast you were moving.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('goal')
        .setDescription('Set the number where you cash out instead of punting it back.')
        .addIntegerOption((opt) =>
          opt.setName('starting_balance').setDescription('Starting bankroll in USD').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('redeem_point').setDescription('Cash-out number in USD').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('cooldown')
        .setDescription('Lock yourself out for a bit before the session gets stupid.')
        .addIntegerOption((opt) =>
          opt
            .setName('duration')
            .setDescription('Minutes to stay locked out (default: 15)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('intervene')
        .setDescription('Toggle the hard brake for critical tilt sessions.')
        .addBooleanOption((opt) =>
          opt
            .setName('enabled')
            .setDescription('Let TiltCheck move you into accountability VC on critical tilt.')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('state')
        .setDescription('Save your state and topic so TiltCheck stops guessing the rules.')
        .addStringOption((opt) =>
          opt
            .setName('state')
            .setDescription('Two-letter US state code, e.g., NJ')
            .setRequired(false)
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
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName('clear')
            .setDescription('Wipe your saved state/topic context')
            .setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'status':
        await status.execute(interaction);
        return;
      case 'history':
        await tilt.execute(interaction);
        return;
      case 'goal':
        await goal.execute(interaction);
        return;
      case 'cooldown':
        await cooldown.execute(interaction);
        return;
      case 'intervene':
        await intervene.execute(interaction);
        return;
      case 'state':
        await setstate.execute(interaction);
        return;
      default:
        await interaction.reply({
          content: 'Unknown session action. Try `/session status`.',
          ephemeral: true,
        });
    }
  },
};
