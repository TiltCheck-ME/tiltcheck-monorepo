// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

const OWNER_ID = process.env.BOT_OWNER_ID || '1472601571496951932';

export const support: Command = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Something busted? Send the report without the corporate ticket dance.')
    .addStringOption(option =>
      option.setName('topic').setDescription('What broke?').setRequired(false)
    )
    .addStringOption(option =>
      option.setName('message').setDescription('Extra context so we are not guessing').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const topic = interaction.options.getString('topic') || 'General';
    const message = interaction.options.getString('message') || '';

    // Confirm to the user
    const userEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('SUPPORT REQUEST LOGGED')
      .setDescription(
        `Report logged.\n\n` +
        `**Topic:** ${topic}${message ? `\n**Details:** ${message}` : ''}\n\n` +
        `If it is on fire, yell in-server too so this does not rot in DMs.`
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [userEmbed], ephemeral: true });

    // DM the owner
    try {
      const owner = await interaction.client.users.fetch(OWNER_ID);
      await owner.send(
        `**Support Request** from ${interaction.user.username} (\`${interaction.user.id}\`)\n` +
        `**Topic:** ${topic}\n` +
        (message ? `**Message:** ${message}\n` : '') +
        `**Server:** ${interaction.guild?.name || 'DM'}`
      );
    } catch (err) {
      console.error('[Support] Failed to DM owner:', err);
    }
  },
};
