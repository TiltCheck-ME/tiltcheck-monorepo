/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * DM Handler - Natural Language Bot Assistance
 * 
 * Handles direct messages to the bot with AI-powered natural language understanding.
 * Users can ask questions like:
 * - "How do I swap LTC for SOL?"
 * - "I want to tip someone"
 * - "What tokens can I swap?"
 * 
 * The AI understands the intent and provides helpful guidance.
 */

import { Client, Message, ChannelType } from 'discord.js';
import { aiClient } from '@tiltcheck/ai-client';
import { trackMessage } from '@tiltcheck/tiltcheck-core';
import { hasWallet, getWallet, getSupportedTokens } from '@tiltcheck/justthetip';

// Keywords for intent detection (fallback when AI is unavailable)
const SWAP_KEYWORDS = ['swap', 'exchange', 'convert', 'trade'];
const TIP_KEYWORDS = ['tip', 'send', 'give', 'transfer'];
const WALLET_KEYWORDS = ['wallet', 'register', 'connect', 'setup'];
const HELP_KEYWORDS = ['help', 'how', 'what', 'can i', 'guide', 'tutorial'];

/**
 * Handle a direct message to the bot
 */
export async function handleDirectMessage(_client: Client, message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only handle DMs
  if (message.channel.type !== ChannelType.DM) return;

  const userId = message.author.id;
  const content = message.content.toLowerCase().trim();

  // Track message for tilt detection
  trackMessage(userId, message.content, message.channelId);

  console.log(`[DM Handler] Received DM from ${message.author.tag}: ${content.substring(0, 50)}...`);

  // Try AI-powered response first
  try {
    const aiResponse = await getAIResponse(userId, message.content);
    if (aiResponse) {
      await message.reply(aiResponse);
      return;
    }
  } catch (error) {
    console.error('[DM Handler] AI response error:', error);
    // Fall through to rule-based handling
  }

  // Fall back to rule-based intent detection
  const response = await getRuleBasedResponse(userId, content);
  await message.reply({ content: response });
}

/**
 * Get AI-powered response using the AI Gateway
 */
async function getAIResponse(userId: string, question: string): Promise<string | null> {
  try {
    // Check if user has a wallet for context
    const hasUserWallet = hasWallet(userId);
    const wallet = hasUserWallet ? getWallet(userId) : null;

    // Use AI Gateway support application
    const response = await aiClient.getSupport(question, {
      userId,
      hasWallet: hasUserWallet,
      walletAddress: wallet?.address ? `${wallet.address.substring(0, 8)}...` : null,
      availableCommands: [
        '/tip swap - Swap Solana tokens',
        '/tip wallet - Manage your wallet',
        '/tip send - Send a tip',
        '/tip balance - Check balance',
        '/tip tokens - List supported tokens',
      ],
      supportedTokens: getSupportedTokens(),
    });

    if (response.success && response.data) {
      // Format the AI response nicely
      let reply = response.data.answer;

      // Add follow-up suggestions if available
      if (response.data.suggestedFollowUps && response.data.suggestedFollowUps.length > 0) {
        reply += '\n\n💡 **You might also want to know:**\n';
        reply += response.data.suggestedFollowUps.map((q: string) => `• ${q}`).join('\n');
      }

      return reply;
    }
  } catch (error) {
    console.error('[DM Handler] AI Gateway error:', error);
  }

  return null; // Fall back to rule-based
}

/**
 * Rule-based response when AI is unavailable
 */
async function getRuleBasedResponse(userId: string, content: string): Promise<string> {
  const hasUserWallet = hasWallet(userId);

  // Swap questions (Solana tokens)
  if (containsAny(content, SWAP_KEYWORDS)) {
    return getSwapGuide(hasUserWallet);
  }

  // Tip questions
  if (containsAny(content, TIP_KEYWORDS)) {
    return getTipGuide(hasUserWallet);
  }

  // Wallet questions
  if (containsAny(content, WALLET_KEYWORDS)) {
    return getWalletGuide(hasUserWallet);
  }

  // Help/general questions
  if (containsAny(content, HELP_KEYWORDS)) {
    return getGeneralHelp();
  }

  // Default response
  return getGeneralHelp();
}

