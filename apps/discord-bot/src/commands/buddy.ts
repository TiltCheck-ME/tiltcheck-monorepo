// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
/**
 * Buddy Accountability Command
 * Quick-link accountability coverage without pretending Discord is the roster manager.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { Command } from '../types.js';
import { getUserBuddies, insert } from '@tiltcheck/db';

function getDashboardBaseUrl(): string {
  const configuredUrl = process.env.DASHBOARD_URL?.trim();
  if (configuredUrl && /^https?:\/\//i.test(configuredUrl)) {
    return configuredUrl.replace(/\/+$/, '');
  }

  return 'https://dashboard.tiltcheck.me';
}

function buildBuddyControlsRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Open Buddy Controls')
      .setStyle(ButtonStyle.Link)
      .setURL(`${getDashboardBaseUrl()}/dashboard?tab=buddies`)
  );
}

export const buddy: Command = {
  data: new SlashCommandBuilder()
    .setName('buddy')
    .setDescription('Set who gets the "this degen is spiraling" ping.')
    .addSubcommand(sub =>
      sub.setName('link')
        .setDescription('Add a session accountability buddy.')
        .addUserOption(opt => opt.setName('user').setDescription('User who gets the red-flag ping').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('unlink')
        .setDescription('Open dashboard buddy controls for removals and full roster management.')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('See who gets called when your session goes sideways.')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTimestamp();

    try {
      if (sub === 'link' && targetUser) {
        if (targetUser.id === interaction.user.id) {
          await interaction.reply({ content: 'You cannot buddy yourself. Even you should not trust you that much.', ephemeral: true });
          return;
        }

        await insert('user_buddies', {
          user_id: interaction.user.id,
          buddy_id: targetUser.id,
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        embed.setTitle('BUDDY LINKED')
          .setDescription(`**${targetUser.username}** is now in the loop.\n\nDiscord handled the quick link. The dashboard owns roster cleanup, pending approvals, and the full buddy view. TiltCheck does not share your balance, wins, or wallet details.`)
          .setFooter({ text: 'Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed], components: [buildBuddyControlsRow()] });

      } else if (sub === 'unlink') {
        embed.setTitle('DASHBOARD-OWNED')
          .setColor(0xf59e0b)
          .setDescription('Discord is not the buddy roster manager anymore.\n\nUse the dashboard buddy controls for removals, approvals, and roster cleanup.')
          .setFooter({ text: 'Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed], components: [buildBuddyControlsRow()], ephemeral: true });

      } else if (sub === 'status') {
        const partners = await getUserBuddies(interaction.user.id);

        embed.setTitle('BUDDY NETWORK')
          .setDescription(
            partners.length > 0
              ? `**Active Safety Partners (${partners.length}):**\n${partners.map(p => `- <@${p.buddy_id}>`).join('\n')}\n\nIf you spiral, these people get a support-only ping while TiltCheck handles your DM and optional voice shove. No balance, winnings, or wallet details get shared.\n\nDashboard buddy controls own approvals, removals, and the full roster.`
              : 'No safety partners linked.\n\nRun `/buddy link user:@someone` for a quick add, then use dashboard buddy controls for the full setup.'
          )
          .setFooter({ text: 'Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed], components: [buildBuddyControlsRow()], ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `Buddy wiring failed: ${(err as Error).message}`, ephemeral: true });
    }
  },
};
