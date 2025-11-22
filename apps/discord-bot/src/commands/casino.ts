import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
// import { createEmbed, Colors } from '@tiltcheck/discord-utils';
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

export const play: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Get casino link with optional gameplay analysis setup')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Casino name (e.g., "crown coins", "stake", "rollbit")')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('analyze')
        .setDescription('Set up gameplay analysis session (default: false)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const casinoName = interaction.options.getString('name', true).toLowerCase().trim();
    const enableAnalysis = interaction.options.getBoolean('analyze') ?? false;
    
    try {
      const casinos = await loadCasinosData();
      
      // Find casino by ID or name (flexible matching)
      const casino = casinos.find(c => 
        c.id.toLowerCase() === casinoName ||
        c.id.toLowerCase() === casinoName.replace(/\s+/g, '-') ||
        c.id.toLowerCase() === casinoName.replace(/\s+/g, '') ||
        c.name.toLowerCase() === casinoName ||
        c.name.toLowerCase().includes(casinoName) ||
        casinoName.includes(c.name.toLowerCase().split(' ')[0])
      );

      if (!casino) {
        // Show available casinos
        const available = casinos
          .filter(c => c.enabled)
          .map(c => `• ${c.name} (\`${c.id}\`)`)
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

      const embed = new EmbedBuilder()
        .setTitle(`🎰 ${casino.name}`)
        .setDescription(enableAnalysis 
          ? `Casino link with gameplay analysis setup for ${casino.name}`
          : `Direct link to ${casino.name} casino website`)
        .setColor(0x0099ff);

      if (enableAnalysis) {
        // Analysis mode: Provide tools for gameplay monitoring
        embed.addFields(
          {
            name: '🔗 Casino Website',
            value: `[Open ${casino.name} (New Tab)](${casino.baseURL})`,
            inline: false
          },
          {
            name: '🤖 Automated Analysis (Recommended)',
            value: 
              '• **CSV Upload**: Upload casino export file for instant analysis\n' +
              '• **WebSocket Monitor**: Real-time pattern detection on port 7074\n' +
              '• **Visual Recognition**: Screenshot-based tilt detection\n' +
              '• **Enhanced Analyzer**: Full automated session tracking',
            inline: false
          },
          {
            name: '📊 Manual Analysis (Legacy)',
            value: 
              '1. Open casino in new tab/window\n' +
              '2. Start screen sharing in this Discord channel\n' +
              '3. Use `/play-analyze` to start session tracking\n' +
              '4. Begin gameplay while sharing screen',
            inline: false
          },
          {
            name: '🎯 Tilt Detection Features',
            value: 
              '• **Rapid Betting**: Detects quick successive bets\n' +
              '• **Loss Chasing**: Identifies increasing bet patterns\n' +
              '• **Extended Sessions**: Monitors time-based risks\n' +
              '• **Bankroll Deviation**: Tracks budget violations',
            inline: false
          },
          {
            name: 'ℹ️ Info',
            value: `• ID: \`${casino.id}\`${casino.regulator ? `\n• Regulator: ${casino.regulator}` : ''}`,
            inline: true
          }
        );

        embed.setFooter({ 
          text: '🤖 Automated Analysis Enabled • Enhanced Analyzer on Port 7074 • CSV Parser Ready' 
        });
      } else {
        // Standard mode: Just provide casino link
        embed.addFields(
          {
            name: '🔗 Casino Website',
            value: `[Open ${casino.name}](${casino.baseURL})`,
            inline: false
          },
          {
            name: 'ℹ️ Info',
            value: `• ID: \`${casino.id}\`${casino.regulator ? `\n• Regulator: ${casino.regulator}` : ''}\n• Use \`/play name:${casino.id} analyze:true\` for analysis mode`,
            inline: true
          }
        );

        embed.setFooter({ 
          text: '⚠️ Gamble responsibly. Use /cooldown if you need a break.' 
        });
      }

      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('[casino] Error loading casino data:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ System Error')
        .setDescription('Failed to load casino database. Please try again later.')
        .setColor(0xff0000);
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};