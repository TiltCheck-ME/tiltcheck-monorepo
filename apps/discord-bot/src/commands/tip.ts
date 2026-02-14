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
  createTipWithFeeRequest,
  createAirdropWithFeeRequest,
  getSwapQuote,
  createSwapTransaction,
  getSupportedTokens,
  isTokenSupported,
  // LTC Bridge imports
  getLtcSwapQuote,
  createLtcDepositAddress,
  getLtcDepositStatus,
  getUserPendingDeposits,
  // Prize distribution imports
  createPrizeDistribution,
  isAdmin,
} from '@tiltcheck/justthetip';
import { lockVault, unlockVault, extendVault, getVaultStatus, type LockVaultRecord } from '@tiltcheck/lockvault';
import { parseAmountNL, formatAmount, parseDurationNL, parseCategory } from '@tiltcheck/natural-language-parser';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { isOnCooldown } from '@tiltcheck/tiltcheck-core';
import { db } from '@tiltcheck/database';
import { Connection } from '@solana/web3.js';

// Active public airdrops - messageId -> airdrop data
const activeAirdrops = new Map<string, {
  hostId: string;
  amountPerUser: number;
  totalSlots: number;
  claimedBy: Set<string>;
  paymentUrl: string;
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
          opt.setName('amount').setDescription('Amount per recipient (e.g. "$7", "0.1 sol", "5 bucks")').setRequired(true)
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
    // LTC deposit - get address to deposit native LTC
    .addSubcommand(sub =>
      sub
        .setName('ltc')
        .setDescription('Deposit native LTC and receive Solana tokens')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('LTC action')
            .setRequired(true)
            .addChoices(
              { name: 'Deposit - Get LTC deposit address', value: 'deposit' },
              { name: 'Quote - Get LTC swap rate', value: 'quote' },
              { name: 'Status - Check deposit status', value: 'status' },
              { name: 'Pending - View pending deposits', value: 'pending' },
            )
        )
        .addStringOption(opt =>
          opt.setName('output')
            .setDescription('Token to receive (SOL, USDC, USDT) - default: SOL')
            .setRequired(false)
            .addChoices(
              { name: 'SOL - Solana', value: 'SOL' },
              { name: 'USDC - USD Coin', value: 'USDC' },
              { name: 'USDT - Tether', value: 'USDT' },
            )
        )
        .addStringOption(opt =>
          opt.setName('deposit_id')
            .setDescription('Deposit ID (for status check)')
            .setRequired(false)
        )
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
          content: '❌ Please specify a subcommand:\n' +
            '• `/tip send` - Send SOL to a user\n' +
            '• `/tip airdrop` - Send SOL to multiple users or create public claim\n' +
            '• `/tip wallet` - Manage your wallet\n' +
            '• `/tip balance` - Check your balance\n' +
            '• `/tip lock` - Lock SOL in vault\n' +
            '• `/tip unlock` - Unlock vault\n' +
            '• `/tip extend` - Extend vault lock\n' +
            '• `/tip vaults` - View vault status\n' +
            '• `/tip trivia` - Create trivia airdrop\n' +
            '• `/tip swap` - Swap Solana tokens via Jupiter\n' +
            '• `/tip tokens` - List supported swap tokens\n' +
            '• `/tip ltc` - Deposit native LTC, receive Solana tokens\n' +
            '• `/tip distribute` - (Admin) Create prize distribution',
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
        case 'ltc':
          await handleLtc(interaction);
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
        await interaction.editReply({ content: `❌ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      }
    }
  },
};

// ==================== TIP HANDLERS ====================

async function handleTip(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({
      content: '🚫 You\'re on cooldown and cannot send tips right now. Take a break.',
    });
    return;
  }

  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ You need to register a wallet first!\nUse `/tip wallet` → Register (External) to connect your Solana wallet.',
    });
    return;
  }

  const recipient = interaction.options.getUser('user', true);
  const amountInput = interaction.options.getString('amount', true);

  if (recipient.id === interaction.user.id) {
    await interaction.editReply({ content: '❌ You cannot tip yourself!' });
    return;
  }

  // Use enhanced NLP parser for natural language amounts
  // Handles: "$5", "5 bucks", "five dollars", "0.1 sol", "half a sol", etc.
  const parseResult = parseAmountNL(amountInput);
  
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({
      content: `❌ ${parseResult.error}\n\nExamples: "$5", "five bucks", "0.1 sol", "half a sol", "all"`,
    });
    return;
  }

  const parsedAmount = parseResult.data;

  if (parseResult.needsConfirmation && parseResult.confirmationPrompt) {
    const confirmButton = new ButtonBuilder()
      .setCustomId(`tip_confirm_sol_${recipient.id}_${parsedAmount.value}`)
      .setLabel(`Yes, ${parsedAmount.value} SOL`)
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('tip_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

    await interaction.editReply({
      content: `⚠️ **Confirmation Needed**\n\n${parseResult.confirmationPrompt}`,
      components: [row],
    });
    return;
  }

  const recipientWallet = getWallet(recipient.id);
  
  if (!recipientWallet) {
    await interaction.editReply({
      content: `⚠️ ${recipient} doesn't have a wallet registered yet.\nYour tip will be held for 24 hours. They can claim it by registering a wallet.`,
    });
    return;
  }

  try {
    const senderWallet = getWallet(interaction.user.id);
    if (!senderWallet) throw new Error('Sender wallet not found');

    const { url } = await createTipWithFeeRequest(
      connection,
      senderWallet.address,
      recipientWallet.address,
      parsedAmount.value,
      `JustTheTip to ${recipient.username}`
    );

    const payButton = new ButtonBuilder()
      .setLabel('💸 Open in Wallet')
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💸 Tip Ready to Send')
      .setDescription(
        `**Recipient:** ${recipient}\n` +
        `**Amount:** ${formatAmount(parsedAmount)}\n` +
        `**Fee:** 0.0007 SOL (~$0.07)\n\n` +
        '**Tap the button below** to open in your wallet:\n' +
        '• Phantom • Solflare • Backpack\n\n' +
        'Your device will ask which wallet to use! 📱'
      )
      .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });

    await interaction.editReply({ embeds: [embed], components: [row] });

  } catch (error) {
    await interaction.editReply({
      content: `❌ Failed to create payment request: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handleAirdrop(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({ content: '❌ You need to register a wallet first using `/tip wallet`.' });
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
      content: `❌ ${parseResult.error}\n\nExamples: "$5", "five bucks", "0.1 sol", "7 dollars"`,
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
      await interaction.editReply({ content: '❌ Unable to get current SOL price. Please try again or specify amount in SOL.' });
      return;
    }
  }

  if (amountPerRecipientSOL <= 0) {
    await interaction.editReply({ content: '❌ Invalid amount. Provide a positive value like `$5` or `0.05 sol`.' });
    return;
  }

  // Check if this is a public airdrop
  const isPublic = !recipientsRaw || recipientsRaw.toLowerCase().trim() === 'public';

  if (isPublic) {
    // Create a public claim airdrop
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
    await interaction.editReply({ content: '❌ No valid user mentions found. Use space-separated mentions like `@Alice @Bob`, or use "public" for anyone to claim.' });
    return;
  }

  const senderWallet = getWallet(interaction.user.id);
  if (!senderWallet) {
    await interaction.editReply({ content: '❌ Sender wallet not found after registration.' });
    return;
  }

  const walletAddresses: string[] = [];
  const missingWallets: string[] = [];
  for (const uid of userIds) {
    const w = getWallet(uid);
    if (w) walletAddresses.push(w.address); else missingWallets.push(uid);
  }

  if (walletAddresses.length === 0) {
    await interaction.editReply({ content: '❌ None of the mentioned users have registered wallets yet.' });
    return;
  }

  try {
    const { url } = await createAirdropWithFeeRequest(
      connection,
      senderWallet.address,
      walletAddresses,
      amountPerRecipientSOL,
    );

    const payButton = new ButtonBuilder()
      .setLabel('🚀 Open Airdrop in Wallet')
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

    const totalSOL = amountPerRecipientSOL * walletAddresses.length;
    const feeText = process.env.JUSTTHETIP_FEE_WALLET ? '0.0007 SOL' : 'None (fee wallet not configured)';

    // Display both SOL and USD value if USD was input
    const amountDisplay = parsedAmount.currency === 'USD'
      ? `${formatAmount(parsedAmount)} (~${amountPerRecipientSOL.toFixed(4)} SOL)`
      : `${amountPerRecipientSOL.toFixed(4)} SOL`;

    const embed = new EmbedBuilder()
      .setColor(0x8844ff)
      .setTitle('🚀 Airdrop Ready')
      .setDescription(
        `**Recipients:** ${walletAddresses.length}\n` +
        `**Amount Each:** ${amountDisplay}\n` +
        `**Total (excluding fee):** ${totalSOL.toFixed(4)} SOL\n` +
        `**Fee:** ${feeText}\n\n` +
        'Tap the button below to open the unsigned transaction in your wallet.'
      )
      .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });

    let missingNote = '';
    if (missingWallets.length > 0) {
      missingNote = `\n⚠️ Skipped ${missingWallets.length} user(s) without wallets.`;
    }

    await interaction.editReply({ embeds: [embed], components: [row], content: missingNote });
  } catch (error) {
    await interaction.editReply({ content: `❌ Failed to build airdrop transaction: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}

async function handlePublicAirdrop(interaction: ChatInputCommandInteraction, amountPerUser: number, slots: number, parsedAmount?: { value: number; currency: 'SOL' | 'USD' }) {
  const senderWallet = getWallet(interaction.user.id);
  if (!senderWallet) {
    await interaction.editReply({ content: '❌ Wallet not found.' });
    return;
  }

  // For public airdrops, we'll create a claimable link that generates payment requests on-demand
  const feeText = process.env.JUSTTHETIP_FEE_WALLET ? '0.0007 SOL per claim' : 'None';

  const claimButton = new ButtonBuilder()
    .setCustomId(`airdrop_claim_${interaction.id}`)
    .setLabel('🎁 Claim Airdrop')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

  // Display both SOL and USD value if USD was input
  const amountDisplay = parsedAmount && parsedAmount.currency === 'USD'
    ? `$${parsedAmount.value.toFixed(2)} USD (~${amountPerUser.toFixed(4)} SOL)`
    : `${amountPerUser.toFixed(4)} SOL`;

  const embed = new EmbedBuilder()
    .setColor(0xFF6B00)
    .setTitle('🎁 Public Airdrop')
    .setDescription(
      `**Amount per claim:** ${amountDisplay}\n` +
      `**Total slots:** ${slots}\n` +
      `**Claimed:** 0/${slots}\n` +
      `**Fee:** ${feeText}\n\n` +
      '**Click the button below to claim!**\n' +
      'First come, first served. Each user can claim once.'
    )
    .setFooter({ text: `Hosted by ${interaction.user.username} • JustTheTip` });

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });

  // Store airdrop data for claim handling
  activeAirdrops.set(reply.id, {
    hostId: interaction.user.id,
    amountPerUser,
    totalSlots: slots,
    claimedBy: new Set(),
    paymentUrl: '', // Generated per claim
    createdAt: Date.now(),
  });

  // Auto-cleanup after 1 hour
  setTimeout(() => {
    activeAirdrops.delete(reply.id);
  }, 60 * 60 * 1000);
}

