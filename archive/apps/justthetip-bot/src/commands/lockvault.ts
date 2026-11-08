// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const lockvault: Command = {
  data: new SlashCommandBuilder()
    .setName('lockvault')
    .setDescription('Lock in your profit on the dashboard before you give it back.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('LOCK YOUR BAG')
      .setDescription(
        `You hit your number. Now lock it.\n\n` +
        `The dashboard lets you time-lock profits so your future self can't undo what your current self earned.\n\n` +
        `We don't touch your funds. You sign the transaction in your own wallet. We just hold the math.`
      )
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png')
      .setFooter({ text: 'Winning is easy. Keeping it is legendary.' });

    const portalBtn = new ButtonBuilder()
      .setLabel('Open Vault Dashboard')
      .setStyle(ButtonStyle.Link)
      .setURL('https://tiltcheck.me/dashboard');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(portalBtn);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
