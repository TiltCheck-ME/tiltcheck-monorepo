/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { db } from '@tiltcheck/database';
import { PublicKey } from '@solana/web3.js';

export const linkwallet: Command = {
  data: new SlashCommandBuilder()
    .setName('linkwallet')
    .setDescription('Hook up your Solana wallet to cash out that sweet, sweet juice. Don't be a poor f***.') // MODIFIED
    .addStringOption(opt =>
      opt
        .setName('address')
        .setDescription('Your Solana wallet address. Phantom, Solflare, whatever. Just give me the damn address.') // MODIFIED
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const address = interaction.options.getString('address', true);

    // Validate Solana Address
    try {
      new PublicKey(address);
    } catch {
      await interaction.reply({ content: '❌ That's not a f***ing Solana address, degen. Try again. I ain't got all day.', ephemeral: true }); // MODIFIED
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
          .setTitle('🔗 Wallet Successfully Hooked Up!') // MODIFIED
          .setDescription(`Your wallet is now officially linked to the TiltCheck Hub. Congrats, you're one step closer to not being poor.

**Address:** `${address}`

You are now ready to catch some f***ing juice! 💸`) // MODIFIED
          .setFooter({ text: 'Manage more settings (or just stare at your address) at dashboard.tiltcheck.me' }); // MODIFIED

        await interaction.editReply({ embeds: [embed] });
      } else {
        throw new Error('Database connection failed');
      }
    } catch (error) {
      console.error('[LinkWallet] Error:', error);
      await interaction.editReply({ content: '❌ Well, sh**. Couldn't save your f***ing wallet address. Our systems are probably in the sh**ter. Try again later.' }); // MODIFIED
    }
  },
};
