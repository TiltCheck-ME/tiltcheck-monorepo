import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { freespinscan } from '@tiltcheck/freespinscan';
import { successEmbed } from '@tiltcheck/discord-utils';

export const blockdomain = {
  data: new SlashCommandBuilder()
    .setName('blockdomain')
    .setDescription('Block a domain from promo submissions')
    .addStringOption(option =>
      option.setName('domain').setDescription('Domain to block').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const domain = interaction.options.getString('domain', true);
    freespinscan.blockDomain(domain);
    await interaction.reply({ embeds: [successEmbed('Domain blocked', domain)] });
  },
};

export const unblockdomain = {
  data: new SlashCommandBuilder()
    .setName('unblockdomain')
    .setDescription('Unblock a domain for promo submissions')
    .addStringOption(option =>
      option.setName('domain').setDescription('Domain to unblock').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const domain = interaction.options.getString('domain', true);
    freespinscan.unblockDomain(domain);
    await interaction.reply({ embeds: [successEmbed('Domain unblocked', domain)] });
  },
};

export const blockpattern = {
  data: new SlashCommandBuilder()
    .setName('blockpattern')
    .setDescription('Block a URL pattern from promo submissions')
    .addStringOption(option =>
      option.setName('pattern').setDescription('Pattern to block').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const pattern = interaction.options.getString('pattern', true);
    freespinscan.blockPattern(pattern);
    await interaction.reply({ embeds: [successEmbed('Pattern blocked', pattern)] });
  },
};

export const unblockpattern = {
  data: new SlashCommandBuilder()
    .setName('unblockpattern')
    .setDescription('Unblock a URL pattern for promo submissions')
    .addStringOption(option =>
      option.setName('pattern').setDescription('Pattern to unblock').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const pattern = interaction.options.getString('pattern', true);
    freespinscan.unblockPattern(pattern);
    await interaction.reply({ embeds: [successEmbed('Pattern unblocked', pattern)] });
  },
};