/**
 * Check if content contains any of the keywords
 */
function containsAny(content: string, keywords: string[]): boolean {
  return keywords.some(kw => content.includes(kw));
}

/**
 * Guide for swapping Solana tokens
 */
function getSwapGuide(hasWallet: boolean): string {
  let guide = `💱 **How to Swap Solana Tokens**\n\n`;

  if (!hasWallet) {
    guide += `⚠️ **First, register your wallet!**\n`;
    guide += `Use \`/tip wallet\` → **Register (External)**\n\n`;
  }

  guide += `**Swap tokens using Jupiter:**\n`;
  guide += `\`/tip swap from:USDC to:SOL amount:10\`\n\n`;

  guide += `**Supported tokens:**\n`;
  guide += `SOL, USDC, USDT, BONK, JUP, RAY, ORCA, WBTC, WETH\n\n`;

  guide += `**View all tokens:**\n`;
  guide += `\`/tip tokens\``;

  return guide;
}

/**
 * Guide for tipping
 */
function getTipGuide(hasWallet: boolean): string {
  let guide = `💸 **How to Send Tips**\n\n`;

  if (!hasWallet) {
    guide += `⚠️ **First, register your wallet!**\n`;
    guide += `Use \`/tip wallet\` → **Register (External)**\n\n`;
  }

  guide += `**Send a tip:**\n`;
  guide += `\`/tip send user:@username amount:0.1 sol\`\n\n`;

  guide += `**Airdrop to multiple users:**\n`;
  guide += `\`/tip airdrop amount:0.05 recipients:@user1 @user2\`\n\n`;

  guide += `**Check your balance:**\n`;
  guide += `\`/tip balance\`\n\n`;

  guide += `💡 Tips are non-custodial - you sign with your own wallet!`;

  return guide;
}

/**
 * Guide for wallet setup
 */
function getWalletGuide(hasWallet: boolean): string {
  if (hasWallet) {
    return `✅ **You already have a wallet registered!**\n\n` +
      `**View your wallet:**\n\`/tip wallet action:View\`\n\n` +
      `**Check balance:**\n\`/tip balance\``;
  }

  return `💳 **Setting Up Your Wallet**\n\n` +
    `**Step 1:** Open your Solana wallet (Phantom, Solflare, etc.)\n\n` +
    `**Step 2:** Copy your wallet address\n\n` +
    `**Step 3:** Register it with the bot:\n` +
    `\`/tip wallet action:register-external address:YOUR_ADDRESS\`\n\n` +
    `That's it! Now you can:\n` +
    `• Send and receive tips\n` +
    `• Swap tokens via Jupiter\n` +
    `• Lock funds in time-locked vaults`;
}

/**
 * General help response
 */
function getGeneralHelp(): string {
  return `👋 **Hi! I'm the JustTheTip Bot**\n\n` +
    `I can help you with:\n\n` +
    `💱 **Token Swaps** - Swap between Solana tokens via Jupiter\n` +
    `\`/tip swap from:TOKEN to:TOKEN amount:X\`\n\n` +
    `💸 **Tipping** - Send SOL to other users\n` +
    `\`/tip send user:@someone amount:X\`\n\n` +
    `💳 **Wallet** - Set up your Solana wallet\n` +
    `\`/tip wallet\`\n\n` +
    `**Just ask me anything!** For example:\n` +
    `• "I want to tip someone"\n` +
    `• "What tokens can I swap?"\n\n` +
    `Or use \`/tip\` for all commands!`;
}

/**
 * Register DM handler with the Discord client
 */
export function registerDMHandler(client: Client): void {
  client.on('messageCreate', async (message) => {
    if (message.channel.type === ChannelType.DM && !message.author.bot) {
      try {
        await handleDirectMessage(client, message);
      } catch (error) {
        console.error('[DM Handler] Error handling DM:', error);
        await message.reply('❌ Sorry, I had trouble understanding that. Try asking differently or use `/tip` for commands.');
      }
    }
  });

  console.log('[DM Handler] Direct message handler registered');
}
