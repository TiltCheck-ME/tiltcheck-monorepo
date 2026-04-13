// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
/**
 * Buddy Accountability Command
 * Manage your accountability buddy network.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { getUserBuddies, removeBuddy, insert } from '@tiltcheck/db';

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
        .setDescription('Cut a buddy loose.')
        .addUserOption(opt => opt.setName('user').setDescription('Buddy to remove').setRequired(true))
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
          .setDescription(`**${targetUser.username}** is now in the loop.\n\nWhen telemetry goes red, they get a support-only accountability ping. TiltCheck does not share your balance, wins, or wallet details.`)
          .setFooter({ text: 'Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed] });

      } else if (sub === 'unlink' && targetUser) {
        await removeBuddy(interaction.user.id, targetUser.id);

        embed.setTitle('BUDDY REMOVED')
          .setColor(0xef4444)
          .setDescription(`Safety line to **${targetUser.username}** cut.\n\nYou are raw-dogging accountability again. Try not to make that weird.`)
          .setFooter({ text: 'Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed] });

      } else if (sub === 'status') {
        const partners = await getUserBuddies(interaction.user.id);

        embed.setTitle('BUDDY NETWORK')
          .setDescription(
            partners.length > 0
              ? `**Active Safety Partners (${partners.length}):**\n${partners.map(p => `- <@${p.buddy_id}>`).join('\n')}\n\nIf you spiral, these people get a support-only ping while TiltCheck handles your DM and optional voice shove. No balance, winnings, or wallet details get shared.`
              : 'No safety partners linked.\n\nRun `/buddy link user:@someone` and give future-you at least one witness.'
          )
          .setFooter({ text: 'Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `Buddy wiring failed: ${(err as Error).message}`, ephemeral: true });
    }
  },
};
