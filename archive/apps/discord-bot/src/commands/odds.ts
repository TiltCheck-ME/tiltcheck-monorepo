// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

interface GameData {
  edge: number;
  rtp: number;
  variance: 'low' | 'med' | 'high';
  notes: string;
  maxWin?: string;
  maxWinOdds?: string;
}

const GAME_DB: Record<string, GameData> = {
  'stake-plinko-high': {
    edge: 1.0, rtp: 99.0, variance: 'high',
    notes: 'The 1000x bucket exists. So does a unicorn. You are statistically more likely to flip heads 17 times in a row.',
    maxWin: '1000x', maxWinOdds: '1 in ~1,000,000 per drop'
  },
  'stake-plinko-med': {
    edge: 1.0, rtp: 99.0, variance: 'med',
    notes: 'Slow bleed. The edge is small but the bet velocity is the knife. Watch your session length.'
  },
  'slots-std': {
    edge: 4.0, rtp: 96.0, variance: 'high',
    notes: 'Standard slots eat 4% per spin. At 100 spins, you\'ve statistically fed the machine 4x your starting bet just in edge alone.',
    maxWin: 'varies', maxWinOdds: 'jackpot: often 1 in 10M+'
  },
  'keno-std': {
    edge: 1.0, rtp: 99.0, variance: 'med',
    notes: 'Deceptively low edge. The trap is the pace — keno rounds are fast. You clicked bet faster than the audit could run.'
  },
  'blackjack-pref': {
    edge: 0.5, rtp: 99.5, variance: 'low',
    notes: 'Lowest edge in the house — but only with perfect play. One bad split and you\'ve handed the math back to the casino.',
    maxWin: '1.5x (Blackjack)', maxWinOdds: '~4.8% chance per hand'
  },
  'stake-chicken': {
    edge: 1.0, rtp: 99.0, variance: 'med',
    notes: 'GC and SC logic are identical. The "99% RTP" claim takes 10,000+ rounds to meaningfully verify. You are probably not playing 10,000 rounds.'
  },
  'stake-pump': {
    edge: 2.0, rtp: 98.0, variance: 'high',
    notes: '4 difficulties. Turn-based logic. The max multiplier is 3,200,000x on Expert.',
    maxWin: '3,200,000x on Expert', maxWinOdds: '1 in ~135,091,450 per turn'
  }
};

export const odds: Command = {
  data: new SlashCommandBuilder()
    .setName('odds')
    .setDescription('The math on any house game. RTP, edge, and what the max win actually costs you.')
    .addStringOption(opt =>
      opt.setName('game')
        .setDescription('Pick the game to audit')
        .addChoices(
          { name: 'Plinko High Risk (Stake)', value: 'stake-plinko-high' },
          { name: 'Plinko Medium Risk (Stake)', value: 'stake-plinko-med' },
          { name: 'Slots (Generic)', value: 'slots-std' },
          { name: 'Keno', value: 'keno-std' },
          { name: 'Blackjack (Perfect Play)', value: 'blackjack-pref' },
          { name: 'Chicken (Stake Original)', value: 'stake-chicken' },
          { name: 'Pump (Stake Original)', value: 'stake-pump' }
        )
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const gameKey = interaction.options.getString('game');
    const data = GAME_DB[gameKey || 'slots-std'];

    if (!data) {
      await interaction.reply({ content: 'That game isn\'t in the audit index yet.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(data.edge <= 1.0 ? 0x22d3a6 : data.edge <= 2.0 ? 0xf59e0b : 0xef4444)
      .setTitle(`HOUSE EDGE AUDIT`)
      .setDescription(`**${data.rtp}% RTP — ${data.edge}% house edge per round.**\n\n${data.notes}`)
      .setTimestamp();

    embed.addFields(
      { name: 'Variance', value: data.variance === 'high' ? 'High — big swings, long droughts' : data.variance === 'med' ? 'Medium — steady bleed' : 'Low — boring but survivable', inline: true },
      { name: 'Edge per 100 rounds', value: `~${(data.edge).toFixed(1)}% of total wagered gone to the house`, inline: true }
    );

    if (data.maxWin && data.maxWinOdds) {
      embed.addFields({ name: `Max Win: ${data.maxWin}`, value: `Odds: ${data.maxWinOdds}`, inline: false });
    }

    embed.setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed] });
  },
};
