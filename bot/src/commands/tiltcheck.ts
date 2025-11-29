import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

export const tiltcheck: Command = {
  data: new SlashCommandBuilder()
    .setName('tiltcheck')
    .setDescription('Admin config and diagnostics')
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('View or update admin config')
        .addStringOption(opt =>
          opt.setName('key').setDescription('Config key').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('value').setDescription('New value').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('diagnostics')
        .setDescription('Show system diagnostics')
    )
    .addSubcommand(sub =>
      sub.setName('cooldown')
        .setDescription('Start a voluntary cooldown period')
        .addIntegerOption(opt =>
          opt.setName('duration').setDescription('Duration in minutes (default: 15)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('tilt')
        .setDescription('Check your tilt status and history')
        .addStringOption(opt =>
          opt.setName('action').setDescription('status or history').setRequired(true)
            .addChoices({ name: 'Status', value: 'status' }, { name: 'History', value: 'history' })
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'config') {
      const key = interaction.options.getString('key');
      const value = interaction.options.getString('value');
      await interaction.reply({ content: `Config command received. Key: ${key || '(none)'}, Value: ${value || '(none)'}`, ephemeral: true });
    } else if (subcommand === 'diagnostics') {
      await interaction.reply({ content: 'Diagnostics command received. (TODO: show system info)', ephemeral: true });
    } else if (subcommand === 'cooldown') {
      // Move cooldown logic here
      const duration = interaction.options.getInteger('duration') || 15;
      if (duration < 5 || duration > 1440) {
        await interaction.reply({ content: '❌ Duration must be between 5 and 1440 minutes (24 hours)', ephemeral: true });
        return;
      }
      // ...existing cooldown logic...
      await interaction.reply({ content: `Cooldown started for ${duration} minutes. (TODO: full logic)`, ephemeral: true });
    } else if (subcommand === 'tilt') {
      // Move tilt logic here
      const action = interaction.options.getString('action');
      await interaction.reply({ content: `Tilt command: ${action}. (TODO: full logic)`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};
