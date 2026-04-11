// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * LockVault Portal Command
 * Link to the dashboard vault feature.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const lockvault: Command = {
  data: new SlashCommandBuilder()
    .setName('lockvault')
    .setDescription('Lock in your profit on the dashboard before you give it back.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('LOCK YOUR BAG')
      .setDescription(
        `You hit your number. Now lock it.\n\n` +
        `The dashboard lets you time-lock profits so future-you cannot undo what current-you earned.\n\n` +
        `No custodial nonsense. You sign the transaction in your own wallet. We hold the math.`
      )
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png')
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const portalBtn = new ButtonBuilder()
      .setLabel('Open Vault Dashboard')
      .setStyle(ButtonStyle.Link)
      .setURL('https://hub.tiltcheck.me');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(portalBtn);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};