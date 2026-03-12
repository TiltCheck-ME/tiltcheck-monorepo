/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { db } from '@tiltcheck/database';
import { PublicKey } from '@solana/web3.js';

export const linkwallet: Command = {
  data: new SlashCommandBuilder()
    .setName('linkwallet')
    .setDescription('Link your Solana wallet address for payouts and juice drops')
    .addStringOption(opt =>
      opt
        .setName('address')
        .setDescription('Your Solana wallet address (e.g., Phantom, Trust, Solflare)')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const address = interaction.options.getString('address', true);

    // Validate Solana Address
    try {
      new PublicKey(address);
    } catch {
      await interaction.reply({ content: '❌ Invalid Solana address. Please check and try again.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (db.isConnected()) {
        await db.upsertDegenIdentity({
          discord_id: interaction.user.id,
          primary_external_address: address
        });

        const embed = new EmbedBuilder()
          .setColor(0x22d3a6)
          .setTitle('🔗 Wallet Linked')
          .setDescription(`Successfully linked your wallet to the TiltCheck Hub.\n\n**Address:** \`${address}\`\n\nYou are now ready to catch some juice! 🧃`)
          .setFooter({ text: 'Manage more settings at dashboard.tiltcheck.me' });

        await interaction.editReply({ embeds: [embed] });
      } else {
        throw new Error('Database connection failed');
      }
    } catch (error) {
      console.error('[LinkWallet] Error:', error);
      await interaction.editReply({ content: '❌ Failed to save wallet address. Please try again later.' });
    }
  },
};
