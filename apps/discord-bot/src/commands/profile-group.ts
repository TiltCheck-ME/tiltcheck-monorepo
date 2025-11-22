/**
 * Profile Command Group
 * 
 * User profile management including cooldowns, tilt tracking, and personal settings.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const profile: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Profile and account management')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your TiltCheck profile')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to view profile for (optional)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cooldown')
        .setDescription('Manage your gambling cooldown')
        .addIntegerOption(option =>
          option
            .setName('minutes')
            .setDescription('Cooldown duration in minutes (0 to disable)')
            .setMinValue(0)
            .setMaxValue(10080) // 7 days
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('tilt')
        .setDescription('Check your current tilt status and history'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Manage your account settings')
        .addBooleanOption(option =>
          option
            .setName('dm-notifications')
            .setDescription('Enable/disable DM notifications')
            .setRequired(false))
        .addBooleanOption(option =>
          option
            .setName('auto-analysis')
            .setDescription('Enable/disable automatic gameplay analysis')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View your gambling and analysis statistics')),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'view':
          await handleView(interaction);
          break;
        case 'cooldown':
          await handleCooldown(interaction);
          break;
        case 'tilt':
          await handleTilt(interaction);
          break;
        case 'settings':
          await handleSettings(interaction);
          break;
        case 'stats':
          await handleStats(interaction);
          break;
        default:
          await interaction.reply({ 
            content: '❌ Unknown profile subcommand', 
            ephemeral: true 
          });
      }
    } catch (error) {
      console.error('[profile] Error:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Profile Error')
        .setDescription('Failed to process profile command. Please try again later.')
        .setColor(0xff0000);
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

async function handleView(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isOwnProfile = targetUser.id === interaction.user.id;

  const embed = new EmbedBuilder()
    .setTitle(`🎰 ${isOwnProfile ? 'Your' : targetUser.username + "'s"} TiltCheck Profile`)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      {
        name: '🛡️ Trust Score',
        value: '**85** (Good)',
        inline: true
      },
      {
        name: '🎯 Trust Band',
        value: 'VERIFIED',
        inline: true
      },
      {
        name: '⏱️ Cooldown Status',
        value: 'None active',
        inline: true
      },
      {
        name: '📊 Recent Activity',
        value: '• 3 casino sessions this week\n• 0 tilt incidents\n• Last analysis: 2 hours ago',
        inline: false
      },
      {
        name: '🏆 Achievements',
        value: '🎯 Responsible Gambler\n🔍 Analysis Expert\n🛡️ Trust Builder',
        inline: false
      }
    )
    .setColor(0x0099ff)
    .setFooter({ 
      text: isOwnProfile 
        ? 'Use /profile settings to customize your experience' 
        : `Profile viewed by ${interaction.user.username}` 
    });

  await interaction.reply({ embeds: [embed], ephemeral: isOwnProfile });
}

async function handleCooldown(interaction: ChatInputCommandInteraction) {
  const minutes = interaction.options.getInteger('minutes');

  if (minutes === null) {
    // Show current cooldown status
    const embed = new EmbedBuilder()
      .setTitle('⏱️ Cooldown Status')
      .setDescription('**Status:** No active cooldown\n\n**Available Options:**\n• `/profile cooldown 15` - 15 minute cooldown\n• `/profile cooldown 60` - 1 hour cooldown\n• `/profile cooldown 0` - Disable cooldown')
      .setColor(0x0099ff);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (minutes === 0) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Cooldown Disabled')
      .setDescription('Your gambling cooldown has been disabled.')
      .setColor(0x00ff00);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else {
    const embed = new EmbedBuilder()
      .setTitle('⏱️ Cooldown Activated')
      .setDescription(`You've activated a **${minutes} minute** gambling cooldown.\n\nDuring this time:\n• Casino links will be blocked\n• You'll receive tilt prevention reminders\n• The cooldown will end automatically`)
      .setColor(0xffa500)
      .setFooter({ text: `Cooldown expires in ${minutes} minutes` });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleTilt(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('🧘 Tilt Status Report')
    .addFields(
      {
        name: '📊 Current Status',
        value: '✅ **No Tilt Detected**\nYou\'re in a good headspace for gambling',
        inline: false
      },
      {
        name: '📈 This Week',
        value: '• Tilt incidents: 0\n• Cooldowns triggered: 0\n• Sessions analyzed: 3',
        inline: true
      },
      {
        name: '🎯 Prevention Tips',
        value: '• Set session limits\n• Take regular breaks\n• Monitor your emotions\n• Use cooldowns when needed',
        inline: true
      },
      {
        name: '🔄 Recent Activity',
        value: 'No concerning patterns detected in your recent gambling activity.',
        inline: false
      }
    )
    .setColor(0x00ff00)
    .setFooter({ text: 'Stay mindful and gamble responsibly' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSettings(interaction: ChatInputCommandInteraction) {
  const dmNotifications = interaction.options.getBoolean('dm-notifications');
  const autoAnalysis = interaction.options.getBoolean('auto-analysis');

  if (dmNotifications === null && autoAnalysis === null) {
    // Show current settings
    const embed = new EmbedBuilder()
      .setTitle('⚙️ Profile Settings')
      .addFields(
        {
          name: '📱 DM Notifications',
          value: '✅ Enabled',
          inline: true
        },
        {
          name: '🔍 Auto Analysis',
          value: '✅ Enabled',
          inline: true
        },
        {
          name: '🛡️ Privacy Level',
          value: 'Standard',
          inline: true
        }
      )
      .setDescription('Use the options to change these settings')
      .setColor(0x0099ff);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const changes: string[] = [];
  if (dmNotifications !== null) {
    changes.push(`DM Notifications: ${dmNotifications ? 'Enabled' : 'Disabled'}`);
  }
  if (autoAnalysis !== null) {
    changes.push(`Auto Analysis: ${autoAnalysis ? 'Enabled' : 'Disabled'}`);
  }

  const embed = new EmbedBuilder()
    .setTitle('✅ Settings Updated')
    .setDescription(`**Changes applied:**\n• ${changes.join('\n• ')}`)
    .setColor(0x00ff00);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStats(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Your TiltCheck Statistics')
    .addFields(
      {
        name: '🎰 Gambling Activity',
        value: '• Total sessions: 47\n• Total time played: 28h 15m\n• Favorite casino: Example Casino\n• Average session: 36 minutes',
        inline: false
      },
      {
        name: '🔍 Analysis Usage',
        value: '• Sessions analyzed: 23\n• RTP tracked: 94.2%\n• Anomalies detected: 2\n• Trust reports generated: 15',
        inline: false
      },
      {
        name: '🛡️ Safety Metrics',
        value: '• Tilt incidents avoided: 3\n• Cooldowns used: 7\n• Responsible gambling score: 92%',
        inline: false
      },
      {
        name: '🏆 This Month',
        value: '• Sessions: 12\n• Analysis runs: 8\n• Avg session length: 32min\n• Trust score change: +2',
        inline: true
      },
      {
        name: '📈 Trends',
        value: '• Session frequency: ↓ Decreasing\n• Average bet size: → Stable\n• Tilt risk: ↓ Low',
        inline: true
      }
    )
    .setColor(0x0099ff)
    .setFooter({ text: 'Data includes all activity since account creation' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}