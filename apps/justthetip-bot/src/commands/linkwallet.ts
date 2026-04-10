// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

import { linkWalletToUser, findOrCreateUserByDiscord } from '@tiltcheck/db';
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

    try {
      new PublicKey(address);
    } catch {
      await interaction.reply({ content: '[!] Invalid Solana address. Please check and try again.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const discordUser = await findOrCreateUserByDiscord(
        interaction.user.id,
        interaction.user.username,
        interaction.user.displayAvatarURL()
      );

      await linkWalletToUser(discordUser.id, address);

      const embed = new EmbedBuilder()
        .setColor(0x22d3a6)
        .setTitle('Wallet Linked to Hub')
        .setDescription(`Successfully linked your wallet to the TiltCheck Truth Layer.\n\n**User:** \`${interaction.user.username}\`\n**Address:** \`${address.substring(0, 4)}...${address.substring(address.length - 4)}\`\n\nYou can now login to the Hub and see your real-time telemetry instantly.`)
        .setFooter({ text: 'Access the Hub at dashboard.tiltcheck.me' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[LinkWallet] Error:', error);
      await interaction.editReply({ content: '[!] Failed to save wallet address. Please try again later.' });
    }
  },
};
