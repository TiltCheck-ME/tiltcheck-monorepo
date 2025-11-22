import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { verifySessionToken } from '../session.js';
import type { Command } from '../types.js';

export const sessionverify: Command = {
  data: new SlashCommandBuilder()
    .setName('session-verify')
    .setDescription('Verify a gameplay analysis session token')
    .addStringOption(o => o.setName('token').setDescription('Raw session token JSON').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const raw = interaction.options.getString('token', true);
    try {
      const info = await verifySessionToken(raw);
      if (!info) {
        await interaction.reply({ content: '❌ Invalid or expired session token', ephemeral: true });
        return;
      }
      const remainingMs = info.expires - Date.now();
      const remainingMin = Math.max(0, Math.round(remainingMs / 60000));
      await interaction.reply({ content: `✅ Valid session\nID: ${info.sessionId}\nUser: ${info.userId}\nCasino: ${info.casinoId}\nExpires in ~${remainingMin}m`, ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: '❌ Failed to parse token', ephemeral: true });
    }
  }
};
