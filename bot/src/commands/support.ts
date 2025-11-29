import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

const SUPPORT_CHANNEL_ID = '1437295074856927363';
const OWNER_MENTION = '<@jmenichole>';

export const support: Command = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Request help from TiltCheck support'),

  async execute(interaction: ChatInputCommandInteraction) {
    // Send a message in the support channel pinging the owner
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }
    const channel = guild.channels.cache.get(SUPPORT_CHANNEL_ID);
    if (!channel || !('send' in channel)) {
      await interaction.reply({ content: '❌ Support channel not found.', ephemeral: true });
      return;
    }
    await (channel as any).send({ content: `🔔 Support requested by <@${interaction.user.id}> ${OWNER_MENTION}` });
    await interaction.reply({ content: '✅ Support request sent! Someone will be with you soon.', ephemeral: true });
  },
};
