/**
 * Event Handler
 * Manages Discord client events
 */

import { Client, Events, REST, Routes, User, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';
import fs from 'fs/promises';
import path from 'path';

// Simple file-based storage for tracking first-time users
const FIRST_TIME_USERS_FILE = path.join(process.cwd(), 'data', 'first-time-users.json');

export class EventHandler {
  constructor(
    private client: Client,
    private commandHandler: CommandHandler
  ) {}

  /**
   * Check if user is new and send welcome DM
   */
  private async handleFirstTimeUser(user: User): Promise<void> {
    try {
      // Load existing first-time users
      let firstTimeUsers: string[] = [];
      try {
        const data = await fs.readFile(FIRST_TIME_USERS_FILE, 'utf-8');
        firstTimeUsers = JSON.parse(data);
      } catch {
        // File doesn't exist yet, that's fine
        firstTimeUsers = [];
      }

      // Check if this is a new user
      if (!firstTimeUsers.includes(user.id)) {
        // Mark as seen
        firstTimeUsers.push(user.id);
        
        // Save updated list
        await fs.mkdir(path.dirname(FIRST_TIME_USERS_FILE), { recursive: true });
        await fs.writeFile(FIRST_TIME_USERS_FILE, JSON.stringify(firstTimeUsers, null, 2));
        
        // Send welcome DM
        await this.sendWelcomeDM(user);
      }
    } catch (error) {
      console.error('[JTT Bot] Error handling first-time user:', error);
      // Don't let this error break the command execution
    }
  }

  /**
   * Send welcome DM to new users
   */
  private async sendWelcomeDM(user: User): Promise<void> {
    try {
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x14F195)
        .setTitle('🌟 Welcome to JustTheTip!')
        .setDescription(
          '**Thanks for trying JustTheTip - the non-custodial Solana tipping bot!**\n\n' +
          '✨ **What makes us different?**\n' +
          '• You control your funds (non-custodial)\n' +
          '• Tip in USD, auto-converted to SOL\n' +
          '• Only $0.07 fee per transaction\n' +
          '• No KYC required - just your wallet address\n\n' +
          '🚀 **Quick Start:**\n' +
          '1. `/wallet register` - Connect your Phantom/Solflare wallet\n' +
          '2. `/tip @someone $5` - Send your first tip!\n' +
          '3. `/help` - See all available commands\n\n' +
          '💡 **Pro Tip:** Any tips sent to you before wallet registration will be automatically claimed when you connect your wallet!'
        )
        .addFields(
          { 
            name: '🔗 Useful Links', 
            value: '[📖 Documentation](https://tiltcheck.com/docs/justthetip)\n[🎯 TiltCheck Dashboard](https://tiltcheck.com/dashboard)\n[💬 Support](https://discord.gg/tiltcheck)', 
            inline: false 
          },
          { 
            name: '🛡️ Safety First', 
            value: 'JustTheTip is **completely non-custodial**. We never hold your funds - everything goes directly from your wallet to the recipient.', 
            inline: false 
          }
        )
        .setFooter({ text: 'JustTheTip • Powered by TiltCheck • Built on Solana' })
        .setTimestamp();

      await user.send({ embeds: [welcomeEmbed] });
      console.log(`[JTT Bot] 📬 Sent welcome DM to ${user.tag}`);
    } catch (error) {
      // User might have DMs disabled
      console.log(`[JTT Bot] ❌ Could not send welcome DM to ${user.tag}:`, error);
    }
  }

  registerDiscordEvents(): void {
    // Ready event
    this.client.once(Events.ClientReady, async (client) => {
      console.log(`[JTT Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[JTT Bot] Serving ${client.guilds.cache.size} guilds`);
      
      // Auto-register slash commands
      console.log('[JTT Bot] 🔄 Auto-registering slash commands...');
      try {
        const rest = new REST({ version: '10' }).setToken(config.discordToken);
        const commands = this.commandHandler.getAllCommands();
        const commandData = commands.map(cmd => cmd.data.toJSON());
        
        // Try guild-specific first, fallback to global
        try {
          if (config.guildId) {
            await rest.put(
              Routes.applicationGuildCommands(config.clientId, config.guildId),
              { body: commandData }
            );
            console.log(`[JTT Bot] ✅ Registered ${commandData.length} guild commands`);
          } else {
            throw new Error('No guild ID configured');
          }
        } catch (guildError: any) {
          console.log('[JTT Bot] ⚠️  Guild registration failed, trying global...');
          await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commandData }
          );
          console.log(`[JTT Bot] ✅ Registered ${commandData.length} global commands (may take ~1hr)`);
        }
      } catch (error) {
        console.error('[JTT Bot] ❌ Failed to register commands:', error);
      }
    });

    // Interaction create (slash commands)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const userId = interaction.user.id;
      
      // Check if this is a new user - send welcome DM on first command
      await this.handleFirstTimeUser(interaction.user);

      const command = this.commandHandler.getCommand(interaction.commandName);

      if (!command) {
        console.warn(`[JTT Bot] Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
        console.log(`[JTT Bot] ${interaction.user.tag} used /${interaction.commandName}`);
      } catch (error) {
        console.error(`[JTT Bot] Error executing ${interaction.commandName}:`, error);

        const errorMessage = {
          content: 'There was an error executing this command!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    });

    // Message create (handle DM conversations with AI setup wizard)
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      // Handle DM conversations with AI setup wizard
      // TEMP: disabled until @tiltcheck/ai-service exists
      /*
      if (message.channel.isDMBased()) {
        try {
          const setupAction = await parseSetupRequest(message.content, message.author.id);
          
          // Send AI-generated response
          await message.reply(setupAction.suggestedResponse.replace(/\\n/g, '\n'));
          
          // Log AI-detected intent for debugging
          console.log(
            `[JTT Bot] AI Setup: ${message.author.tag} - Intent: ${setupAction.intent} (confidence: ${setupAction.confidence})`
          );
        } catch (error) {
          console.error('[JTT Bot] Error in AI setup wizard:', error);
          await message.reply(
            '🤔 Sorry, I had trouble understanding that. Try using slash commands like `/help` or `/email-preferences`!'
          );
        }
      }
      */
    });
  }
}