async function handleWallet(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);

  if (action === 'view') {
    const wallet = getWallet(interaction.user.id);
    
    if (!wallet) {
      await interaction.reply({
        content: '❌ No wallet registered. Use `/tip wallet` → Register (External)',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💳 Your Wallet')
      .addFields(
        { name: 'Address', value: `\`${wallet.address}\``, inline: false },
        { name: 'Type', value: wallet.type, inline: true },
        { name: 'Registered', value: `<t:${Math.floor(wallet.registeredAt / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-magic') {
    // Check if user already has a Degen Identity with magic address
    if (db.isConnected()) {
      try {
        const identity = await db.getDegenIdentity(interaction.user.id);
        if (identity?.magic_address) {
          await interaction.reply({
            content: `✅ You already have a **Degen Identity** wallet linked:\n\`${identity.magic_address}\``,
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
      .setTitle('✨ Register with Magic Link')
      .setDescription('Connect your email to create a secure **Soft-Custody** wallet for tipping and vaulting.')
      .addFields(
        { name: 'Step 1', value: `[Click here to open Dashboard](${linkUrl})` },
        { name: 'Step 2', value: 'Login with your Email' },
        { name: 'Step 3', value: 'Link your Discord account' }
      )
      .setFooter({ text: 'TiltCheck • Trust & Safety' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-external') {
    const address = interaction.options.getString('address');
    
    if (!address) {
      await interaction.reply({
        content: '❌ Please provide your Solana wallet address:\n' +
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
        .setTitle('✅ Wallet Registered!')
        .setDescription('Your external wallet has been connected')
        .addFields(
          { name: 'Address', value: `\`${wallet.address}\``, inline: false },
          { name: 'Type', value: 'External', inline: true },
        )
        .setFooter({ text: 'You can now send and receive tips!' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({
        content: `❌ ${error instanceof Error ? error.message : 'Invalid wallet address'}`,
        ephemeral: true,
      });
    }
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ No wallet registered. Use `/tip wallet` → Register (External)',
    });
    return;
  }

  try {
    const balance = await getWalletBalance(interaction.user.id);
    const wallet = getWallet(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('💰 Wallet Balance')
      .addFields(
        { name: 'Balance', value: `${balance.toFixed(6)} SOL`, inline: true },
        { name: 'Address', value: `\`${wallet?.address}\``, inline: false },
      )
      .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply({
      content: `❌ Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    await interaction.reply({ content: `❌ ${parsedAmount.error}\n\nExamples: "$100", "fifty bucks", "0.5 sol", "all"`, ephemeral: true });
    return;
  }

  const parsedDuration = parseDurationNL(durationRaw);
  if (!parsedDuration.success || !parsedDuration.data) {
    await interaction.reply({ content: `❌ ${parsedDuration.error}\n\nExamples: "24h", "a day", "1 week", "twelve hours"`, ephemeral: true });
    return;
  }

  try {
    const vault = await lockVault({ userId: interaction.user.id, amountRaw, durationRaw, reason });
    const embed = new EmbedBuilder()
      .setColor(0x8A2BE2)
      .setTitle('🔒 Vault Locked')
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
    await interaction.reply({ content: `❌ ${(err as Error).message}`, ephemeral: true });
  }
}

async function handleVaultUnlock(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  try {
    const vault = unlockVault(interaction.user.id, id);
    const embed = new EmbedBuilder()
      .setColor(0x00AA00)
      .setTitle('✅ Vault Unlocked')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'Released', value: `${vault.lockedAmountSOL === 0 ? 'ALL' : vault.lockedAmountSOL.toFixed(4)} SOL eq` },
      )
      .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `❌ ${(err as Error).message}`, ephemeral: true });
  }
}

async function handleVaultExtend(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  const additional = interaction.options.getString('additional', true);
  try {
    const vault = extendVault(interaction.user.id, id, additional);
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('⏫ Vault Extended')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'New Unlock', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>` },
        { name: 'Extensions', value: `${vault.extendedCount}` },
      )
      .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `❌ ${(err as Error).message}`, ephemeral: true });
  }
}

async function handleVaultStatus(interaction: ChatInputCommandInteraction) {
  const vaults = getVaultStatus(interaction.user.id);
  if (vaults.length === 0) {
    await interaction.reply({ content: 'ℹ️ No active vaults.', ephemeral: true });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(0x1E90FF)
    .setTitle('🔒 Your Vaults')
    .setDescription(vaults.map((v: LockVaultRecord) => 
      `• **${v.id}** – ${v.status} – unlocks <t:${Math.floor(v.unlockAt/1000)}:R> – ${v.lockedAmountSOL===0? 'ALL' : v.lockedAmountSOL.toFixed(4)+' SOL'}`
    ).join('\n'))
    .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });
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
  
  // Check if there's already an active round in this channel
  if (activeTriviaRounds.has(channelId)) {
    await interaction.reply({ 
      content: '❌ There\'s already an active trivia round in this channel! Wait for it to end.',
      ephemeral: true 
    });
    return;
  }

  // Check if host has a wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.reply({
      content: '❌ You need to register a wallet first to host trivia!\nUse `/tip wallet` → Register (External)',
      ephemeral: true,
    });
    return;
  }

  const prizeInput = interaction.options.getString('prize', true);
  const timeInput = interaction.options.getString('time') || '15s';
  const categoryInput = interaction.options.getString('category');
  
  // Use enhanced NLP for category (handles "crypto stuff", "poker trivia", etc.)
  // Random category if not specified
  const category = categoryInput 
    ? parseCategory(categoryInput) || categoryInput 
    : allCategories[Math.floor(Math.random() * allCategories.length)];

  // Parse prize amount using enhanced NLP
  // Handles: "$5", "five bucks", "0.1 sol", "half a sol", etc.
  const prizeResult = parseAmountNL(prizeInput);
  if (!prizeResult.success || !prizeResult.data) {
    await interaction.reply({ 
      content: `❌ Invalid prize amount: ${prizeResult.error}\n\nExamples: "$5", "five bucks", "0.1 sol", "half a sol"`,
      ephemeral: true 
    });
    return;
  }

  // Parse time using enhanced NLP
  // Handles: "15s", "15 secs", "thirty seconds", "1 min", "half a minute", etc.
  const timeResult = parseDurationNL(timeInput);
  let timeLimitMs: number;
  
  if (!timeResult.success || !timeResult.data) {
    // Try parsing as just a number (assume seconds)
    const numericTime = parseInt(timeInput);
    if (!isNaN(numericTime) && numericTime >= 10 && numericTime <= 120) {
      timeLimitMs = numericTime * 1000;
    } else {
      await interaction.reply({ 
        content: `❌ Invalid time format: ${timeResult.error || 'Could not parse'}\n\nExamples: "15s", "thirty seconds", "1 min", "half a minute"`,
        ephemeral: true 
      });
      return;
    }
  } else {
    timeLimitMs = timeResult.data.milliseconds;
  }

  // Clamp time to reasonable trivia bounds (10s - 2min)
  timeLimitMs = Math.max(10000, Math.min(120000, timeLimitMs));
  const timeLimitSecs = Math.round(timeLimitMs / 1000);

  const prizeSOL = prizeResult.data.value;
  const prizeDisplay = formatAmount(prizeResult.data);

  // Get a random question from the category
  const questions = triviaQuestions[category] || triviaQuestions.general;
  const questionData = questions[Math.floor(Math.random() * questions.length)];

  // Store the active round
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

  // Format time display
  const timeDisplay = timeLimitSecs >= 60 
    ? `${Math.floor(timeLimitSecs / 60)}m ${timeLimitSecs % 60}s`
    : `${timeLimitSecs}s`;

  // Build the question embed
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🎯 TRIVIA DROP!')
    .setDescription(`**${questionData.q}**`)
    .addFields(
      { name: '💰 Prize Pool', value: prizeDisplay, inline: true },
      { name: '⏱️ Time', value: timeDisplay, inline: true },
      { name: '📁 Category', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
    )
    .setFooter({ text: `Hosted by ${interaction.user.username} • Type your answer in chat! • Prize split among all winners` });

  if (questionData.choices) {
    embed.addFields({
      name: 'Options',
      value: questionData.choices.map((c, i) => `**${String.fromCharCode(65 + i)}.** ${c}`).join('\n'),
    });
  }

  await interaction.reply({ embeds: [embed] });

  // Set up message collector for answers
  const channel = interaction.channel;
  if (!channel || !('createMessageCollector' in channel)) {
    activeTriviaRounds.delete(channelId);
    return;
  }

  const collector = channel.createMessageCollector({
    time: timeLimitMs,
    filter: (m) => !m.author.bot,
  });

  collector.on('collect', (message) => {
    const round = activeTriviaRounds.get(channelId);
    if (!round) return;

    const userAnswer = message.content.toLowerCase().trim();
    const correctAnswer = round.answer;

    // Check if answer matches (exact or partial match or choice letter)
    let isCorrect = userAnswer === correctAnswer || correctAnswer.includes(userAnswer);
    
    // Also check choice letters (A, B, C, D) - case insensitive
    if (!isCorrect && round.choices) {
      const letterMatch = userAnswer.match(/^([a-d])\.?$/i);
      if (letterMatch) {
        const letterIndex = letterMatch[1].toLowerCase().charCodeAt(0) - 97; // a=0, b=1, etc
        if (letterIndex >= 0 && letterIndex < round.choices.length) {
          isCorrect = round.choices[letterIndex].toLowerCase() === correctAnswer;
        }
      }
      // Also check if they typed the full answer text
      if (!isCorrect) {
        isCorrect = round.choices.some(c => c.toLowerCase() === userAnswer);
      }
    }

    if (isCorrect && !round.correctUsers.has(message.author.id)) {
      round.correctUsers.add(message.author.id);
      message.react('✅').catch(() => {});
    }
  });

  collector.on('end', async () => {
    const round = activeTriviaRounds.get(channelId);
    activeTriviaRounds.delete(channelId);
    
    if (!round) return;

    const winners = Array.from(round.correctUsers);
    const correctAnswerDisplay = round.choices?.find(c => c.toLowerCase() === round.answer) || round.answer;
    
    if (winners.length === 0) {
      // No winners
      const noWinnerEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('⏰ Time\'s Up!')
        .setDescription(`Nobody got it right!\n\n**Correct answer:** ${correctAnswerDisplay}`)
        .setFooter({ text: 'Prize returned to host • Better luck next time!' });
      
      await channel.send({ embeds: [noWinnerEmbed] });
    } else {
      // Split prize among winners
      const prizePerWinner = round.prize / winners.length;
      const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
      
      const winnerEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎉 We Have Winners!')
        .setDescription(
          `**Correct answer:** ${correctAnswerDisplay}\n\n` +
          `**Winners (${winners.length}):** ${winnerMentions}\n\n` +
          `**Prize per winner:** ${prizePerWinner.toFixed(4)} SOL (~$${(prizePerWinner * 100).toFixed(2)})`
        )
        .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });
      
      await channel.send({ embeds: [winnerEmbed] });

      // Distribute prizes via Solana Pay
      try {
        const result = await createPrizeDistribution(
          connection,
          round.hostId,
          winners,
          round.prize,
          'trivia'
        );

        if (result.success && result.distribution && result.paymentUrl) {
          // Create button for host to sign the transaction
          const payButton = new ButtonBuilder()
            .setLabel('💰 Distribute Prizes')
            .setStyle(ButtonStyle.Link)
            .setURL(result.paymentUrl);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

          const distributionEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💸 Prize Distribution Ready')
            .setDescription(
              `**Total Prize:** ${round.prize.toFixed(4)} SOL\n` +
              `**Winners:** ${winners.length}\n` +
              `**Per Winner:** ${prizePerWinner.toFixed(4)} SOL\n` +
              (result.skippedRecipients && result.skippedRecipients.length > 0 
                ? `\n⚠️ Skipped ${result.skippedRecipients.length} winner(s) without wallets.`
                : '') +
              '\n\n**Host:** Click the button below to sign and distribute prizes!'
            )
            .setFooter({ text: `Distribution ID: ${result.distribution.id} • JustTheTip` });

          await channel.send({ 
            content: `<@${round.hostId}> 📣 Sign to distribute prizes:`, 
            embeds: [distributionEmbed], 
            components: [row] 
          });

          console.log(`[Trivia] Prize distribution created: ${result.distribution.id}`);
        } else {
          // Handle distribution creation failure
          console.error('[Trivia] Failed to create prize distribution:', result.error);

          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF6600)
            .setTitle('⚠️ Prize Distribution Issue')
            .setDescription(
              `Unable to create automatic prize distribution.\n\n` +
              `**Reason:** ${result.error || 'Unknown error'}\n\n` +
              `Host can manually send prizes using \`/tip airdrop\``
            )
            .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });

          await channel.send({ embeds: [errorEmbed] });
        }
      } catch (error) {
        console.error('[Trivia] Prize distribution error:', error);
        
        const errorEmbed = new EmbedBuilder()
          .setColor(0xFF6600)
          .setTitle('⚠️ Prize Distribution Error')
          .setDescription(
            `An error occurred while setting up prize distribution.\n\n` +
            `**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
            `Host can manually send prizes using \`/tip airdrop\``
          )
          .setFooter({ text: 'JustTheTip • Powered by TiltCheck' });

        await channel.send({ embeds: [errorEmbed] });
      }
    }
  });
}

