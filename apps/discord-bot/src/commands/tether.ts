/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Tether Accountability Command
 * Manage your safety line to other users.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { db } from '@tiltcheck/database'; // Assuming DB handle exists

export const tether: Command = {
  data: new SlashCommandBuilder()
    .setName('tether')
    .setDescription('[SAFETY LINE] Link to an accountability partner to monitor your session.')
    .addSubcommand(sub =>
      sub.setName('link')
        .setDescription('Tether to a partner now.')
        .addUserOption(opt => opt.setName('user').setDescription('The user who will receive your alerts').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('unlink')
        .setDescription('Cut the safety line.')
        .addUserOption(opt => opt.setName('user').setDescription('The partner to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Audit your current safety network.')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setColor(0x00CED1)
      .setTimestamp();

    try {
      if (sub === 'link' && targetUser) {
        if (targetUser.id === interaction.user.id) {
          await interaction.reply({ content: 'You can\'t tether to yourself. Go touch grass.', ephemeral: true });
          return;
        }

        // 1. Database Update (Mocking the call for now, assume this logic exists)
        // await db.addTether(interaction.user.id, targetUser.id);
        
        embed.setTitle('🔗 TETHER INITIALIZED')
          .setDescription(`**${targetUser.username}** is now your accountability partner.\n\n[EDGE EQUALIZER] When telemetry goes red, they will be notified to intervene and audit your head.`)
          .setFooter({ text: 'TiltCheck: THE RELUCTANT BABYSITTER' });

        await interaction.reply({ embeds: [embed] });

      } else if (sub === 'unlink' && targetUser) {
        // await db.removeTether(interaction.user.id, targetUser.id);
        
        embed.setTitle('✂️ TETHER TERMINATED')
          .setColor(0xFF4500)
          .setDescription(`Safety line to **${targetUser.username}** has been cut.\n\nYou're on your own now. Audit your sessions carefully.`)
          .setFooter({ text: 'TiltCheck: AUDIT INTEGRITY AT RISK' });

        await interaction.reply({ embeds: [embed] });

      } else if (sub === 'status') {
        // const partners = await db.getTethers(interaction.user.id);
        const partners = ['No partners linked.']; // Placeholder
        
        embed.setTitle('📡 THE TETHER AUDIT')
          .setDescription(`**Active Safety Partners:**\n${partners.map(p => `• ${p}`).join('\n')}\n\n[PROFIT GUARD] If you spiral, these users will be moved to VC with you.`)
          .setFooter({ text: 'Audit your head mid-session.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `[!] Tether action failed: ${(err as Error).message}`, ephemeral: true });
    }
  },
};
