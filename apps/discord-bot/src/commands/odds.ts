/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Edge Audit Command
 * Informational house edge data mid-session.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

interface GameData {
  edge: number;
  rtp: number;
  variance: 'low' | 'med' | 'high';
  notes: string;
}

const GAME_DB: Record<string, GameData> = {
  'stake-plinko-high': { edge: 1.0, rtp: 99.0, variance: 'high', notes: 'Classic rinse vibes. 1000x bucket is the mirage.' },
  'stake-plinko-med': { edge: 1.0, rtp: 99.0, variance: 'med', notes: 'Slow bleed. Watch your bet velocity.' },
  'slots-std': { edge: 4.0, rtp: 96.0, variance: 'high', notes: 'The house is printing. 4% bleed per spin.' },
  'keno-std': { edge: 1.0, rtp: 99.0, variance: 'med', notes: '1.0% Edge. You just clicked bet faster than the audit could run.' },
  'blackjack-pref': { edge: 0.5, rtp: 99.5, variance: 'low', notes: 'Mathlyzer favorite. Perfect play or get rinsing.' },
  'stake-chicken': { edge: 1.0, rtp: 99.0, variance: 'med', notes: 'GC & SC logic identical. Takes 10,000+ rounds to meaningfully verify the 99% audit claim.' },
  'stake-pump': { edge: 2.0, rtp: 98.0, variance: 'high', notes: 'Turn-based logic. 4 difficulties. Max win 3.2M x.' }
};

export const odds: Command = {
  data: new SlashCommandBuilder()
    .setName('odds')
    .setDescription('[EDGE AUDIT] The math says you lose. Check the RTP for any house game.')
    .addStringOption(opt => 
      opt.setName('game')
        .setDescription('Select the game to audit')
        .addChoices(
          { name: 'Plinko (High)', value: 'stake-plinko-high' },
          { name: 'Plinko (Med)', value: 'stake-plinko-med' },
          { name: 'Slots (Generic)', value: 'slots-std' },
          { name: 'Keno', value: 'keno-std' },
          { name: 'Blackjack (Perfect)', value: 'blackjack-pref' },
          { name: 'Chicken (Stake Original)', value: 'stake-chicken' },
          { name: 'Pump (Stake Original)', value: 'stake-pump' }
        )
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const gameKey = interaction.options.getString('game');
    const data = GAME_DB[gameKey || 'slots-std'];

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle(`📊 [EDGE AUDIT] ${gameKey?.toUpperCase()}`)
      .setTimestamp();

    if (data) {
      embed.setDescription(`**${data.rtp}% RTP** | **${data.edge}% HOUSE EDGE**`)
        .addFields(
          { name: 'Variance Profile', value: data.variance.toUpperCase(), inline: true },
          { name: 'The Audit Says', value: `*${data.notes}*`, inline: false }
        )
        .setFooter({ text: 'Edge Equalizer: THE MATH NEVER LIES.' });

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ content: 'GAME NOT IN THE AUDIT INDEX.', ephemeral: true });
    }
  },
};