// ==================== AIRDROP CLAIM HANDLER ====================

export async function handleAirdropClaim(interaction: any, messageId: string) {
  const airdrop = activeAirdrops.get(messageId);
  
  if (!airdrop) {
    await interaction.reply({ content: '❌ This airdrop has expired or is no longer available.', ephemeral: true });
    return;
  }

  const userId = interaction.user.id;

  // Check if user already claimed
  if (airdrop.claimedBy.has(userId)) {
    await interaction.reply({ content: '❌ You have already claimed this airdrop!', ephemeral: true });
    return;
  }

  // Check if slots are full
  if (airdrop.claimedBy.size >= airdrop.totalSlots) {
    await interaction.reply({ content: '❌ All airdrop slots have been claimed!', ephemeral: true });
    return;
  }

  // Check if claimer has a wallet
  const claimerWallet = getWallet(userId);
  if (!claimerWallet) {
    await interaction.reply({ 
      content: '❌ You need to register a wallet first using `/tip wallet` before claiming airdrops.', 
      ephemeral: true 
    });
    return;
  }

  // Get host wallet
  const hostWallet = getWallet(airdrop.hostId);
  if (!hostWallet) {
    await interaction.reply({ content: '❌ Host wallet not found.', ephemeral: true });
    return;
  }

  try {
    // Create a single-recipient airdrop (which is just a tip with a button)
    const { url } = await createTipWithFeeRequest(
      connection,
      hostWallet.address,
      claimerWallet.address,
      airdrop.amountPerUser
    );

    // Mark as claimed
    airdrop.claimedBy.add(userId);

    const payButton = new ButtonBuilder()
      .setLabel('💰 Complete Payment in Wallet')
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

    await interaction.reply({ 
      content: `✅ **Claim Reserved!**\n\nAmount: ${airdrop.amountPerUser} SOL\n\nThe host needs to approve the payment. Click the button below to send them a payment request.`, 
      components: [row],
      ephemeral: true 
    });

    // Update the original message to show new claim count
    const claimed = airdrop.claimedBy.size;
    const remaining = airdrop.totalSlots - claimed;

    const updatedEmbed = new EmbedBuilder()
      .setColor(remaining > 0 ? 0xFF6B00 : 0x666666)
      .setTitle(remaining > 0 ? '🎁 Public Airdrop' : '✅ Airdrop Completed')
      .setDescription(
        `**Amount per claim:** ${airdrop.amountPerUser} SOL\n` +
        `**Total slots:** ${airdrop.totalSlots}\n` +
        `**Claimed:** ${claimed}/${airdrop.totalSlots}\n` +
        `**Fee:** ${process.env.JUSTTHETIP_FEE_WALLET ? '0.0007 SOL per claim' : 'None'}\n\n` +
        (remaining > 0 
          ? '**Click the button below to claim!**\nFirst come, first served. Each user can claim once.'
          : '**All slots claimed!** Thanks for participating.')
      )
      .setFooter({ text: `Hosted by ${interaction.message.embeds[0]?.footer?.text?.split(' • ')[0] || 'Unknown'} • JustTheTip` });

    const claimButton = new ButtonBuilder()
      .setCustomId(`airdrop_claim_${messageId}`)
      .setLabel('🎁 Claim Airdrop')
      .setStyle(ButtonStyle.Success)
      .setDisabled(remaining === 0);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

    await interaction.message.edit({ embeds: [updatedEmbed], components: [buttonRow] });

  } catch (error) {
    // Remove the claim if payment request failed
    airdrop.claimedBy.delete(userId);
    await interaction.reply({ 
      content: `❌ Failed to create payment request: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      ephemeral: true 
    });
  }
}

// ==================== SWAP HANDLERS ====================

async function handleSwap(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Check user has wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ You need to register a wallet first!\nUse `/tip wallet` → Register (External) to connect your Solana wallet.',
    });
    return;
  }

  const fromToken = interaction.options.getString('from', true).toUpperCase();
  const toToken = interaction.options.getString('to', true).toUpperCase();
  const amountStr = interaction.options.getString('amount', true);

  // Validate tokens
  if (!isTokenSupported(fromToken)) {
    await interaction.editReply({
      content: `❌ Unsupported input token: ${fromToken}\n\n**Supported tokens:** ${getSupportedTokens().join(', ')}\n\n💡 Use \`/tip tokens\` to see all supported tokens.`,
    });
    return;
  }

  if (!isTokenSupported(toToken)) {
    await interaction.editReply({
      content: `❌ Unsupported output token: ${toToken}\n\n**Supported tokens:** ${getSupportedTokens().join(', ')}\n\n💡 Use \`/tip tokens\` to see all supported tokens.`,
    });
    return;
  }

  // Parse amount
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    await interaction.editReply({
      content: '❌ Invalid amount. Please enter a positive number.',
    });
    return;
  }

  try {
    // Get swap quote from Jupiter
    const quoteResult = await getSwapQuote(interaction.user.id, fromToken, toToken, amount);

    if (!quoteResult.success || !quoteResult.quote) {
      await interaction.editReply({
        content: `❌ ${quoteResult.error || 'Failed to get swap quote'}`,
      });
      return;
    }

    const { quote, outputAmount, priceImpactPct, routeDescription } = quoteResult;

    // Create swap transaction
    const wallet = getWallet(interaction.user.id);
    if (!wallet) {
      await interaction.editReply({ content: '❌ Wallet not found.' });
      return;
    }

    const swapResult = await createSwapTransaction(connection, wallet.address, quote);

    if (!swapResult.success || !swapResult.url) {
      await interaction.editReply({
        content: `❌ ${swapResult.error || 'Failed to create swap transaction'}`,
      });
      return;
    }

    // Create swap button
    const swapButton = new ButtonBuilder()
      .setLabel('💱 Execute Swap in Wallet')
      .setStyle(ButtonStyle.Link)
      .setURL(swapResult.url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(swapButton);

    // Build response embed
    const priceImpactEmoji = (priceImpactPct || 0) < 1 ? '✅' : (priceImpactPct || 0) < 3 ? '⚠️' : '🔴';
    
    const embed = new EmbedBuilder()
      .setColor(0x9945FF) // Jupiter purple
      .setTitle('💱 Swap Ready')
      .setDescription(
        `**Swap ${amount} ${fromToken} → ${toToken}**\n\n` +
        `📥 Input: ${amount} ${fromToken}\n` +
        `📤 Output: ~${outputAmount?.toFixed(6)} ${toToken}\n` +
        `💱 Rate: 1 ${fromToken} ≈ ${((outputAmount || 0) / amount).toFixed(6)} ${toToken}\n` +
        `${priceImpactEmoji} Price Impact: ${(priceImpactPct || 0).toFixed(2)}%\n\n` +
        (routeDescription ? `🛤️ Route: ${routeDescription}\n\n` : '') +
        '**Tap the button below to execute the swap in your wallet!**'
      )
      .setFooter({ text: 'Powered by Jupiter • JustTheTip' });

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('[TIP SWAP] Error:', error);
    await interaction.editReply({
      content: `❌ Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handleTokens(interaction: ChatInputCommandInteraction) {
  const tokens = getSupportedTokens();
  
  const embed = new EmbedBuilder()
    .setColor(0x9945FF)
    .setTitle('💱 Supported Swap Tokens')
    .setDescription(
      '**Solana Tokens (Jupiter Swap):**\n' +
      tokens.map(t => `• **${t}**`).join('\n') +
      '\n\n**Cross-Chain (LTC Bridge):**\n' +
      '• **LTC** → SOL, USDC, USDT\n\n' +
      '💡 Use `/tip swap from:TOKEN to:TOKEN amount:X` to swap\n' +
      '💡 Use `/tip ltc action:deposit` to deposit native LTC'
    )
    .setFooter({ text: 'Powered by Jupiter & ChangeNOW • JustTheTip' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ==================== LTC BRIDGE HANDLERS ====================

async function handleLtc(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);
  const outputToken = (interaction.options.getString('output') || 'SOL') as 'SOL' | 'USDC' | 'USDT';
  const depositId = interaction.options.getString('deposit_id');

  switch (action) {
    case 'deposit':
      await handleLtcDeposit(interaction, outputToken);
      break;
    case 'quote':
      await handleLtcQuote(interaction, outputToken);
      break;
    case 'status':
      await handleLtcStatus(interaction, depositId);
      break;
    case 'pending':
      await handleLtcPending(interaction);
      break;
    default:
      await interaction.reply({ content: 'Unknown LTC action', ephemeral: true });
  }
}

async function handleLtcDeposit(interaction: ChatInputCommandInteraction, outputToken: 'SOL' | 'USDC' | 'USDT') {
  await interaction.deferReply({ ephemeral: true });

  // Check user has wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ You need to register a Solana wallet first!\n' +
        'Use `/tip wallet` → Register (External) to connect your Solana wallet.\n\n' +
        'Your LTC will be converted and sent to your Solana wallet.',
    });
    return;
  }

  const wallet = getWallet(interaction.user.id);
  if (!wallet) {
    await interaction.editReply({ content: '❌ Wallet not found.' });
    return;
  }

  try {
    // Create LTC deposit address
    const deposit = await createLtcDepositAddress(
      interaction.user.id,
      wallet.address,
      outputToken
    );

    if (!deposit.success || !deposit.ltcAddress) {
      await interaction.editReply({
        content: `❌ ${deposit.error || 'Failed to create deposit address'}`,
      });
      return;
    }

    // Create copy address button (Discord doesn't support clipboard, but we can format nicely)
    const embed = new EmbedBuilder()
      .setColor(0x345D9D) // Litecoin blue
      .setTitle('🪙 LTC Deposit Address')
      .setDescription(
        `Send **native LTC** to this address:\n\n` +
        `\`\`\`\n${deposit.ltcAddress}\n\`\`\`\n` +
        `You will receive **${outputToken}** in your Solana wallet.`
      )
      .addFields(
        { name: '📊 Limits', value: `Min: ${deposit.minAmount} LTC\nMax: ${deposit.maxAmount} LTC`, inline: true },
        { name: '📍 Your Wallet', value: `\`${wallet.address.substring(0, 8)}...${wallet.address.substring(wallet.address.length - 8)}\``, inline: true },
        { name: '⏰ Expires', value: `<t:${Math.floor((deposit.expiresAt || Date.now()) / 1000)}:R>`, inline: true },
      )
      .addFields(
        { name: '💡 Instructions', value: 
          '1. Copy the LTC address above\n' +
          '2. Send LTC from your Litecoin wallet\n' +
          '3. Wait ~15-30 minutes for confirmation\n' +
          '4. Use `/tip ltc action:status` to check progress'
        }
      )
      .setFooter({ text: `Deposit ID: ${deposit.depositId} • JustTheTip LTC Bridge` });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[LTC DEPOSIT] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to create deposit: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handleLtcQuote(interaction: ChatInputCommandInteraction, outputToken: 'SOL' | 'USDC' | 'USDT') {
  await interaction.deferReply({ ephemeral: true });

  try {
    const quoteResult = await getLtcSwapQuote(outputToken, 1); // Quote for 1 LTC

    if (!quoteResult.success || !quoteResult.quote) {
      await interaction.editReply({
        content: `❌ ${quoteResult.error || 'Failed to get quote'}`,
      });
      return;
    }

    const { quote } = quoteResult;

    const embed = new EmbedBuilder()
      .setColor(0x345D9D)
      .setTitle('💱 LTC Swap Quote')
      .setDescription(
        `**1 LTC ≈ ${quote.rate.toFixed(6)} ${outputToken}**\n\n` +
        `Swap your native Litecoin for Solana tokens!`
      )
      .addFields(
        { name: 'Min Deposit', value: `${quote.minAmount} LTC`, inline: true },
        { name: 'Max Deposit', value: `${quote.maxAmount} LTC`, inline: true },
        { name: 'Est. Time', value: `~${quote.estimatedTime} minutes`, inline: true },
        { name: 'Network Fee', value: `~${quote.networkFee} ${outputToken}`, inline: true },
      )
      .addFields(
        { name: '📝 Example', value: 
          `• Send 0.1 LTC → Receive ~${(0.1 * quote.rate).toFixed(4)} ${outputToken}\n` +
          `• Send 1 LTC → Receive ~${quote.rate.toFixed(4)} ${outputToken}\n` +
          `• Send 5 LTC → Receive ~${(5 * quote.rate).toFixed(4)} ${outputToken}`
        }
      )
      .setFooter({ text: 'Rates update in real-time • JustTheTip LTC Bridge' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[LTC QUOTE] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handleLtcStatus(interaction: ChatInputCommandInteraction, depositId: string | null) {
  await interaction.deferReply({ ephemeral: true });

  if (!depositId) {
    // Show all pending deposits for user
    await handleLtcPending(interaction);
    return;
  }

  try {
    const status = await getLtcDepositStatus(depositId);

    if (!status) {
      await interaction.editReply({
        content: `❌ Deposit not found: ${depositId}\n\nUse \`/tip ltc action:pending\` to see your deposits.`,
      });
      return;
    }

    // Status emoji mapping
    const statusEmoji: Record<string, string> = {
      'waiting': '⏳',
      'confirming': '🔄',
      'exchanging': '💱',
      'sending': '📤',
      'finished': '✅',
      'failed': '❌',
      'refunded': '↩️',
      'expired': '⏰',
    };

    const embed = new EmbedBuilder()
      .setColor(status.status === 'finished' ? 0x00FF00 : status.status === 'failed' ? 0xFF0000 : 0x345D9D)
      .setTitle(`${statusEmoji[status.status] || '❓'} LTC Deposit Status`)
      .addFields(
        { name: 'Status', value: status.status.toUpperCase(), inline: true },
        { name: 'Deposit ID', value: depositId.substring(0, 8) + '...', inline: true },
      );

    if (status.ltcAmount) {
      embed.addFields({ name: 'LTC Sent', value: `${status.ltcAmount} LTC`, inline: true });
    }
    if (status.outputAmount) {
      embed.addFields({ name: 'Received', value: `${status.outputAmount}`, inline: true });
    }
    if (status.txHash) {
      embed.addFields({ name: 'Solana TX', value: `\`${status.txHash.substring(0, 16)}...\``, inline: false });
    }
    if (status.ltcTxHash) {
      embed.addFields({ name: 'LTC TX', value: `\`${status.ltcTxHash.substring(0, 16)}...\``, inline: false });
    }

    embed.setFooter({ text: `Last updated: ${new Date(status.updatedAt).toLocaleString()}` });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[LTC STATUS] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handleLtcPending(interaction: ChatInputCommandInteraction) {
  // If already deferred, skip
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  try {
    const deposits = getUserPendingDeposits(interaction.user.id);

    if (deposits.length === 0) {
      await interaction.editReply({
        content: '📋 No pending LTC deposits.\n\nUse `/tip ltc action:deposit` to create a new deposit address.',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x345D9D)
      .setTitle('📋 Pending LTC Deposits')
      .setDescription(
        deposits.map((d, i) => 
          `**${i + 1}.** \`${d.depositId.substring(0, 8)}...\`\n` +
          `   Status: ${d.status} | Output: ${d.outputToken}\n` +
          `   Address: \`${d.ltcAddress.substring(0, 20)}...\`\n` +
          `   Created: <t:${Math.floor(d.createdAt / 1000)}:R>`
        ).join('\n\n')
      )
      .setFooter({ text: 'Use /tip ltc action:status deposit_id:ID to check specific deposit' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[LTC PENDING] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to get deposits: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

// ==================== PRIZE DISTRIBUTION HANDLER ====================

async function handleDistribute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Check if user is admin
  if (!isAdmin(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ Only admins can trigger prize distributions.\n\n' +
        'If you want to send SOL to multiple users, use `/tip airdrop` instead.',
    });
    return;
  }

  // Check if user has wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ You need to register a wallet first!\nUse `/tip wallet` → Register (External) to connect your Solana wallet.',
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
      content: `❌ ${parseResult.error || 'Invalid total amount.'}\n\nProvide a value like "0.5", "1 sol", or "$100".`,
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
      await interaction.editReply({ content: '❌ Unable to get current SOL price. Please try again or specify amount in SOL.' });
      return;
    }
  }

  if (totalPrize <= 0) {
    await interaction.editReply({ content: '❌ Invalid total amount. Provide a positive value.' });
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
      content: '❌ No valid user mentions found. Use space-separated mentions like `@Alice @Bob`.',
    });
    return;
  }

  try {
    const result = await createPrizeDistribution(
      connection,
      interaction.user.id,
      recipientIds,
      totalPrize,
      context
    );

    if (!result.success || !result.distribution || !result.paymentUrl) {
      await interaction.editReply({
        content: `❌ Failed to create prize distribution: ${result.error || 'Unknown error'}`,
      });
      return;
    }

    const prizePerRecipient = result.distribution.prizePerRecipient;
    const recipientCount = result.distribution.recipientIds.length;

    // Create button for signing the transaction
    const payButton = new ButtonBuilder()
      .setLabel('💰 Sign & Distribute')
      .setStyle(ButtonStyle.Link)
      .setURL(result.paymentUrl);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

    const embed = new EmbedBuilder()
      .setColor(0x00AA00)
      .setTitle('💸 Prize Distribution Ready')
      .setDescription(
        `**Total Prize:** ${totalPrize.toFixed(4)} SOL\n` +
        `**Recipients:** ${recipientCount}\n` +
        `**Per Recipient:** ${prizePerRecipient.toFixed(4)} SOL\n` +
        `**Context:** ${context.charAt(0).toUpperCase() + context.slice(1)}\n` +
        `**Fee:** ${process.env.JUSTTHETIP_FEE_WALLET ? '0.0007 SOL' : 'None (fee wallet not configured)'}\n\n` +
        (result.skippedRecipients && result.skippedRecipients.length > 0
          ? `⚠️ Skipped ${result.skippedRecipients.length} user(s) without wallets.\n\n`
          : '') +
        '**Click the button below to sign and distribute prizes!**'
      )
      .setFooter({ text: `Distribution ID: ${result.distribution.id} • JustTheTip` });

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    console.log(`[TIP DISTRIBUTE] Created distribution ${result.distribution.id} for ${recipientCount} recipients`);
  } catch (error) {
    console.error('[TIP DISTRIBUTE] Error:', error);
    await interaction.editReply({
      content: `❌ Failed to create distribution: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

// Attach the handler to the tip command export
(tip as any).handleAirdropClaim = handleAirdropClaim;
