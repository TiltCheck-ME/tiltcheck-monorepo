/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * LockVault Portal Command
 * Secure the bag on the dashboard.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const lockvault: Command = {
  data: new SlashCommandBuilder()
    .setName('lockvault')
    .setDescription('[PROFIT LOCKER] Portal to the Edge Equalizer dashboard to time-lock your bag.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('🔒 [PROFIT LOCKER] PROTOCOL')
      .setDescription(`**WE DO NOT CUSTODY YOUR FUNDS.** YOUR KEYS, YOUR PROBLEM.

Use the Edge Equalizer Dashboard to create and sign non-custodial time-locked vaults. 

**[SECURE THE BAG]** once you hit your goal. The dashboard will generate the transaction for you to sign in your wallet.`)
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png')
      .setFooter({ text: 'TiltCheck: AUDIT INTEGRITY - 100% NON-CUSTODIAL' });

    const portalBtn = new ButtonBuilder()
      .setLabel('[LAUNCH PORTAL]')
      .setStyle(ButtonStyle.Link)
      .setURL('https://tiltcheck.me/dashboard/vaults');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(portalBtn);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};