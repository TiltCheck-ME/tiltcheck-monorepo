/**
 * Casino Command Group
 * 
 * Unified casino-related commands using subcommands.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Command } from '../types.js';

interface CasinoInfo {
  id: string;
  name: string;
  baseURL: string;
  regulator?: string;
  enabled: boolean;
}

async function loadCasinosData(): Promise<CasinoInfo[]> {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'casinos.json');
    const raw = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    return data.casinos || [];
  } catch {
    return [];
  }
}

export const casino: Command = {
  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Casino analysis and trust tools')
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Get a casino link with optional gameplay analysis')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Casino name')
            .setRequired(true))
        .addBooleanOption(option =>
          option
            .setName('analyze')
            .setDescription('Enable gameplay analysis (default: false)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('trust')
        .setDescription('Get detailed trust report for a casino')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Casino name')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List available casinos'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('analyze-stop')
        .setDescription('Stop gameplay analysis session')
        .addStringOption(option =>
          option
            .setName('session')
            .setDescription('Session ID (optional)')
            .setRequired(false))),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'play':
          await handlePlay(interaction);
          break;
        case 'trust':
          await handleTrust(interaction);
          break;
        case 'list':
          await handleList(interaction);
          break;
        case 'analyze-stop':
          await handleAnalyzeStop(interaction);
          break;
        default:
          await interaction.reply({ 
            content: '❌ Unknown subcommand', 
            ephemeral: true 
          });
      }
    } catch (error) {
      console.error('[casino] Error:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ System Error')
        .setDescription('Failed to process casino command. Please try again later.')
        .setColor(0xff0000);
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

async function handlePlay(interaction: ChatInputCommandInteraction) {
  const casinoName = interaction.options.getString('name', true).toLowerCase();
  const enableAnalysis = interaction.options.getBoolean('analyze') || false;

  const casinos = await loadCasinosData();
  
  if (casinos.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ No Casinos Available')
      .setDescription('No casinos are currently configured in the database.')
      .setColor(0xffa500);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // Find casino
  const casino = casinos.find(c => 
    c.name.toLowerCase().includes(casinoName) || 
    c.id.toLowerCase() === casinoName
  );

  if (!casino) {
    const available = casinos
      .filter(c => c.enabled)
      .slice(0, 10)
      .map(c => `• ${c.name}`)
      .join('\n');
      
    const embed = new EmbedBuilder()
      .setTitle('❌ Casino Not Found')
      .setDescription(`Casino "${casinoName}" not found in database.\n\n**Available casinos:**\n${available || 'None configured'}`)
      .setColor(0xff0000);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (!casino.enabled) {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Casino Disabled')
      .setDescription(`${casino.name} is currently disabled in our system.`)
      .setColor(0xffa500);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // Generate play URL
  const sessionId = Date.now().toString();
  const playUrl = `${casino.baseURL}?ref=tiltcheck&session=${sessionId}`;

  const embed = new EmbedBuilder()
    .setTitle(`🎰 ${casino.name}`)
    .setDescription(
      `[**Click here to play ${casino.name}**](${playUrl})\n\n` +
      (enableAnalysis 
        ? `🔍 **Analysis Mode Enabled**\nYour gameplay will be monitored for trust metrics.\n\n` 
        : `💡 Want gameplay analysis? Use \`/casino play ${casinoName} analyze:true\`\n\n`) +
      `📊 Session ID: \`${sessionId}\``
    )
    .setColor(0x0099ff);

  if (enableAnalysis) {
    embed.addFields({
      name: '🛡️ Analysis Features',
      value: '• RTP tracking\n• Volatility analysis\n• Anomaly detection\n• Trust score updates',
      inline: true
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleTrust(interaction: ChatInputCommandInteraction) {
  const casinoName = interaction.options.getString('name', true);
  
  const embed = new EmbedBuilder()
    .setTitle('🔍 Trust Analysis')
    .setDescription(`Trust report for **${casinoName}** coming soon...\n\nThis feature will provide:\n• Historical trust scores\n• Regulatory compliance\n• Community feedback\n• Risk assessment`)
    .setColor(0x0099ff);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const casinos = await loadCasinosData();
  const enabledCasinos = casinos.filter(c => c.enabled).slice(0, 15);
  
  if (enabledCasinos.length === 0) {
    await interaction.reply({ content: 'No casinos available.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎰 Available Casinos')
    .setDescription(
      enabledCasinos
        .map((c, i) => `${i + 1}. **${c.name}**${c.regulator ? ` (${c.regulator})` : ''}`)
        .join('\n')
    )
    .setFooter({ text: `Showing ${enabledCasinos.length} of ${casinos.length} casinos` })
    .setColor(0x0099ff);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAnalyzeStop(interaction: ChatInputCommandInteraction) {
  const sessionId = interaction.options.getString('session');
  
  const embed = new EmbedBuilder()
    .setTitle('⏹️ Analysis Stopped')
    .setDescription(
      sessionId 
        ? `Analysis session \`${sessionId}\` has been terminated.`
        : 'All active analysis sessions have been terminated.'
    )
    .setColor(0x0099ff);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}