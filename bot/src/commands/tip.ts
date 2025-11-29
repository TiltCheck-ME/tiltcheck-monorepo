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
} from '@tiltcheck/justthetip';
import { lockVault, unlockVault, extendVault, getVaultStatus, type LockVaultRecord } from '@tiltcheck/lockvault';
import { parseAmountNL, formatAmount, parseDurationNL, parseCategory } from '@tiltcheck/natural-language-parser';
import { isOnCooldown } from '@tiltcheck/tiltcheck-core';
import { Connection } from '@solana/web3.js';

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
        .setDescription('Send SOL to multiple users')
        .addStringOption(opt =>
          opt.setName('recipients').setDescription('Space-separated user mentions (e.g. @user1 @user2)').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('amount').setDescription('Amount per recipient in SOL (e.g. 0.1)').setRequired(true)
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
    // Pending tips
    .addSubcommand(sub =>
      sub
        .setName('pending')
        .setDescription('View pending tips sent to you')
    )
    // Vault lock
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
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

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
      case 'pending':
        await handlePending(interaction);
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
      default:
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
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

  const recipientsRaw = interaction.options.getString('recipients', true);
  const amountRaw = interaction.options.getString('amount', true);

  const amountPerRecipient = parseFloat(amountRaw);
  if (isNaN(amountPerRecipient) || amountPerRecipient <= 0) {
    await interaction.editReply({ content: '❌ Invalid amount. Provide a positive SOL value like `0.05`.' });
    return;
  }

  const idRegex = /<@!?(\d+)>/g;
  const userIds: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(recipientsRaw)) !== null) {
    userIds.push(match[1]);
  }

  if (userIds.length === 0) {
    await interaction.editReply({ content: '❌ No valid user mentions found. Use space-separated mentions like `@Alice @Bob`.' });
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
      amountPerRecipient,
    );

    const payButton = new ButtonBuilder()
      .setLabel('🚀 Open Airdrop in Wallet')
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

    const totalSOL = amountPerRecipient * walletAddresses.length;
    const feeText = process.env.JUSTTHETIP_FEE_WALLET ? '0.0007 SOL' : 'None (fee wallet not configured)';

    const embed = new EmbedBuilder()
      .setColor(0x8844ff)
      .setTitle('🚀 Airdrop Ready')
      .setDescription(
        `**Recipients:** ${walletAddresses.length}\n` +
        `**Amount Each:** ${amountPerRecipient} SOL\n` +
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
    await interaction.reply({
      content: '🪄 **Magic Wallet**\n\n' +
        'Magic wallets are disposable, temporary wallets perfect for:\n' +
        '• Users on cooldown who want to limit spending\n' +
        '• Quick, anonymous tips\n' +
        '• Testing without using your main wallet\n\n' +
        '*Coming soon! For now, use Register (External) to connect your Phantom or Solflare wallet.*',
      ephemeral: true,
    });
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
      const wallet = registerExternalWallet(interaction.user.id, address);
      
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

async function handlePending(interaction: ChatInputCommandInteraction) {
  await interaction.reply({
    content: '📋 **Pending Tips**\n\n' +
      'Feature coming soon!\n' +
      'You\'ll be able to see tips sent to you before you registered a wallet.',
    ephemeral: true,
  });
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
    const vault = lockVault({ userId: interaction.user.id, amountRaw, durationRaw, reason });
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

      // TODO: Actually distribute prizes via Solana Pay airdrop
      // In production, would create airdrop transaction to all winners
    }
  });
}
