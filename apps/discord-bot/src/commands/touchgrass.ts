// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
/**
 * /touchgrass — 24-hour emergency session lockout
 * User-triggered break-glass button. Locks all TiltCheck interactions for 24hrs.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';
import type { Command } from '../types.js';

const API_BASE = process.env.API_BASE_URL || 'https://api.tiltcheck.me';

export const touchgrass: Command = {
  data: new SlashCommandBuilder()
    .setName('touchgrass')
    .setDescription('Activate a 24-hour emergency session lockout. You will be blocked from all TiltCheck activity.'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    let lockoutUntil: string | null = null;
    let success = false;

    try {
      const res = await fetch(`${API_BASE}/safety/touchgrass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: interaction.user.id }),
      });
      if (res.ok) {
        const data = await res.json() as { lockedUntil?: string };
        lockoutUntil = data.lockedUntil ?? null;
        success = true;
      }
    } catch {
      // API unreachable — still confirm to user (log for ops)
      console.warn('[TouchGrass] API call failed for', interaction.user.id);
    }

    const lockoutDisplay = lockoutUntil
      ? `<t:${Math.floor(new Date(lockoutUntil).getTime() / 1000)}:R>`
      : 'in 24 hours';

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(success ? 'TOUCH GRASS MODE: ACTIVE' : 'TOUCH GRASS ACTIVATED (OFFLINE)')
      .setDescription(
        `**${interaction.user.username}** — 24-hour lockout engaged.\n\n` +
        `Your TiltCheck session is paused. No vault actions, no session tracking, no audit commands.\n\n` +
        `**Lockout expires:** ${lockoutDisplay}\n\n` +
        `You did the right thing. The math will still be here when you get back. ` +
        `Go drink water. The casino does not close. Come back with a clear head.`
      )
      .addFields(
        { name: 'Status', value: 'LOCKED', inline: true },
        { name: 'Duration', value: '24 hours', inline: true },
        { name: 'Override?', value: 'No. That is the point.', inline: true },
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const resourcesBtn = new ButtonBuilder()
      .setLabel('Responsible Gambling Resources')
      .setStyle(ButtonStyle.Link)
      .setURL('https://tiltcheck.me/touch-grass');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(resourcesBtn);

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
