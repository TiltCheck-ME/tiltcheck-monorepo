// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const terms: Command = {
  data: new SlashCommandBuilder()
    .setName('terms')
    .setDescription('View TiltCheck legal documents and policies'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('LEGAL DOCS')
      .setDescription('By using TiltCheck you agree to these documents. Read them.')
      .addFields(
        { name: 'Terms of Service', value: '[Read Terms](https://tiltcheck.me/terms)\n- 18+ required\n- Tips are non-refundable\n- AS-IS service' },
        { name: 'Privacy Policy', value: '[Read Privacy](https://tiltcheck.me/privacy)\n- Non-custodial wallets only\n- Minimal logs (7 days)\n- No data selling' },
        { name: 'Acceptance', value: 'Terms are accepted during onboarding. Run `/start` to go through it again.' },
        { name: 'Contact', value: 'privacy@tiltcheck.me | legal@tiltcheck.me' }
      )
      .setColor(0x22d3a6)
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
