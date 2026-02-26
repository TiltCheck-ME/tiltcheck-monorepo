/**
 * Â© 2024â€“2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Tip Command - Consolidated JustTheTip functionality
 * Non-custodial Solana tipping, airdrops, vault management, and trivia
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';
import {
  registerExternalWallet, 
  getWallet, 
  getWalletBalance,
  hasWallet,
  executeTip,
  getSwapQuote,
  createSwapTransaction,
  getSupportedTokens,
  isTokenSupported,
  executeAirdrop,
  isAdmin,
} from '@tiltcheck/justthetip';
import { lockVault, unlockVault, extendVault, getVaultStatus, type LockVaultRecord } from '@tiltcheck/lockvault';
import { parseAmountNL, formatAmount, parseDurationNL, parseCategory } from '@tiltcheck/natural-language-parser';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { isOnCooldown } from '@tiltcheck/tiltcheck-core';
import { db } from '@tiltcheck/database';
import { Connection, Keypair } from '@solana/web3.js';

// Active public airdrops - messageId -> airdrop data
const activeAirdrops = new Map<string, {
  hostId: string;
  totalPoolSOL: number;
  totalSlots: number;
  claimedBy: Set<string>;
  pendingBy: Set<string>;
  claimantsWithWallet: Set<string>;
  createdAt: number;
}>();

// Active trivia rounds - channelId -> round data
const activeTriviaRounds = new Map<string, {
  question: string;
  answer: string;
  choices?: string[];
  prize: number;
  prizeDisplay: string;
  hostId: string;
  endTime: number;
  correctUsers: Set<string>;
  category: string;
}>();

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
const AIRDROP_CLAIM_EMOJI = '\u{1F381}'; // 🎁
const TRIVIA_OPTION_EMOJIS = [
  '\u{1F1E6}', // 🇦
  '\u{1F1E7}', // 🇧
  '\u{1F1E8}', // 🇨
  '\u{1F1E9}', // 🇩
] as const;

export const tip: Command = {
  data: new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Non-custodial Solana tipping & wallet management')
    // Send a tip
    .addSubcommand(sub =>
      sub
        .setName('send')
        .setDescription('Send SOL to another user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to tip').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('amount').setDescription('Amount (e.g., "5 sol", "$10", "all")').setRequired(true)
        )
    )
    // Airdrop to multiple users
    .addSubcommand(sub =>
      sub
        .setName('airdrop')
        .setDescription('Send SOL to multiple users or create public claim')
        .addStringOption(opt =>
          opt.setName('amount').setDescription('Amount (targeted: per recipient, public: total pool)').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('recipients').setDescription('User mentions (@user1 @user2) or "public" for anyone to claim').setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('slots').setDescription('Number of claim slots for public airdrops (default: 10)').setRequired(false)
        )
    )
    // Wallet management
    .addSubcommand(sub =>
      sub
        .setName('wallet')
        .setDescription('Manage your wallet')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Wallet action')
            .setRequired(true)
            .addChoices(
              { name: 'View', value: 'view' },
              { name: 'Register (Magic Link)', value: 'register-magic' },
              { name: 'Register (External)', value: 'register-external' },
            )
        )
        .addStringOption(opt =>
          opt.setName('address').setDescription('Wallet address (for external registration)').setRequired(false)
        )
    )
    // Balance check
    .addSubcommand(sub =>
      sub
        .setName('balance')
        .setDescription('Check your wallet balance')
    )
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('Lock funds in a time-locked vault')
        .addStringOption(o => o.setName('amount').setDescription('Amount (e.g. "$100", "5 SOL", "all")').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('Lock duration (e.g. 24h, 3d, 90m)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Optional reason (anti-tilt, savings, etc.)'))
    )
    // Vault unlock
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Unlock a vault (after expiry)')
        .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
    )
    // Vault extend
    .addSubcommand(sub =>
      sub
        .setName('extend')
        .setDescription('Extend a locked vault duration')
        .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
        .addStringOption(o => o.setName('additional').setDescription('Additional duration (e.g. 12h, 2d)').setRequired(true))
    )
    // Vault status
    .addSubcommand(sub =>
      sub
        .setName('vaults')
        .setDescription('View your locked vaults')
    )
    // Trivia drop - single round with prize
    .addSubcommand(sub =>
      sub
        .setName('trivia')
        .setDescription('Start a timed trivia round with a prize')
        .addStringOption(opt =>
          opt.setName('prize')
            .setDescription('Prize amount (e.g., "$5", "0.1 SOL")')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('time')
            .setDescription('Time limit (e.g., "15s", "30 secs", "1m") - default: 15s')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Question category (random if not specified)')
            .addChoices(
              { name: 'Crypto', value: 'crypto' },
              { name: 'Poker', value: 'poker' },
              { name: 'Sports', value: 'sports' },
              { name: 'General', value: 'general' }
            )
            .setRequired(false)
        )
    )
    // Token swap via Jupiter
    .addSubcommand(sub =>
      sub
        .setName('swap')
        .setDescription('Swap tokens using Jupiter aggregator (e.g., USDC to SOL)')
        .addStringOption(opt =>
          opt.setName('from')
            .setDescription('Token to swap from (e.g., USDC, SOL, BONK)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('to')
            .setDescription('Token to swap to (e.g., SOL, USDC, JUP)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('amount')
            .setDescription('Amount to swap (e.g., "10", "0.5", "100")')
            .setRequired(true)
        )
    )
    // List supported tokens for swap
    .addSubcommand(sub =>
      sub
        .setName('tokens')
        .setDescription('List supported tokens for swapping')
    )
    // Admin prize distribution
    .addSubcommand(sub =>
      sub
        .setName('distribute')
        .setDescription('(Admin) Create prize distribution for multiple users')
        .addStringOption(opt =>
          opt.setName('recipients')
            .setDescription('User mentions (@user1 @user2) to receive prizes')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('total')
            .setDescription('Total prize amount in SOL (e.g., "0.5", "1")')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('context')
            .setDescription('Distribution context')
            .setRequired(false)
            .addChoices(
              { name: 'Trivia', value: 'trivia' },
              { name: 'Airdrop', value: 'airdrop' },
              { name: 'Custom', value: 'custom' },
            )
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand(false);

      if (!subcommand) {
        await interaction.reply({
          content: 'âŒ Please specify a subcommand:\n' +
            'â€¢ `/tip send` - Send SOL to a user\n' +
            'â€¢ `/tip airdrop` - Send SOL to multiple users or create public claim\n' +
            'â€¢ `/tip wallet` - Manage your wallet\n' +
            'â€¢ `/tip balance` - Check your balance\n' +
            'â€¢ `/tip lock` - Lock SOL in vault\n' +
            'â€¢ `/tip unlock` - Unlock vault\n' +
            'â€¢ `/tip extend` - Extend vault lock\n' +
            'â€¢ `/tip vaults` - View vault status\n' +
            'â€¢ `/tip trivia` - Create trivia airdrop\n' +
            'â€¢ `/tip swap` - Swap Solana tokens via Jupiter\n' +
            'â€¢ `/tip tokens` - List supported swap tokens\n' +
            'â€¢ `/tip distribute` - (Admin) Create prize distribution',
          ephemeral: true
        });
        return;
      }

      switch (subcommand) {
        case 'send':
          await handleTip(interaction);
          break;
        case 'airdrop':
          await handleAirdrop(interaction);
          break;
        case 'wallet':
          await handleWallet(interaction);
          break;
        case 'balance':
          await handleBalance(interaction);
          break;
        case 'lock':
          await handleVaultLock(interaction);
          break;
        case 'unlock':
          await handleVaultUnlock(interaction);
          break;
        case 'extend':
          await handleVaultExtend(interaction);
          break;
        case 'vaults':
          await handleVaultStatus(interaction);
          break;
        case 'trivia':
          await handleTriviaDrop(interaction);
          break;
        case 'swap':
          await handleSwap(interaction);
          break;
        case 'tokens':
          await handleTokens(interaction);
          break;
        case 'distribute':
          await handleDistribute(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command', ephemeral: true });
      }
    } catch (error) {
      console.error('[TIP] Command error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `âŒ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `âŒ Error: ${errorMessage}`, ephemeral: true });
      }
    }
  },
};

// ==================== TIP HANDLERS ====================

async function handleTip(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({
      content: 'ðŸš« You\'re on cooldown and cannot send tips right now. Take a break.',
    });
    return;
  }

  const recipient = interaction.options.getUser('user', true);
  const amountInput = interaction.options.getString('amount', true);

  if (recipient.id === interaction.user.id) {
    await interaction.editReply({ content: 'âŒ You cannot tip yourself!' });
    return;
  }

  // Use enhanced NLP parser for natural language amounts
  // Handles: "$5", "5 bucks", "five dollars", "0.1 sol", "half a sol", etc.
  const parseResult = parseAmountNL(amountInput);
  
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({
      content: `âŒ ${parseResult.error}\n\nExamples: "$5", "five bucks", "0.1 sol", "half a sol", "all"`,
    });
    return;
  }

  const parsedAmount = parseResult.data;

  const recipientWallet = getWallet(recipient.id);
  
  if (!recipientWallet) {
    await interaction.editReply({
      content: `âš ï¸ ${recipient} doesn't have a wallet registered yet.\nThey must set an external wallet via \`/tip wallet\` before receiving payouts.`,
    });
    return;
  }

  try {
    const { payerUserId, keypair } = await ensureBotPayerWalletReady();
    const result = await executeTip(
      {
        senderId: payerUserId,
        recipientId: recipient.id,
        amount: parsedAmount.value,
        currency: parsedAmount.currency,
      },
      keypair
    );

    if (!result.success) {
      await interaction.editReply({
        content: `âŒ Tip failed: ${result.error || 'Unknown error'}`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('ðŸ’¸ Tip Sent')
      .setDescription(
        `**Recipient:** ${recipient}\n` +
        `**Amount Sent:** ${result.amount.toFixed(4)} SOL\n` +
        `**Fee:** ${result.fee.toFixed(4)} SOL\n` +
        (result.signature ? `\n[View Transaction](https://solscan.io/tx/${result.signature})` : '')
      )
      .setFooter({ text: 'JustTheTip â€¢ Powered by TiltCheck' });

    await interaction.editReply({ embeds: [embed], components: [] });

  } catch (error) {
    await interaction.editReply({
      content: `âŒ Failed to send tip: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handleAirdrop(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({ content: 'âŒ You need to register a wallet first using `/tip wallet`.' });
    return;
  }

  const amountRaw = interaction.options.getString('amount', true);
  const recipientsRaw = interaction.options.getString('recipients');
  const slots = interaction.options.getInteger('slots') || 10;

  // Use enhanced NLP parser for natural language amounts
  // Handles: "$5", "5 bucks", "five dollars", "0.1 sol", etc.
  const parseResult = parseAmountNL(amountRaw);
  
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({
      content: `âŒ ${parseResult.error}\n\nExamples: "$5", "five bucks", "0.1 sol", "7 dollars"`,
    });
    return;
  }

  const parsedAmount = parseResult.data;
  
  // Convert USD to SOL if needed
  let amountPerRecipientSOL = parsedAmount.value;
  if (parsedAmount.currency === 'USD') {
    try {
      const solPrice = pricingOracle.getUsdPrice('SOL');
      amountPerRecipientSOL = parsedAmount.value / solPrice;
    } catch {
      await interaction.editReply({ content: 'âŒ Unable to get current SOL price. Please try again or specify amount in SOL.' });
      return;
    }
  }

  if (amountPerRecipientSOL <= 0) {
    await interaction.editReply({ content: 'âŒ Invalid amount. Provide a positive value like `$5` or `0.05 sol`.' });
    return;
  }

  // Check if this is a public airdrop
  const isPublic = !recipientsRaw || recipientsRaw.toLowerCase().trim() === 'public';

  if (isPublic) {
    // Public mode uses amount as a total pool, settled at round end.
    await handlePublicAirdrop(interaction, amountPerRecipientSOL, slots, parsedAmount);
    return;
  }

  // Original targeted airdrop logic
  const idRegex = /<@!?(\d+)>/g;
  const userIds: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(recipientsRaw)) !== null) {
    userIds.push(match[1]);
  }

  if (userIds.length === 0) {
    await interaction.editReply({ content: 'âŒ No valid user mentions found. Use space-separated mentions like `@Alice @Bob`, or use "public" for anyone to claim.' });
    return;
  }

  const validRecipientIds: string[] = [];
  const missingWallets: string[] = [];
  for (const uid of userIds) {
    const w = getWallet(uid);
    if (w) validRecipientIds.push(uid); else missingWallets.push(uid);
  }

  if (validRecipientIds.length === 0) {
    await interaction.editReply({ content: 'âŒ None of the mentioned users have registered wallets yet.' });
    return;
  }

  try {
    const { payerUserId, keypair } = await ensureBotPayerWalletReady();
    const result = await executeAirdrop(
      {
        senderId: payerUserId,
        recipientIds: validRecipientIds,
        amountPerUser: amountPerRecipientSOL,
        currency: 'SOL',
      },
      keypair
    );
    if (!result.success) {
      await interaction.editReply({ content: `âŒ Airdrop failed: ${result.error || 'Unknown error'}` });
      return;
    }

    // Display both SOL and USD value if USD was input
    const amountDisplay = parsedAmount.currency === 'USD'
      ? `${formatAmount(parsedAmount)} (~${amountPerRecipientSOL.toFixed(4)} SOL)`
      : `${amountPerRecipientSOL.toFixed(4)} SOL`;

    const embed = new EmbedBuilder()
      .setColor(0x8844ff)
      .setTitle('ðŸš€ Airdrop Sent')
      .setDescription(
        `**Recipients:** ${result.recipientCount}\n` +
        `**Amount Each:** ${amountDisplay}\n` +
        `**Total Sent:** ${result.totalAmount.toFixed(4)} SOL\n` +
        `**Fee:** ${result.fee.toFixed(4)} SOL\n` +
        (result.signature ? `\n[View Transaction](https://solscan.io/tx/${result.signature})` : '')
      )
      .setFooter({ text: 'JustTheTip â€¢ Powered by TiltCheck' });

    let missingNote = '';
    if (missingWallets.length > 0) {
      missingNote = `\nâš ï¸ Skipped ${missingWallets.length} user(s) without wallets.`;
    }

    await interaction.editReply({ embeds: [embed], components: [], content: missingNote });
  } catch (error) {
    await interaction.editReply({ content: `âŒ Failed to send airdrop: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}

async function handlePublicAirdrop(interaction: ChatInputCommandInteraction, totalPoolSOL: number, slots: number, parsedAmount?: { value: number; currency: 'SOL' | 'USD' }) {
  const senderWallet = getWallet(interaction.user.id);
  if (!senderWallet) {
    await interaction.editReply({ content: 'Error: wallet not found.' });
    return;
  }

  const amountDisplay = parsedAmount && parsedAmount.currency === 'USD'
    ? `${parsedAmount.value.toFixed(2)} USD (~${totalPoolSOL.toFixed(4)} SOL)`
    : `${totalPoolSOL.toFixed(4)} SOL`;

  const embed = new EmbedBuilder()
    .setColor(0xFF6B00)
    .setTitle('Public Airdrop')
    .setDescription(
      `**Total pool:** ${amountDisplay}\n` +
      `**Total slots:** ${slots}\n` +
      `**Claimed:** 0/${slots}\n` +
      `**Settlement:** pool divided equally by total valid claimants at round end\n\n` +
      `**React with ${AIRDROP_CLAIM_EMOJI} to claim!**\n` +
      'First come, first served. One claim per user.'
    )
    .setFooter({ text: `Hosted by ${interaction.user.username} • JustTheTip` });

  const reply = await interaction.editReply({ embeds: [embed], components: [] });
  await reply.react(AIRDROP_CLAIM_EMOJI).catch(() => {});

  activeAirdrops.set(reply.id, {
    hostId: interaction.user.id,
    totalPoolSOL,
    totalSlots: slots,
    claimedBy: new Set(),
    pendingBy: new Set(),
    claimantsWithWallet: new Set(),
    createdAt: Date.now(),
  });

  const collector = reply.createReactionCollector({
    time: 60 * 60 * 1000,
    filter: (reaction, user) => reaction.emoji.name === AIRDROP_CLAIM_EMOJI && !user.bot,
  });

  collector.on('collect', async (_reaction, user) => {
    await handleAirdropClaimByReaction(reply, user.id);
  });

  collector.on('end', async () => {
    await settlePublicAirdrop(reply.id, reply.channel);
  });
}
async function handleWallet(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);

  if (action === 'view') {
    const wallet = getWallet(interaction.user.id);
    
    if (!wallet) {
      await interaction.reply({
        content: 'âŒ No wallet registered. Use `/tip wallet` â†’ Register (External)',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('ðŸ’³ Your Wallet')
      .addFields(
        { name: 'Address', value: `\`${wallet.address}\``, inline: false },
        { name: 'Type', value: wallet.type, inline: true },
        { name: 'Registered', value: `<t:${Math.floor(wallet.registeredAt / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: 'JustTheTip â€¢ Powered by TiltCheck' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-magic') {
    // Check if user already has a Degen Identity with magic address
    if (db.isConnected()) {
      try {
        const identity = await db.getDegenIdentity(interaction.user.id);
        if (identity?.magic_address) {
          await interaction.reply({
            content: `âœ… You already have a **Degen Identity** wallet linked:\n\`${identity.magic_address}\``,
            ephemeral: true,
          });
          return;
        }
      } catch (err) {
        console.error('[TIP] Failed to check Degen Identity:', err);
      }
    }

    // Provide link to dashboard for Magic wallet registration
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://tiltcheck.me/dashboard';
    const linkUrl = `${dashboardUrl}?action=link-magic&userId=${interaction.user.id}`;
    
    const embed = new EmbedBuilder()
      .setColor(0x8A2BE2)
      .setTitle('âœ¨ Register with Magic Link')
      .setDescription('Connect your email to create a secure **Soft-Custody** wallet for tipping and vaulting.')
      .addFields(
        { name: 'Step 1', value: `[Click here to open Dashboard](${linkUrl})` },
        { name: 'Step 2', value: 'Login with your Email' },
        { name: 'Step 3', value: 'Link your Discord account' }
      )
      .setFooter({ text: 'TiltCheck â€¢ Trust & Safety' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-external') {
    const address = interaction.options.getString('address');
    
    if (!address) {
      await interaction.reply({
        content: 'âŒ Please provide your Solana wallet address:\n' +
          '`/tip wallet register-external address:<your-address>`\n\n' +
          'Find your address in Phantom, Solflare, or other Solana wallets.',
        ephemeral: true,
      });
      return;
    }

    try {
      const wallet = await registerExternalWallet(interaction.user.id, address);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('âœ… Wallet Registered!')
        .setDescription('Your external wallet has been connected')
        .addFields(
          { name: 'Address', value: `\`${wallet.address}\``, inline: false },
          { name: 'Type', value: 'External', inline: true },
        )
        .setFooter({ text: 'You can now send and receive tips!' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({
        content: `âŒ ${error instanceof Error ? error.message : 'Invalid wallet address'}`,
        ephemeral: true,
      });
    }
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: 'âŒ No wallet registered. Use `/tip wallet` â†’ Register (External)',
    });
    return;
  }

  try {
    const balance = await getWalletBalance(interaction.user.id);
    const wallet = getWallet(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('ðŸ’° Wallet Balance')
      .addFields(
        { name: 'Balance', value: `${balance.toFixed(6)} SOL`, inline: true },
        { name: 'Address', value: `\`${wallet?.address}\``, inline: false },
      )
      .setFooter({ text: 'JustTheTip â€¢ Powered by TiltCheck' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply({
      content: `âŒ Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

// ==================== VAULT HANDLERS ====================

async function handleVaultLock(interaction: ChatInputCommandInteraction) {
  const amountRaw = interaction.options.getString('amount', true);
  const durationRaw = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') || undefined;

  // Use enhanced NLP for natural language parsing
  const parsedAmount = parseAmountNL(amountRaw);
  if (!parsedAmount.success || !parsedAmount.data) {
    await interaction.reply({ content: `âŒ ${parsedAmount.error}\n\nExamples: "$100", "fifty bucks", "0.5 sol", "all"`, ephemeral: true });
    return;
  }

  const parsedDuration = parseDurationNL(durationRaw);
  if (!parsedDuration.success || !parsedDuration.data) {
    await interaction.reply({ content: `âŒ ${parsedDuration.error}\n\nExamples: "24h", "a day", "1 week", "twelve hours"`, ephemeral: true });
    return;
  }

  try {
    const vault = await lockVault({ userId: interaction.user.id, amountRaw, durationRaw, reason });
    const embed = new EmbedBuilder()
      .setColor(0x8A2BE2)
      .setTitle('ðŸ”’ Vault Locked')
      .setDescription('Funds moved to disposable time-locked vault wallet')
      .addFields(
        { name: 'Vault ID', value: vault.id, inline: false },
        { name: 'Vault Wallet', value: `\`${vault.vaultAddress}\``, inline: false },
        { name: 'Unlocks', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>`, inline: true },
        { name: 'Amount (SOL eq)', value: vault.lockedAmountSOL === 0 ? 'ALL (snapshot)' : vault.lockedAmountSOL.toFixed(4), inline: true },
      )
      .setFooter({ text: reason ? `Reason: ${reason}` : 'Use /tip vaults to view all vaults' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `âŒ ${(err as Error).message}`, ephemeral: true });
  }
}

async function handleVaultUnlock(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  try {
    const vault = unlockVault(interaction.user.id, id);
    const embed = new EmbedBuilder()
      .setColor(0x00AA00)
      .setTitle('âœ… Vault Unlocked')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'Released', value: `${vault.lockedAmountSOL === 0 ? 'ALL' : vault.lockedAmountSOL.toFixed(4)} SOL eq` },
      )
      .setFooter({ text: 'JustTheTip â€¢ Powered by TiltCheck' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `âŒ ${(err as Error).message}`, ephemeral: true });
  }
}

async function handleVaultExtend(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  const additional = interaction.options.getString('additional', true);
  try {
    const vault = extendVault(interaction.user.id, id, additional);
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('â« Vault Extended')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'New Unlock', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>` },
        { name: 'Extensions', value: `${vault.extendedCount}` },
      )
      .setFooter({ text: 'JustTheTip â€¢ Powered by TiltCheck' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `âŒ ${(err as Error).message}`, ephemeral: true });
  }
}

async function handleVaultStatus(interaction: ChatInputCommandInteraction) {
  const vaults = getVaultStatus(interaction.user.id);
  if (vaults.length === 0) {
    await interaction.reply({ content: 'â„¹ï¸ No active vaults.', ephemeral: true });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(0x1E90FF)
    .setTitle('ðŸ”’ Your Vaults')
    .setDescription(vaults.map((v: LockVaultRecord) => 
      `â€¢ **${v.id}** â€“ ${v.status} â€“ unlocks <t:${Math.floor(v.unlockAt/1000)}:R> â€“ ${v.lockedAmountSOL===0? 'ALL' : v.lockedAmountSOL.toFixed(4)+' SOL'}`
    ).join('\n'))
    .setFooter({ text: 'JustTheTip â€¢ Powered by TiltCheck' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ==================== TRIVIA DROP HANDLER ====================

// Simple trivia questions by category (fallback when AI is unavailable)
const triviaQuestions: Record<string, Array<{ q: string; a: string; choices?: string[] }>> = {
  crypto: [
    { q: "What is the maximum supply of Bitcoin?", a: "21 million", choices: ["21 million", "100 million", "18 million", "Unlimited"] },
    { q: "What consensus mechanism does Solana use?", a: "Proof of History", choices: ["Proof of Work", "Proof of Stake", "Proof of History", "Proof of Authority"] },
    { q: "What year was Bitcoin created?", a: "2009", choices: ["2008", "2009", "2010", "2011"] },
    { q: "What is the native token of Ethereum?", a: "ETH", choices: ["BTC", "ETH", "SOL", "USDT"] },
    { q: "What does 'HODL' stand for in crypto culture?", a: "Hold On for Dear Life", choices: ["Hold On for Dear Life", "Hold Our Digital Ledger", "Honest Online Digital Lending", "It's a typo for HOLD"] },
    { q: "What is a 'rug pull' in crypto?", a: "Developers abandoning project with funds", choices: ["A new token launch", "Developers abandoning project with funds", "A trading strategy", "A type of wallet"] },
    { q: "What blockchain does USDC primarily run on?", a: "Ethereum", choices: ["Bitcoin", "Ethereum", "Solana only", "Dogecoin"] },
  ],
  poker: [
    { q: "What is the best starting hand in Texas Hold'em?", a: "Pocket Aces", choices: ["Pocket Aces", "Pocket Kings", "Ace-King suited", "Pocket Queens"] },
    { q: "How many cards are in a standard poker deck?", a: "52", choices: ["48", "52", "54", "56"] },
    { q: "What beats a full house?", a: "Four of a kind", choices: ["Flush", "Straight", "Four of a kind", "Three of a kind"] },
    { q: "What is the 'flop' in Texas Hold'em?", a: "First 3 community cards", choices: ["First 3 community cards", "The final card", "Your hole cards", "The turn card"] },
    { q: "What does 'going all-in' mean?", a: "Betting all your chips", choices: ["Folding", "Betting all your chips", "Raising the minimum", "Checking"] },
  ],
  sports: [
    { q: "How many players are on a basketball team on the court?", a: "5", choices: ["4", "5", "6", "7"] },
    { q: "Which country has won the most FIFA World Cups?", a: "Brazil", choices: ["Germany", "Brazil", "Argentina", "Italy"] },
    { q: "How many points is a touchdown worth in American football?", a: "6", choices: ["5", "6", "7", "8"] },
    { q: "What sport uses a shuttlecock?", a: "Badminton", choices: ["Tennis", "Badminton", "Squash", "Volleyball"] },
  ],
  general: [
    { q: "What is the capital of Japan?", a: "Tokyo", choices: ["Seoul", "Beijing", "Tokyo", "Bangkok"] },
    { q: "How many planets are in our solar system?", a: "8", choices: ["7", "8", "9", "10"] },
    { q: "What year did World War II end?", a: "1945", choices: ["1943", "1944", "1945", "1946"] },
    { q: "What is the largest ocean on Earth?", a: "Pacific", choices: ["Atlantic", "Pacific", "Indian", "Arctic"] },
    { q: "What is the chemical symbol for gold?", a: "Au", choices: ["Ag", "Au", "Go", "Gd"] },
    { q: "How many continents are there?", a: "7", choices: ["5", "6", "7", "8"] },
  ],
};

// All available categories for random selection
const allCategories = ['crypto', 'poker', 'sports', 'general'];

async function handleTriviaDrop(interaction: ChatInputCommandInteraction) {
  const channelId = interaction.channelId;

  if (activeTriviaRounds.has(channelId)) {
    await interaction.reply({
      content: '? There\'s already an active trivia round in this channel! Wait for it to end.',
      ephemeral: true
    });
    return;
  }

  if (!hasWallet(interaction.user.id)) {
    await interaction.reply({
      content: 'Error: you need to register a wallet first to host trivia.\nUse `/tip wallet` -> Register (External)',
      ephemeral: true,
    });
    return;
  }

  const prizeInput = interaction.options.getString('prize', true);
  const timeInput = interaction.options.getString('time') || '15s';
  const categoryInput = interaction.options.getString('category');

  const category = categoryInput
    ? parseCategory(categoryInput) || categoryInput
    : allCategories[Math.floor(Math.random() * allCategories.length)];

  const prizeResult = parseAmountNL(prizeInput);
  if (!prizeResult.success || !prizeResult.data) {
    await interaction.reply({
      content: `? Invalid prize amount: ${prizeResult.error}\n\nExamples: "$5", "five bucks", "0.1 sol", "half a sol"`,
      ephemeral: true
    });
    return;
  }

  const timeResult = parseDurationNL(timeInput);
  let timeLimitMs: number;

  if (!timeResult.success || !timeResult.data) {
    const numericTime = parseInt(timeInput);
    if (!isNaN(numericTime) && numericTime >= 10 && numericTime <= 120) {
      timeLimitMs = numericTime * 1000;
    } else {
      await interaction.reply({
        content: `Error: invalid time format: ${timeResult.error || 'Could not parse'}\n\nExamples: "15s", "thirty seconds", "1 min", "half a minute"`,
        ephemeral: true
      });
      return;
    }
  } else {
    timeLimitMs = timeResult.data.milliseconds;
  }

  timeLimitMs = Math.max(10000, Math.min(120000, timeLimitMs));
  const timeLimitSecs = Math.round(timeLimitMs / 1000);

  const prizeSOL = prizeResult.data.value;
  const prizeDisplay = formatAmount(prizeResult.data);

  const questions = triviaQuestions[category] || triviaQuestions.general;
  const questionData = questions[Math.floor(Math.random() * questions.length)];

  if (!questionData.choices || questionData.choices.length < 4) {
    await interaction.reply({
      content: 'Error: trivia question is missing A/B/C/D options. Please try again.',
      ephemeral: true
    });
    return;
  }

  const correctAnswerIndex = questionData.choices.findIndex(
    c => c.toLowerCase() === questionData.a.toLowerCase()
  );

  if (correctAnswerIndex < 0 || correctAnswerIndex > 3) {
    await interaction.reply({
      content: 'Error: trivia answer mapping failed. Please try again.',
      ephemeral: true
    });
    return;
  }

  const endTime = Date.now() + timeLimitMs;
  activeTriviaRounds.set(channelId, {
    question: questionData.q,
    answer: questionData.a.toLowerCase(),
    choices: questionData.choices,
    prize: prizeSOL,
    prizeDisplay,
    hostId: interaction.user.id,
    endTime,
    correctUsers: new Set(),
    category,
  });

  const timeDisplay = timeLimitSecs >= 60
    ? `${Math.floor(timeLimitSecs / 60)}m ${timeLimitSecs % 60}s`
    : `${timeLimitSecs}s`;

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('TRIVIA DROP')
    .setDescription(`**${questionData.q}**`)
    .addFields(
      { name: 'Prize Pool', value: prizeDisplay, inline: true },
      { name: 'Time', value: timeDisplay, inline: true },
      { name: 'Category', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
      {
        name: 'How To Answer',
        value: `React with ${TRIVIA_OPTION_EMOJIS.join(' ')} on this message.`
      },
      {
        name: 'Options',
        value: questionData.choices.map((c, i) => `**${String.fromCharCode(65 + i)}.** ${c}`).join('\n'),
      }
    )
    .setFooter({ text: `Hosted by ${interaction.user.username} • React to answer • Prize split among all winners` });

  const triviaMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

  for (const emoji of TRIVIA_OPTION_EMOJIS) {
    await triviaMessage.react(emoji).catch(() => {});
  }

  const collector = triviaMessage.createReactionCollector({
    time: timeLimitMs,
    filter: (reaction, user) => TRIVIA_OPTION_EMOJIS.includes(reaction.emoji.name as any) && !user.bot,
  });

  collector.on('collect', (reaction, user) => {
    const round = activeTriviaRounds.get(channelId);
    if (!round) return;
    if (user.id === round.hostId) return;

    const selectedIndex = TRIVIA_OPTION_EMOJIS.indexOf(reaction.emoji.name as any);
    if (selectedIndex === correctAnswerIndex) {
      round.correctUsers.add(user.id);
    }
  });

  collector.on('end', async () => {
    const round = activeTriviaRounds.get(channelId);
    activeTriviaRounds.delete(channelId);

    if (!round) return;

    const winners = Array.from(round.correctUsers);
    const correctAnswerDisplay = round.choices?.[correctAnswerIndex] || round.answer;
    const channel = interaction.channel;
    if (!channel || !('send' in channel)) return;

    if (winners.length === 0) {
      const noWinnerEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('? Time\'s Up!')
        .setDescription(`Nobody got it right!\n\n**Correct answer:** ${correctAnswerDisplay}`)
        .setFooter({ text: 'Prize returned to host • Better luck next time!' });

      await channel.send({ embeds: [noWinnerEmbed] });
      return;
    }

    const prizePerWinner = round.prize / winners.length;
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    const winnerEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('We Have Winners')
      .setDescription(
        `**Correct answer:** ${correctAnswerDisplay}\n\n` +
        `**Winners (${winners.length}):** ${winnerMentions}\n\n` +
        `**Prize per winner:** ${prizePerWinner.toFixed(4)} SOL (~$${(prizePerWinner * 100).toFixed(2)})`
      )
      .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });

    await channel.send({ embeds: [winnerEmbed] });

    try {
      const { payerUserId, keypair } = await ensureBotPayerWalletReady();
      const result = await executeAirdrop(
        {
          senderId: payerUserId,
          recipientIds: winners,
          amountPerUser: prizePerWinner,
          currency: 'SOL',
        },
        keypair
      );

      if (!result.success) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF6600)
          .setTitle('Prize Distribution Failed')
          .setDescription(
            `Unable to settle trivia payout.\n\n` +
            `**Reason:** ${result.error || 'Unknown error'}`
          )
          .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });
        await channel.send({ embeds: [errorEmbed] });
        return;
      }

      const settledEmbed = new EmbedBuilder()
        .setColor(0x00AA00)
        .setTitle('Trivia Payout Settled')
        .setDescription(
          `**Winners Paid:** ${result.recipientCount}\n` +
          `**Amount Each:** ${prizePerWinner.toFixed(4)} SOL\n` +
          `**Total Sent:** ${result.totalAmount.toFixed(4)} SOL` +
          (result.signature ? `\n[View Transaction](https://solscan.io/tx/${result.signature})` : '')
        )
        .setFooter({ text: 'Settled from bot wallet • JustTheTip' });

      await channel.send({ embeds: [settledEmbed] });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle('Prize Distribution Error')
        .setDescription(
          `An error occurred while settling trivia payout.\n\n` +
          `**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });

      await channel.send({ embeds: [errorEmbed] });
    }
  });
}
// ==================== AIRDROP CLAIM HANDLER ====================

async function handleAirdropClaimByReaction(airdropMessage: any, userId: string) {
  const airdrop = activeAirdrops.get(airdropMessage.id);
  if (!airdrop) return;

  if (airdrop.claimedBy.has(userId) || airdrop.pendingBy.has(userId)) return;
  if (airdrop.claimedBy.size >= airdrop.totalSlots) return;

  const claimerWallet = getWallet(userId);
  if (!claimerWallet) {
    await airdropMessage.channel?.send(`<@${userId}> you need a wallet first: use \`/tip wallet\` -> Register (External).`).catch(() => {});
    return;
  }

  airdrop.pendingBy.add(userId);

  try {
    airdrop.claimedBy.add(userId);
    airdrop.claimantsWithWallet.add(userId);

    const claimed = airdrop.claimedBy.size;
    const remaining = Math.max(0, airdrop.totalSlots - claimed);
    const estimatedPerUser = claimed > 0 ? airdrop.totalPoolSOL / claimed : 0;

    const updatedEmbed = new EmbedBuilder()
      .setColor(remaining > 0 ? 0xFF6B00 : 0x666666)
      .setTitle(remaining > 0 ? 'Public Airdrop' : 'Airdrop Completed')
      .setDescription(
        `**Total pool:** ${airdrop.totalPoolSOL.toFixed(4)} SOL\n` +
        `**Total slots:** ${airdrop.totalSlots}\n` +
        `**Claimed:** ${claimed}/${airdrop.totalSlots}\n` +
        `**Estimated split now:** ${estimatedPerUser.toFixed(4)} SOL each\n\n` +
        (remaining > 0
          ? `**React with ${AIRDROP_CLAIM_EMOJI} to claim!**\nFinal split = pool / valid claimants at close.`
          : '**All slots claimed! Thanks for participating.')
      )
      .setFooter({ text: `Hosted by ${airdropMessage.embeds?.[0]?.footer?.text?.split(' • ')[0] || 'Unknown'} • JustTheTip` });

    await airdropMessage.edit({ embeds: [updatedEmbed], components: [] }).catch(() => {});

    await airdropMessage.channel?.send(
      `<@${userId}> claim recorded. Final payout settles automatically when the drop closes.`
    ).catch(() => {});
  } catch (error) {
    await airdropMessage.channel?.send(`<@${userId}> claim failed: ${error instanceof Error ? error.message : 'Unknown error'}`).catch(() => {});
  } finally {
    airdrop.pendingBy.delete(userId);
  }
}

function getBotPayerKeypair(): Keypair {
  const raw = process.env.JUSTTHETIP_BOT_WALLET_PRIVATE_KEY;
  if (!raw) {
    throw new Error('JUSTTHETIP_BOT_WALLET_PRIVATE_KEY is not configured');
  }

  const trimmed = raw.trim();
  try {
    const arr = JSON.parse(trimmed);
    if (!Array.isArray(arr)) throw new Error('not array');
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {
    throw new Error('JUSTTHETIP_BOT_WALLET_PRIVATE_KEY must be a JSON array secret key');
  }
}

async function ensureBotPayerWalletReady(): Promise<{ payerUserId: string; keypair: Keypair }> {
  const payerUserId = process.env.AIRDROP_PAYER_USER_ID || 'TREASURY_BOT';
  const payerPublic = process.env.JUSTTHETIP_BOT_WALLET_PUBLIC_KEY || process.env.TREASURY_WALLET_PUBLIC;
  if (!payerPublic) {
    throw new Error('Missing JUSTTHETIP_BOT_WALLET_PUBLIC_KEY or TREASURY_WALLET_PUBLIC');
  }

  if (!hasWallet(payerUserId)) {
    try {
      await registerExternalWallet(payerUserId, payerPublic);
    } catch {
      // Ignore duplicate-registration races.
    }
  }

  const keypair = getBotPayerKeypair();
  return { payerUserId, keypair };
}

async function settlePublicAirdrop(messageId: string, channel: any): Promise<void> {
  const airdrop = activeAirdrops.get(messageId);
  if (!airdrop) return;

  activeAirdrops.delete(messageId);

  const claimants = Array.from(airdrop.claimantsWithWallet);
  if (claimants.length === 0) {
    await channel?.send('Public airdrop closed with no valid claimants. No payout executed.').catch(() => {});
    return;
  }

  const amountPerUser = airdrop.totalPoolSOL / claimants.length;

  try {
    const { payerUserId, keypair } = await ensureBotPayerWalletReady();
    const result = await executeAirdrop(
      {
        senderId: payerUserId,
        recipientIds: claimants,
        amountPerUser,
        currency: 'SOL',
      },
      keypair
    );

    if (!result.success) {
      await channel?.send(`Airdrop settlement failed: ${result.error || 'Unknown error'}`).catch(() => {});
      return;
    }

    await channel?.send(
      `Public airdrop settled: ${claimants.length} users paid ${amountPerUser.toFixed(4)} SOL each from bot wallet.` +
      (result.signature ? `\nTx: https://solscan.io/tx/${result.signature}` : '')
    ).catch(() => {});
  } catch (error) {
    await channel?.send(`Airdrop settlement error: ${error instanceof Error ? error.message : 'Unknown error'}`).catch(() => {});
  }
}
// ==================== SWAP HANDLERS ====================

async function handleSwap(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Check user has wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: 'âŒ You need to register a wallet first!\nUse `/tip wallet` â†’ Register (External) to connect your Solana wallet.',
    });
    return;
  }

  const fromToken = interaction.options.getString('from', true).toUpperCase();
  const toToken = interaction.options.getString('to', true).toUpperCase();
  const amountStr = interaction.options.getString('amount', true);

  // Validate tokens
  if (!isTokenSupported(fromToken)) {
    await interaction.editReply({
      content: `âŒ Unsupported input token: ${fromToken}\n\n**Supported tokens:** ${getSupportedTokens().join(', ')}\n\nðŸ’¡ Use \`/tip tokens\` to see all supported tokens.`,
    });
    return;
  }

  if (!isTokenSupported(toToken)) {
    await interaction.editReply({
      content: `âŒ Unsupported output token: ${toToken}\n\n**Supported tokens:** ${getSupportedTokens().join(', ')}\n\nðŸ’¡ Use \`/tip tokens\` to see all supported tokens.`,
    });
    return;
  }

  // Parse amount
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    await interaction.editReply({
      content: 'âŒ Invalid amount. Please enter a positive number.',
    });
    return;
  }

  try {
    // Get swap quote from Jupiter
    const quoteResult = await getSwapQuote(interaction.user.id, fromToken, toToken, amount);

    if (!quoteResult.success || !quoteResult.quote) {
      await interaction.editReply({
        content: `âŒ ${quoteResult.error || 'Failed to get swap quote'}`,
      });
      return;
    }

    const { quote, outputAmount, priceImpactPct, routeDescription } = quoteResult;

    // Create swap transaction
    const wallet = getWallet(interaction.user.id);
    if (!wallet) {
      await interaction.editReply({ content: 'âŒ Wallet not found.' });
      return;
    }

    const swapResult = await createSwapTransaction(connection, wallet.address, quote);

    if (!swapResult.success || !swapResult.url) {
      await interaction.editReply({
        content: `âŒ ${swapResult.error || 'Failed to create swap transaction'}`,
      });
      return;
    }

    // Create swap button
    const swapButton = new ButtonBuilder()
      .setLabel('ðŸ’± Execute Swap in Wallet')
      .setStyle(ButtonStyle.Link)
      .setURL(swapResult.url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(swapButton);

    // Build response embed
    const priceImpactEmoji = (priceImpactPct || 0) < 1 ? 'âœ…' : (priceImpactPct || 0) < 3 ? 'âš ï¸' : 'ðŸ”´';
    
    const embed = new EmbedBuilder()
      .setColor(0x9945FF) // Jupiter purple
      .setTitle('ðŸ’± Swap Ready')
      .setDescription(
        `**Swap ${amount} ${fromToken} â†’ ${toToken}**\n\n` +
        `ðŸ“¥ Input: ${amount} ${fromToken}\n` +
        `ðŸ“¤ Output: ~${outputAmount?.toFixed(6)} ${toToken}\n` +
        `ðŸ’± Rate: 1 ${fromToken} â‰ˆ ${((outputAmount || 0) / amount).toFixed(6)} ${toToken}\n` +
        `${priceImpactEmoji} Price Impact: ${(priceImpactPct || 0).toFixed(2)}%\n\n` +
        (routeDescription ? `ðŸ›¤ï¸ Route: ${routeDescription}\n\n` : '') +
        '**Tap the button below to execute the swap in your wallet!**'
      )
      .setFooter({ text: 'Powered by Jupiter â€¢ JustTheTip' });

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('[TIP SWAP] Error:', error);
    await interaction.editReply({
      content: `âŒ Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handleTokens(interaction: ChatInputCommandInteraction) {
  const tokens = getSupportedTokens();
  
  const embed = new EmbedBuilder()
    .setColor(0x9945FF)
    .setTitle('ðŸ’± Supported Swap Tokens')
    .setDescription(
      '**Solana Tokens (Jupiter Swap):**\n' +
      tokens.map(t => `â€¢ **${t}**`).join('\n')
    )
    .setFooter({ text: 'Powered by Jupiter â€¢ JustTheTip' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ==================== PRIZE DISTRIBUTION HANDLER ====================

async function handleDistribute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Check if user is admin
  if (!isAdmin(interaction.user.id)) {
    await interaction.editReply({
      content: 'âŒ Only admins can trigger prize distributions.\n\n' +
        'If you want to send SOL to multiple users, use `/tip airdrop` instead.',
    });
    return;
  }

  // Check if user has wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: 'âŒ You need to register a wallet first!\nUse `/tip wallet` â†’ Register (External) to connect your Solana wallet.',
    });
    return;
  }

  const recipientsRaw = interaction.options.getString('recipients', true);
  const totalRaw = interaction.options.getString('total', true);
  const context = (interaction.options.getString('context') || 'custom') as 'trivia' | 'airdrop' | 'custom';

  // Use enhanced NLP parser for total prize amount
  const parseResult = parseAmountNL(totalRaw);
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({
      content: `âŒ ${parseResult.error || 'Invalid total amount.'}\n\nProvide a value like "0.5", "1 sol", or "$100".`,
    });
    return;
  }

  const parsedAmount = parseResult.data;
  let totalPrize = parsedAmount.value;

  // Convert USD to SOL if needed
  if (parsedAmount.currency === 'USD') {
    try {
      const solPrice = pricingOracle.getUsdPrice('SOL');
      totalPrize = parsedAmount.value / solPrice;
    } catch {
      await interaction.editReply({ content: 'âŒ Unable to get current SOL price. Please try again or specify amount in SOL.' });
      return;
    }
  }

  if (totalPrize <= 0) {
    await interaction.editReply({ content: 'âŒ Invalid total amount. Provide a positive value.' });
    return;
  }

  // Extract user IDs from mentions
  const idRegex = /<@!?(\d+)>/g;
  const recipientIds: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(recipientsRaw)) !== null) {
    recipientIds.push(match[1]);
  }

  if (recipientIds.length === 0) {
    await interaction.editReply({
      content: 'âŒ No valid user mentions found. Use space-separated mentions like `@Alice @Bob`.',
    });
    return;
  }

  try {
    const { payerUserId, keypair } = await ensureBotPayerWalletReady();
    const amountPerRecipient = totalPrize / recipientIds.length;

    const result = await executeAirdrop(
      {
        senderId: payerUserId,
        recipientIds,
        amountPerUser: amountPerRecipient,
        currency: 'SOL',
      },
      keypair
    );

    if (!result.success) {
      await interaction.editReply({
        content: `âŒ Failed to settle distribution: ${result.error || 'Unknown error'}`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00AA00)
      .setTitle('ðŸ’¸ Prize Distribution Settled')
      .setDescription(
        `**Total Prize:** ${result.totalAmount.toFixed(4)} SOL\n` +
        `**Recipients:** ${result.recipientCount}\n` +
        `**Per Recipient:** ${amountPerRecipient.toFixed(4)} SOL\n` +
        `**Context:** ${context.charAt(0).toUpperCase() + context.slice(1)}\n` +
        `**Fee:** ${result.fee.toFixed(4)} SOL` +
        (result.signature ? `\n[View Transaction](https://solscan.io/tx/${result.signature})` : '')
      )
      .setFooter({ text: 'Settled from bot wallet â€¢ JustTheTip' });

    await interaction.editReply({
      embeds: [embed],
      components: [],
    });

    console.log(`[TIP DISTRIBUTE] Settled distribution for ${result.recipientCount} recipients`);
  } catch (error) {
    console.error('[TIP DISTRIBUTE] Error:', error);
    await interaction.editReply({
      content: `âŒ Failed to settle distribution: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}





