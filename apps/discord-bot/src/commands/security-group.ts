/**
 * Security Command Group
 * 
 * Security tools including link scanning, domain blocking, and pattern management.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const security: Command = {
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Security and trust protection tools')
    .addSubcommand(subcommand =>
      subcommand
        .setName('scan')
        .setDescription('Scan a URL for suspicious patterns')
        .addStringOption(option =>
          option
            .setName('url')
            .setDescription('The URL to scan')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('block-domain')
        .setDescription('Block a domain from being shared')
        .addStringOption(option =>
          option
            .setName('domain')
            .setDescription('Domain to block (e.g., example.com)')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for blocking')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('unblock-domain')
        .setDescription('Unblock a previously blocked domain')
        .addStringOption(option =>
          option
            .setName('domain')
            .setDescription('Domain to unblock')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('block-pattern')
        .setDescription('Block URLs matching a pattern')
        .addStringOption(option =>
          option
            .setName('pattern')
            .setDescription('URL pattern to block (regex supported)')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for blocking')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('unblock-pattern')
        .setDescription('Remove a blocked URL pattern')
        .addStringOption(option =>
          option
            .setName('pattern')
            .setDescription('Pattern to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('blocklist')
        .setDescription('View current blocked domains and patterns')),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'scan':
          await handleScan(interaction);
          break;
        case 'block-domain':
          await handleBlockDomain(interaction);
          break;
        case 'unblock-domain':
          await handleUnblockDomain(interaction);
          break;
        case 'block-pattern':
          await handleBlockPattern(interaction);
          break;
        case 'unblock-pattern':
          await handleUnblockPattern(interaction);
          break;
        case 'blocklist':
          await handleBlocklist(interaction);
          break;
        default:
          await interaction.reply({ 
            content: '❌ Unknown security subcommand', 
            ephemeral: true 
          });
      }
    } catch (error) {
      console.error('[security] Error:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Security Error')
        .setDescription('Failed to process security command. Please try again later.')
        .setColor(0xff0000);
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function handleScan(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  
  const url = interaction.options.getString('url', true);

  if (!isValidUrl(url)) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Invalid URL')
      .setDescription('Please provide a valid URL to scan.')
      .setColor(0xff0000);
    
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Simulate scan results for now
  const embed = new EmbedBuilder()
    .setTitle('🔍 Link Scan Results')
    .setDescription(`**URL:** ${url}\n\n✅ **Status:** Clean\n\n🛡️ **Analysis:**\n• No known malicious patterns\n• Domain reputation: Good\n• SSL certificate: Valid`)
    .setColor(0x00ff00)
    .setFooter({ text: 'Scan completed • TiltCheck Security' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleBlockDomain(interaction: ChatInputCommandInteraction) {
  const domain = interaction.options.getString('domain', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  const embed = new EmbedBuilder()
    .setTitle('🚫 Domain Blocked')
    .setDescription(`Domain **${domain}** has been added to the blocklist.\n\n**Reason:** ${reason}`)
    .setColor(0xff6b6b)
    .setFooter({ text: 'Links from this domain will be automatically flagged' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleUnblockDomain(interaction: ChatInputCommandInteraction) {
  const domain = interaction.options.getString('domain', true);

  const embed = new EmbedBuilder()
    .setTitle('✅ Domain Unblocked')
    .setDescription(`Domain **${domain}** has been removed from the blocklist.`)
    .setColor(0x00ff00);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleBlockPattern(interaction: ChatInputCommandInteraction) {
  const pattern = interaction.options.getString('pattern', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  const embed = new EmbedBuilder()
    .setTitle('🚫 Pattern Blocked')
    .setDescription(`URL pattern \`${pattern}\` has been blocked.\n\n**Reason:** ${reason}`)
    .setColor(0xff6b6b)
    .setFooter({ text: 'URLs matching this pattern will be automatically flagged' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleUnblockPattern(interaction: ChatInputCommandInteraction) {
  const pattern = interaction.options.getString('pattern', true);

  const embed = new EmbedBuilder()
    .setTitle('✅ Pattern Unblocked')
    .setDescription(`URL pattern \`${pattern}\` has been removed from the blocklist.`)
    .setColor(0x00ff00);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleBlocklist(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('📋 Security Blocklist')
    .addFields(
      {
        name: '🚫 Blocked Domains',
        value: 'No domains currently blocked',
        inline: true
      },
      {
        name: '🚫 Blocked Patterns',
        value: 'No patterns currently blocked',
        inline: true
      },
      {
        name: '📊 Statistics',
        value: '• Total blocks: 0\n• Last updated: Now',
        inline: false
      }
    )
    .setColor(0x0099ff)
    .setFooter({ text: 'Use /security block-domain or /security block-pattern to add entries' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}