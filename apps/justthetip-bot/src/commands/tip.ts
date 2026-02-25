/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Tip Command — Credit-based custodial tipping
 *
 * All subcommands operate on credit balances managed by the bot wallet.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonInteraction,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from 'discord.js';
import type { Command } from '../types.js';
import {
  CreditManager,
  FLAT_FEE_LAMPORTS,
  MIN_DEPOSIT_LAMPORTS,
  type DepositMonitor,
} from '@tiltcheck/justthetip';
import { lockVault, unlockVault, extendVault, getVaultStatus, type LockVaultRecord } from '@tiltcheck/lockvault';
import { parseAmountNL, formatAmount, parseDurationNL } from '@tiltcheck/natural-language-parser';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { isOnCooldown } from '@tiltcheck/tiltcheck-core';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { BotWalletService } from '../services/bot-wallet.js';
import type { TokenDepositMonitor } from '../services/token-deposit-monitor.js';
import { DEPOSIT_TOKENS } from '../services/token-swap.js';

// These are injected at startup via setCreditDeps()
let creditManager: CreditManager;
let depositMonitor: DepositMonitor;
let botWallet: BotWalletService;
let tokenDepositMonitor: TokenDepositMonitor | undefined;

export function setCreditDeps(
  cm: CreditManager,
  dm: DepositMonitor,
  bw: BotWalletService,
  tdm?: TokenDepositMonitor
) {
  creditManager = cm;
  depositMonitor = dm;
  botWallet = bw;
  tokenDepositMonitor = tdm;
}

// Active public airdrops - messageId -> airdrop data
const activeAirdrops = new Map<string, {
  hostId: string;
  amountPerUserLamports: number;
  totalSlots: number;
  claimedBy: Set<string>;
}>();

const DAILY_WITHDRAWAL_LIMIT_SOL = 10;

export const tip: Command = {
  data: new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Solana tipping, games, and wallet management')
    // Deposit SOL
    .addSubcommand(sub => sub
      .setName('deposit')
      .setDescription('Get your personal deposit address to load SOL')
    )
    // Deposit any token (auto-swapped to SOL via Jupiter)
    .addSubcommand(sub => sub
      .setName('deposit-token')
      .setDescription('Deposit tokens (USDC, BONK, etc.) -> auto-swapped to SOL')
      .addStringOption(o => o
        .setName('token')
        .setDescription('Token to deposit')
        .setRequired(true)
        .addChoices(
          { name: 'USDC', value: 'USDC' },
          { name: 'USDT', value: 'USDT' },
          { name: 'BONK', value: 'BONK' },
          { name: 'JUP', value: 'JUP' },
          { name: 'RAY', value: 'RAY' },
          { name: 'WBTC (Wormhole)', value: 'WBTC' },
          { name: 'WETH (Wormhole)', value: 'WETH' },
          { name: 'ORCA', value: 'ORCA' },
        )
      )
    )
    // Send
    .addSubcommand(sub => sub
      .setName('send')
      .setDescription('Tip SOL to a specific user instantly')
      .addUserOption(o => o.setName('user').setDescription('User to tip').setRequired(true))
      .addStringOption(o => o.setName('amount').setDescription('Amount (e.g. "$5", "0.1 sol")').setRequired(true))
    )
    // Airdrop
    .addSubcommand(sub => sub
      .setName('airdrop')
      .setDescription('Distribute SOL: specific users OR public claim button')
      .addStringOption(o => o.setName('amount').setDescription('Amount per person (e.g. "$1")').setRequired(true))
      .addStringOption(o => o.setName('recipients').setDescription('Mentions (@user1 @user2) OR "public" for a claim button').setRequired(false))
      .addIntegerOption(o => o.setName('slots').setDescription('Max claims (for public airdrop only)').setRequired(false))
    )
    // Withdraw
    .addSubcommand(sub => sub
      .setName('withdraw')
      .setDescription('Withdraw your balance to an external Solana wallet')
    )
    // Balance
    .addSubcommand(sub => sub
      .setName('balance')
      .setDescription('Check your current balance and wallet status')
    )
    // History
    .addSubcommand(sub => sub
      .setName('history')
      .setDescription('View your recent transaction history')
    )
    // Wallet
    .addSubcommand(sub => sub
      .setName('wallet')
      .setDescription('Link an external Solana wallet for withdrawals')
      .addStringOption(o => o
        .setName('action')
        .setDescription('Wallet action')
        .setRequired(true)
        .addChoices(
          { name: 'View', value: 'view' },
          { name: 'Register (External)', value: 'register-external' },
        ))
      .addStringOption(o => o.setName('address').setDescription('Wallet address (for registration)').setRequired(false))
    )
    // Refund settings
    .addSubcommand(sub => sub
      .setName('refund-settings')
      .setDescription('Configure when your unused balance is auto-refunded')
      .addStringOption(o => o
        .setName('mode')
        .setDescription('Refund mode')
        .setRequired(true)
        .addChoices(
          { name: 'Reset on activity (default)', value: 'reset-on-activity' },
          { name: 'Hard expiry', value: 'hard-expiry' },
        ))
      .addIntegerOption(o => o.setName('days').setDescription('Inactivity days before refund (default: 7)').setRequired(false))
    )
    // Claim
    .addSubcommand(sub => sub
      .setName('claim')
      .setDescription('Manually claim a deposit if it wasn\'t auto-detected')
      .addStringOption(o => o.setName('signature').setDescription('Solana transaction signature').setRequired(true))
    )
    // Lock vault
    .addSubcommand(sub => sub
      .setName('lock')
      .setDescription('Lock funds in a time-vault for self-control')
      .addStringOption(o => o.setName('amount').setDescription('Amount (e.g. "$100", "5 SOL")').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Lock duration (e.g. 24h, 3d)').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Optional reason'))
    )
    // Vault unlock
    .addSubcommand(sub => sub
      .setName('unlock')
      .setDescription('Unlock a vault that has expired')
      .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
    )
    // Vault emergency unlock
    .addSubcommand(sub => sub
      .setName('emergency-unlock')
      .setDescription('Unlock vault early (20% REKT fee applies)')
      .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
    )
    // Vault extend
    .addSubcommand(sub => sub
      .setName('extend')
      .setDescription('Extend the duration of a locked vault')
      .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
      .addStringOption(o => o.setName('additional').setDescription('Additional duration').setRequired(true))
    )
    // Trivia
    .addSubcommand(sub => sub
      .setName('trivia')
      .setDescription('Host a trivia game where the winner gets SOL')
      .addStringOption(o => o.setName('amount').setDescription('Prize amount').setRequired(true))
      .addStringOption(o => o.setName('question').setDescription('The question').setRequired(true))
      .addStringOption(o => o.setName('answer').setDescription('The answer').setRequired(true))
      .addIntegerOption(o => o.setName('duration').setDescription('Duration in seconds (default 60)').setRequired(false))
    )
    // Rain
    .addSubcommand(sub => sub
      .setName('rain')
      .setDescription('Distribute SOL to the most recent active chatters')
      .addStringOption(o => o.setName('amount').setDescription('Total amount to split (e.g. "$10")').setRequired(true))
      .addIntegerOption(o => o.setName('count').setDescription('How many recent users to include (default: 10)').setRequired(false))
    )
    // View vaults
    .addSubcommand(sub => sub
      .setName('vaults')
      .setDescription('View your active locked vaults')
    )
    // Admin
    .addSubcommandGroup(group => group
      .setName('admin')
      .setDescription('Admin commands')
      .addSubcommand(sub => sub.setName('setup-channels').setDescription('Auto-populate server channels'))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case 'deposit': return handleDeposit(interaction);
        case 'deposit-token': return handleDepositToken(interaction);
        case 'send': return handleSend(interaction);
        case 'airdrop': return handleAirdrop(interaction);
        case 'withdraw': return handleWithdraw(interaction);
        case 'balance': return handleBalance(interaction);
        case 'history': return handleHistory(interaction);
        case 'wallet': return handleWallet(interaction);
        case 'refund-settings': return handleRefundSettings(interaction);
        case 'claim': return handleClaim(interaction);
        case 'lock': return handleVaultLock(interaction);
        case 'unlock': return handleVaultUnlock(interaction);
        case 'emergency-unlock': return handleVaultEmergencyUnlock(interaction);
        case 'extend': return handleVaultExtend(interaction);
        case 'vaults': return handleVaultStatus(interaction);
        case 'trivia': return handleTrivia(interaction);
        case 'rain': return handleRain(interaction);
        case 'setup-channels': return handleAdminSetup(interaction);
        default:
          await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
      }
    } catch (error) {
      console.error('[TIP] Command error:', error);
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `Error: ${msg}` });
      } else {
        await interaction.reply({ content: `Error: ${msg}`, ephemeral: true });
      }
    }
  },
};

// ==================== HANDLERS ====================

async function handleDeposit(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({ content: '🚫 You are on cooldown. Deposits are disabled.' });
    return;
  }

  const code = depositMonitor.generateDepositCode(interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('📥 Feed the Bot')
    .setDescription(
      `Send SOL to the address below.\n\n` +
      `**Address:**\n\`\`\`\n${botWallet.address}\n\`\`\`\n` +
      `**Minimum deposit:** ${MIN_DEPOSIT_LAMPORTS / LAMPORTS_PER_SOL} SOL`
    )
    .setFooter({ text: 'JustTheTip • Feed me' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleDepositToken(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({ content: '🚫 You are on cooldown. Deposits are disabled.' });
    return;
  }

  if (!tokenDepositMonitor) {
    await interaction.editReply({ content: '❌ Token deposits are not enabled on this bot instance.' });
    return;
  }

  const tokenSymbol = interaction.options.getString('token', true);
  const tokenInfo = DEPOSIT_TOKENS[tokenSymbol];

  if (!tokenInfo) {
    await interaction.editReply({ content: `❌ Invalid token selected: ${tokenSymbol}` });
    return;
  }

  // Generate a deposit code using the main monitor (ensures JTT-XXXX format and uniqueness)
  const code = depositMonitor.generateDepositCode(interaction.user.id);
  
  // Register with token monitor so it watches for SPL transfers with this memo
  tokenDepositMonitor.registerDepositCode(code, interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(`Deposit ${tokenInfo.name} (${tokenSymbol})`)
    .setDescription(
      `Send **${tokenSymbol}** below.\n` +
      `**The Play:**\n` +
      `1. You send ${tokenSymbol} -> 2. We swap it to SOL (Jupiter) -> 3. We credit your bot balance.\n\n` +
      `**Address:**\n\`\`\`\n${botWallet.address}\n\`\`\`\n` +
      `**Note:** Swap fees and gas apply.`
    )
    .setFooter({ text: 'JustTheTip • We take (almost) anything' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSend(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({ content: '🚫 You\'re on cooldown. Go touch grass.' });
    return;
  }

  const recipient = interaction.options.getUser('user', true);
  const amountInput = interaction.options.getString('amount', true);

  if (recipient.id === interaction.user.id) {
    await interaction.editReply({ content: '🚫 Tipping yourself? That\'s just moving money between pockets.' });
    return;
  }
  if (recipient.bot) {
    await interaction.editReply({ content: '🚫 I don\'t have pockets. Tip a human.' });
    return;
  }

  const parseResult = parseAmountNL(amountInput);
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({ content: `${parseResult.error}\n\nExamples: "$5", "0.1 sol", "five bucks"` });
    return;
  }

  let amountLamports: number;
  let usdValue = 0;
  if (parseResult.data.currency === 'USD') {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    amountLamports = Math.floor((parseResult.data.value / solPrice) * LAMPORTS_PER_SOL);
    usdValue = parseResult.data.value;
  } else {
    amountLamports = Math.floor(parseResult.data.value * LAMPORTS_PER_SOL);
    try {
      const solPrice = pricingOracle.getUsdPrice('SOL');
      usdValue = parseResult.data.value * solPrice;
    } catch (e) { usdValue = 999; /* Assume safe if oracle fails */ }
  }

  if (amountLamports <= 0) {
    await interaction.editReply({ content: '❌ Amount must be greater than 0.' });
    return;
  }

  if (usdValue < 1) {
    await interaction.editReply({ content: '❌ Minimum tip is $1. We don\'t troll the degens.' });
    return;
  }

  // Check if recipient has a wallet
  const recipientBalance = await creditManager.getBalance(recipient.id);
  const recipientWallet = recipientBalance?.wallet_address;

  if (!recipientWallet) {
    // Create pending tip
    try {
      await creditManager.createPendingTip(interaction.user.id, recipient.id, amountLamports);
      await interaction.editReply({
        content: `⚠️ **${recipient}** doesn't have a wallet yet.\n` +
          `I'm holding the ${formatAmount(parseResult.data)} for them. Tell them to run \`/tip wallet register-external\` to claim it.\n` +
          `Tip expires in 7 days if unclaimed.`,
      });
    } catch (err) {
      await interaction.editReply({ content: `${err instanceof Error ? err.message : 'Failed to create tip'}` });
    }
    return;
  }

  try {
    // Deduct credit
    const { senderNewBalance, feeLamports, netAmount } = await creditManager.deductForTip(
      interaction.user.id,
      recipient.id,
      amountLamports
    );

    // Send SOL on-chain
    const signature = await botWallet.sendSOL(recipientWallet, netAmount);

    // Credit recipient's balance record for tracking
    await creditManager.deposit(recipient.id, 0, { memo: 'tip received (on-chain)' }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('Tip Sent!')
      .setDescription(
        `**To:** ${recipient}\n` +
        `**Amount:** ${formatAmount(parseResult.data)}\n` +
        `**Fee:** ${(feeLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL\n` +
        `**Your new balance:** ${(senderNewBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n\n` +
        `[View on Solscan](https://solscan.io/tx/${signature})`
      )
      .setFooter({ text: 'JustTheTip Credit System' });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `${err instanceof Error ? err.message : 'Tip failed'}` });
  }
}

async function handleAirdrop(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({ content: '🚫 You are on cooldown. Airdrops are disabled.' });
    return;
  }

  const amountRaw = interaction.options.getString('amount', true);
  const recipientsRaw = interaction.options.getString('recipients');
  const slots = interaction.options.getInteger('slots') || 10;

  const parseResult = parseAmountNL(amountRaw);
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({ content: `${parseResult.error}\n\nExamples: "$5", "0.1 sol"` });
    return;
  }

  let amountPerLamports: number;
  let usdValue = 0;
  if (parseResult.data.currency === 'USD') {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    amountPerLamports = Math.floor((parseResult.data.value / solPrice) * LAMPORTS_PER_SOL);
    usdValue = parseResult.data.value;
  } else {
    amountPerLamports = Math.floor(parseResult.data.value * LAMPORTS_PER_SOL);
    try {
      const solPrice = pricingOracle.getUsdPrice('SOL');
      usdValue = parseResult.data.value * solPrice;
    } catch (e) { usdValue = 999; }
  }

  if (amountPerLamports <= 0) {
    await interaction.editReply({ content: '❌ Amount must be greater than 0.' });
    return;
  }

  if (usdValue < 1) {
    await interaction.editReply({ content: '❌ Minimum airdrop is $1 per person. Don\'t be cheap.' });
    return;
  }

  // Check for public airdrop
  if (!recipientsRaw || recipientsRaw.toLowerCase().trim() === 'public') {
    return handlePublicAirdrop(interaction, amountPerLamports, slots, parseResult.data);
  }

  // Extract user IDs
  const idRegex = /<@!?(\d+)>/g;
  const userIds: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(recipientsRaw)) !== null) {
    const id = match[1];
    if (id !== interaction.user.id) userIds.push(id); // Filter self
  }

  if (userIds.length === 0) {
    await interaction.editReply({ content: 'No valid user mentions found. Use @user1 @user2 format.' });
    return;
  }

  try {
    const { senderNewBalance, totalDeducted, results } = await creditManager.deductForAirdrop(
      interaction.user.id,
      userIds,
      amountPerLamports
    );

    // Send SOL to each recipient with a wallet
    const sent: string[] = [];
    const credited: string[] = [];

    for (const { recipientId, amount } of results) {
      const bal = await creditManager.getBalance(recipientId);
      if (bal?.wallet_address) {
        try {
          await botWallet.sendSOL(bal.wallet_address, amount);
          sent.push(recipientId);
        } catch (err) {
          console.error(`[Airdrop] Failed to send to ${recipientId}, crediting internal balance:`, err);
          await creditManager.deposit(recipientId, amount, { memo: 'airdrop received (fallback)' });
          credited.push(recipientId);
        }
      } else {
        await creditManager.deposit(recipientId, amount, { memo: 'airdrop received' });
        credited.push(recipientId);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x8844FF)
      .setTitle('🚀 Air Support Inbound')
      .setDescription(
        `Spreading the wealth like a true philanthropist.\n\n` +
        `**Amount per person:** ${formatAmount(parseResult.data)}\n` +
        `**Sent (On-chain):** ${sent.length} user(s)\n` +
        `**Credited (Internal):** ${credited.length} user(s)\n` +
        `**Total deducted:** ${(totalDeducted / LAMPORTS_PER_SOL).toFixed(4)} SOL (incl fee)\n` +
        `**Remaining:** ${(senderNewBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`
      )
      .setFooter({ text: 'JustTheTip • Making it rain' });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `${err instanceof Error ? err.message : 'Airdrop failed'}` });
  }
}

async function handlePublicAirdrop(
  interaction: ChatInputCommandInteraction,
  amountLamports: number,
  slots: number,
  parsedAmount: any
) {
  // Check balance for at least one claim (optional pre-check)
  const balance = await creditManager.getBalance(interaction.user.id);
  if ((balance?.balance_lamports ?? 0) < amountLamports) {
     await interaction.editReply({ content: '❌ Insufficient funds to start this airdrop.' });
     return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xFF6B00)
    .setTitle('🎁 Free Loot')
    .setDescription(
      `**Amount per claim:** ${formatAmount(parsedAmount)}\n` +
      `**Total slots:** ${slots}\n` +
      `**Claimed:** 0/${slots}\n\n` +
      '**Click the button below to snag it!**\n' +
      'Fastest fingers win. Good luck.'
    )
    .setFooter({ text: `Hosted by ${interaction.user.username} • JustTheTip` });

  const claimButton = new ButtonBuilder()
    .setCustomId('jtt_airdrop_claim')
    .setLabel('Snag It')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

  const reply = await interaction.editReply({ embeds: [embed], components: [row] });

  activeAirdrops.set(reply.id, {
    hostId: interaction.user.id,
    amountPerUserLamports: amountLamports,
    totalSlots: slots,
    claimedBy: new Set(),
  });
}

async function handleAirdropClaim(interaction: ButtonInteraction) {
  const airdrop = activeAirdrops.get(interaction.message.id);
  
  if (!airdrop) {
    await interaction.reply({ content: '❌ This airdrop has expired or is invalid.', ephemeral: true });
    return;
  }

  if (airdrop.claimedBy.has(interaction.user.id)) {
    await interaction.reply({ content: '❌ Greedy! You already grabbed this one.', ephemeral: true });
    return;
  }

  if (airdrop.claimedBy.size >= airdrop.totalSlots) {
    await interaction.reply({ content: '❌ Too slow! The vultures picked it clean.', ephemeral: true });
    return;
  }

  if (interaction.user.id === airdrop.hostId) {
    await interaction.reply({ content: '❌ Nice try. You can\'t claim your own loot.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Deduct from host
    const { netAmount } = await creditManager.deductForTip(
      airdrop.hostId,
      interaction.user.id,
      airdrop.amountPerUserLamports
    );

    // Credit claimer (Try on-chain first if wallet exists, else internal)
    const claimerBal = await creditManager.getBalance(interaction.user.id);
    if (claimerBal?.wallet_address) {
       try {
         await botWallet.sendSOL(claimerBal.wallet_address, netAmount);
         await interaction.editReply({ content: `✅ Yoink! Sent to your wallet: \`${claimerBal.wallet_address}\`` });
       } catch (e) {
         // Fallback to internal
         await creditManager.deposit(interaction.user.id, netAmount, { memo: 'airdrop claim (fallback)' });
         await interaction.editReply({ content: `✅ Yoink! Credited to your internal balance (on-chain send failed).` });
       }
    } else {
       await creditManager.deposit(interaction.user.id, netAmount, { memo: 'airdrop claim' });
       await interaction.editReply({ content: `✅ Yoink! Added to your stash.` });
    }

    airdrop.claimedBy.add(interaction.user.id);

    // Update message
    const claimedCount = airdrop.claimedBy.size;
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setDescription(
      embed.data.description!.replace(/Claimed: \d+\/\d+/, `Claimed: ${claimedCount}/${airdrop.totalSlots}`)
    );

    if (claimedCount >= airdrop.totalSlots) {
       embed.setColor(0x808080); // Grey out
       const row = ActionRowBuilder.from(interaction.message.components[0] as any);
       row.components[0].setDisabled(true);
       await interaction.message.edit({ embeds: [embed], components: [row as any] });
    } else {
       await interaction.message.edit({ embeds: [embed] });
    }
  } catch (err) {
    await interaction.editReply({ content: `❌ Claim failed: ${err instanceof Error ? err.message : 'Insufficient funds in host wallet?'}` });
  }
}

async function handleWithdraw(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const { amountLamports, walletAddress } = await creditManager.withdraw(interaction.user.id);

    if (amountLamports <= 0) {
      await interaction.editReply({ content: '❌ No funds available to withdraw.' });
      return;
    }

    const signature = await botWallet.sendSOL(walletAddress, amountLamports);

    const embed = new EmbedBuilder()
      .setColor(0x00AA00)
      .setTitle('Withdrawal Complete')
      .setDescription(
        `**Amount:** ${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL\n` +
        `**To:** \`${walletAddress}\`\n\n` +
        `[View on Solscan](https://solscan.io/tx/${signature})`
      )
      .setFooter({ text: 'JustTheTip Credit System' });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `${err instanceof Error ? err.message : 'Withdrawal failed'}` });
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const balance = await creditManager.getBalance(interaction.user.id);

  const balLamports = balance?.balance_lamports ?? 0;
  const solAmount = (balLamports / LAMPORTS_PER_SOL).toFixed(4);

  let usdValue = '';
  try {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    usdValue = ` (~$${((balLamports / LAMPORTS_PER_SOL) * solPrice).toFixed(2)})`;
  } catch { /* price unavailable */ }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('💰 The Stash')
    .addFields(
      { name: 'Balance', value: `${solAmount} SOL${usdValue}`, inline: true },
      { name: 'Wallet', value: balance?.wallet_address ? `\`${balance.wallet_address.slice(0, 8)}...${balance.wallet_address.slice(-8)}\`` : 'Not registered', inline: true },
    );

  if (balance) {
    embed.addFields(
      { name: 'Total Deposited', value: `${(balance.total_deposited_lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`, inline: true },
      { name: 'Total Tipped', value: `${(balance.total_tipped_lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`, inline: true },
      { name: 'Total Fees', value: `${(balance.total_fees_lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`, inline: true },
      { name: 'Refund Mode', value: balance.refund_mode === 'reset-on-activity'
        ? `Reset on activity (${balance.inactivity_days}d)`
        : `Hard expiry${balance.hard_expiry_at ? ` (<t:${Math.floor(new Date(balance.hard_expiry_at).getTime() / 1000)}:R>)` : ''}`,
        inline: true },
    );
  }

  embed.setFooter({ text: 'JustTheTip • Don\'t spend it all in one place' });
  await interaction.editReply({ embeds: [embed] });
}

async function handleHistory(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const txs = await creditManager.getTransactionHistory(interaction.user.id, 15);

  if (txs.length === 0) {
    await interaction.editReply({ content: 'Clean slate. No history yet. Use `/tip deposit` to load up.' });
    return;
  }

  const lines = txs.map(tx => {
    const sign = tx.amount_lamports >= 0 ? '+' : '';
    const sol = (tx.amount_lamports / LAMPORTS_PER_SOL).toFixed(4);
    const time = `<t:${Math.floor(new Date(tx.created_at).getTime() / 1000)}:R>`;
    const type = tx.type.replace(/_/g, ' ');
    return `\`${sign}${sol} SOL\` ${type} ${time}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x1E90FF)
    .setTitle('Transaction History')
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Showing last ${txs.length} transactions` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleWallet(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);

  if (action === 'view') {
    const balance = await creditManager.getBalance(interaction.user.id);

    if (!balance?.wallet_address) {
      await interaction.reply({
        content: 'No wallet registered. Use `/tip wallet register-external address:<your-address>`',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💳 Your Wallet')
      .addFields(
        { name: 'Address', value: `\`${balance.wallet_address}\``, inline: false },
        { name: 'Refund Mode', value: balance.refund_mode, inline: true },
        { name: 'Inactivity Days', value: `${balance.inactivity_days}`, inline: true },
      )
      .setFooter({ text: 'JustTheTip • Funds SAFU' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-external') {
    const address = interaction.options.getString('address');

    if (!address) {
      await interaction.reply({
        content: 'Please provide your Solana wallet address:\n`/tip wallet register-external address:<your-address>`',
        ephemeral: true,
      });
      return;
    }

    // Basic validation — Solana addresses are 32-44 base58 chars
    if (address.length < 32 || address.length > 44) {
      await interaction.reply({ content: 'Invalid Solana address.', ephemeral: true });
      return;
    }

    try {
      await creditManager.registerWallet(interaction.user.id, address);

      // Process any pending tips
      const claimed = await creditManager.processPendingTipsForUser(interaction.user.id);

      let extraMsg = '';
      if (claimed > 0) {
        extraMsg = `\n\n${claimed} pending tip(s) have been credited to your balance!`;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔗 Linked Up')
        .setDescription(`\`${address}\`${extraMsg}`)
        .setFooter({ text: 'You are now ready to receive funds.' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await interaction.reply({
        content: `${err instanceof Error ? err.message : 'Registration failed'}`,
        ephemeral: true,
      });
    }
  }
}

async function handleRefundSettings(interaction: ChatInputCommandInteraction) {
  const mode = interaction.options.getString('mode', true) as 'reset-on-activity' | 'hard-expiry';
  const days = interaction.options.getInteger('days') || 7;

  try {
    const settings: { refundMode: 'reset-on-activity' | 'hard-expiry'; inactivityDays: number; hardExpiryAt?: string | null } = {
      refundMode: mode,
      inactivityDays: days,
    };

    if (mode === 'hard-expiry') {
      settings.hardExpiryAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    } else {
      settings.hardExpiryAt = null;
    }

    await creditManager.updateRefundSettings(interaction.user.id, settings);

    await interaction.reply({
      content: `Refund settings updated:\n` +
        `**Mode:** ${mode}\n` +
        `**Days:** ${days}\n\n` +
        (mode === 'reset-on-activity'
          ? 'Your balance will be auto-refunded after ' + days + ' days of inactivity. Activity resets the timer.'
          : 'Your balance will be auto-refunded in ' + days + ' days regardless of activity.'),
      ephemeral: true,
    });
  } catch (err) {
    await interaction.reply({
      content: `${err instanceof Error ? err.message : 'Failed to update settings'}`,
      ephemeral: true,
    });
  }
}

async function handleClaim(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({ content: '🚫 You are on cooldown. Claiming deposits is disabled.' });
    return;
  }

  const signature = interaction.options.getString('signature', true);

  const result = await depositMonitor.claimDeposit(interaction.user.id, signature);

  if (!result) {
    await interaction.editReply({
      content: 'Could not claim this transaction.\n' +
        'Make sure the signature is correct and the SOL was sent to the bot wallet.',
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('Deposit Claimed!')
    .setDescription(
      `**Amount:** ${(result.amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL\n\n` +
      `[View on Solscan](https://solscan.io/tx/${signature})`
    )
    .setFooter({ text: 'JustTheTip Credit System' });

  await interaction.editReply({ embeds: [embed] });
}

// ==================== VAULT HANDLERS ====================

async function handleVaultLock(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const amountRaw = interaction.options.getString('amount', true);
  const durationRaw = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') || undefined;

  const parsedAmount = parseAmountNL(amountRaw);
  if (!parsedAmount.success || !parsedAmount.data) {
    await interaction.editReply({ content: `${parsedAmount.error}` });
    return;
  }

  const parsedDuration = parseDurationNL(durationRaw);
  if (!parsedDuration.success || !parsedDuration.data) {
    await interaction.editReply({ content: `${parsedDuration.error}` });
    return;
  }

  // Calculate lamports
  let amountLamports: number;
  if (parsedAmount.data.currency === 'USD') {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    amountLamports = Math.floor((parsedAmount.data.value / solPrice) * LAMPORTS_PER_SOL);
  } else {
    amountLamports = Math.floor(parsedAmount.data.value * LAMPORTS_PER_SOL);
  }

  if (amountLamports <= 0) {
    await interaction.editReply({ content: '❌ Amount must be greater than 0.' });
    return;
  }

  // Check balance
  const balance = await creditManager.getBalance(interaction.user.id);
  if ((balance?.balance_lamports ?? 0) < amountLamports) {
    await interaction.editReply({ content: '❌ You are too poor for this vault.' });
    return;
  }

  // Confirmation Step
  const confirmEmbed = new EmbedBuilder()
    .setColor(0xFF0000) // Red for warning
    .setTitle('🔒 Vault Confirmation')
    .setDescription(
      `You are about to lock **${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL** for **${durationRaw}**.\n\n` +
      `**Terms of Self-Custody:**\n` +
      `1. I am doing this of my own free will to prevent degen behavior.\n` +
      `2. I understand these funds are **inaccessible** until the timer expires.\n` +
      `3. No admin can unlock this early. You are protecting yourself from yourself.\n\n` +
      `*Do you agree to these terms?*`
    );

  const confirmBtn = new ButtonBuilder()
    .setCustomId('vault_confirm')
    .setLabel('I Agree, Lock It')
    .setStyle(ButtonStyle.Danger);

  const cancelBtn = new ButtonBuilder()
    .setCustomId('vault_cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

  const msg = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

  try {
    const confirmation = await msg.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id,
      time: 30000,
      componentType: ComponentType.Button,
    });

    if (confirmation.customId === 'vault_cancel') {
      await confirmation.update({ content: '❌ Vault creation cancelled.', embeds: [], components: [] });
      return;
    }

    await confirmation.deferUpdate();

    // Re-check balance
    const currentBal = await creditManager.getBalance(interaction.user.id);
    if ((currentBal?.balance_lamports ?? 0) < amountLamports) {
      await interaction.editReply({ content: '❌ Balance changed. Insufficient funds.', embeds: [], components: [] });
      return;
    }

    // 1. Create Vault Record
    const vault = await lockVault({ userId: interaction.user.id, amountRaw, durationRaw, reason });

    // 2. Deduct from Credit Balance
    await (creditManager as any).deduct(interaction.user.id, amountLamports, { memo: `vault lock ${vault.id}` });

    // 3. Send SOL to Vault (with rollback)
    let signature: string;
    try {
      signature = await botWallet.sendSOL(vault.vaultAddress, amountLamports);
    } catch (e) {
      // Refund if blockchain tx fails
      await creditManager.deposit(interaction.user.id, amountLamports, { memo: `refund: vault lock failed ${vault.id}` });
      await interaction.editReply({ content: `❌ Blockchain transaction failed. Funds refunded.\nError: ${(e as Error).message}`, embeds: [], components: [] });
      return;
    }

    const successEmbed = new EmbedBuilder()
      .setColor(0x8A2BE2)
      .setTitle('🔒 Locked & Loaded')
      .setDescription('Funds moved to secure vault. You can\'t touch them now.')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'Amount', value: `${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`, inline: true },
        { name: 'Unlocks', value: `<t:${Math.floor(vault.unlockAt / 1000)}:R>`, inline: true },
        { name: 'Vault Address', value: `\`${vault.vaultAddress}\`` },
        { name: 'Transaction', value: `Solscan` }
      )
      .setFooter({ text: reason ? `Reason: ${reason}` : 'Future you will thank present you' });

    await interaction.editReply({ embeds: [successEmbed], components: [] });

    // DM the user
    try {
      await interaction.user.send({ content: '🔐 **Vault Receipt**', embeds: [successEmbed] });
    } catch (e) {
      // Ignore DM failures
    }

  } catch (err) {
    if (err instanceof Error && err.message.includes('time')) {
      await interaction.editReply({ content: '❌ Confirmation timed out.', embeds: [], components: [] });
    } else {
      await interaction.editReply({ content: `❌ Error: ${(err as Error).message}`, embeds: [], components: [] });
    }
  }
}

async function handleVaultUnlock(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const id = interaction.options.getString('id', true);
  try {
    const vault = unlockVault(interaction.user.id, id);
    const embed = new EmbedBuilder()
      .setColor(0x00AA00)
      .setTitle('🔓 Freedom!')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'Released', value: `${vault.lockedAmountSOL === 0 ? 'ALL' : vault.lockedAmountSOL.toFixed(4) + ' SOL'}` },
      )
      .setFooter({ text: 'JustTheTip • Don\'t tilt it all away' });
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `${(err as Error).message}` });
  }
}

async function handleVaultEmergencyUnlock(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const id = interaction.options.getString('id', true);

  const vaults = getVaultStatus(interaction.user.id);
  const vault = vaults.find(v => v.id === id);

  if (!vault) {
    await interaction.editReply({ content: '❌ Vault not found.' });
    return;
  }

  if (vault.status !== 'locked') {
    await interaction.editReply({ content: '❌ Vault is not locked.' });
    return;
  }

  const feePercent = 0.20;
  const feeAmount = vault.lockedAmountSOL * feePercent;
  const returnAmount = vault.lockedAmountSOL - feeAmount;

  const confirmEmbed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('🚨 EMERGENCY UNLOCK 🚨')
    .setDescription(
      `You are breaking the glass. This hurts.\n\n` +
      `**Vault:** ${vault.id}\n` +
      `**Locked:** ${vault.lockedAmountSOL.toFixed(4)} SOL\n` +
      `**Penalty (20%):** -${feeAmount.toFixed(4)} SOL\n` +
      `**You Get:** ${returnAmount.toFixed(4)} SOL\n\n` +
      `*Where should we send the scraps?*`
    );

  const toBalanceBtn = new ButtonBuilder()
    .setCustomId('emergency_balance')
    .setLabel('Credit Balance')
    .setStyle(ButtonStyle.Danger);

  const toWalletBtn = new ButtonBuilder()
    .setCustomId('emergency_wallet')
    .setLabel('External Wallet')
    .setStyle(ButtonStyle.Danger);

  const cancelBtn = new ButtonBuilder()
    .setCustomId('emergency_cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(toBalanceBtn, toWalletBtn, cancelBtn);

  const msg = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

  try {
    const confirmation = await msg.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id,
      time: 30000,
      componentType: ComponentType.Button,
    });

    if (confirmation.customId === 'emergency_cancel') {
      await confirmation.update({ content: '❌ Emergency unlock cancelled. Good choice.', embeds: [], components: [] });
      return;
    }

    await confirmation.deferUpdate();

    // Perform unlock logic
    unlockVault(interaction.user.id, id);

    // Deduct fee and credit remainder
    // Note: In a real implementation, we'd move funds from the vault wallet.
    // Here we simulate by crediting the user's balance with the remainder (if to balance)
    // or sending to wallet.
    
    if (confirmation.customId === 'emergency_balance') {
      await creditManager.deposit(interaction.user.id, returnAmount * LAMPORTS_PER_SOL, { memo: `emergency unlock ${id}` });
      await interaction.editReply({ content: `✅ Vault unlocked. **${returnAmount.toFixed(4)} SOL** credited to balance.`, embeds: [], components: [] });
    } else {
      const bal = await creditManager.getBalance(interaction.user.id);
      if (bal?.wallet_address) {
        await botWallet.sendSOL(bal.wallet_address, returnAmount * LAMPORTS_PER_SOL);
        await interaction.editReply({ content: `✅ Vault unlocked. **${returnAmount.toFixed(4)} SOL** sent to \`${bal.wallet_address}\`.`, embeds: [], components: [] });
      } else {
        await creditManager.deposit(interaction.user.id, returnAmount * LAMPORTS_PER_SOL, { memo: `emergency unlock (no wallet)` });
        await interaction.editReply({ content: `⚠️ No external wallet found. Credited to balance instead.`, embeds: [], components: [] });
      }
    }
  } catch (err) {
    await interaction.editReply({ content: `❌ Error: ${(err as Error).message}`, embeds: [], components: [] });
  }
}

async function handleVaultExtend(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const id = interaction.options.getString('id', true);
  const additional = interaction.options.getString('additional', true);
  try {
    const vault = extendVault(interaction.user.id, id, additional);
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('⏳ Kicking the Can')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'New Unlock', value: `<t:${Math.floor(vault.unlockAt / 1000)}:R>` },
        { name: 'Extensions', value: `${vault.extendedCount}` },
      )
      .setFooter({ text: 'JustTheTip • Diamond Hands' });
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `${(err as Error).message}` });
  }
}

async function handleVaultStatus(interaction: ChatInputCommandInteraction) {
  const vaults = getVaultStatus(interaction.user.id);
  if (vaults.length === 0) {
    await interaction.reply({ content: 'No active vaults.', ephemeral: true });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(0x1E90FF)
    .setTitle('🔐 Active Vaults')
    .setDescription(vaults.map((v: LockVaultRecord) =>
      `**${v.id}** - ${v.status} - unlocks <t:${Math.floor(v.unlockAt / 1000)}:R> - ${v.lockedAmountSOL === 0 ? 'ALL' : v.lockedAmountSOL.toFixed(4) + ' SOL'}`
    ).join('\n'))
    .setFooter({ text: 'JustTheTip • Self-custody discipline' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTrivia(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({ content: '🚫 You are on cooldown. Please wait before hosting another trivia.' });
    return;
  }

  const amountRaw = interaction.options.getString('amount', true);
  const question = interaction.options.getString('question', true);
  const answer = interaction.options.getString('answer', true);
  const duration = interaction.options.getInteger('duration') || 60;

  const parseResult = parseAmountNL(amountRaw);
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({ content: `${parseResult.error}\n\nExamples: "$5", "0.1 sol"` });
    return;
  }

  let amountLamports: number;
  if (parseResult.data.currency === 'USD') {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    amountLamports = Math.floor((parseResult.data.value / solPrice) * LAMPORTS_PER_SOL);
  } else {
    amountLamports = Math.floor(parseResult.data.value * LAMPORTS_PER_SOL);
  }

  if (amountLamports <= 0) {
    await interaction.editReply({ content: '❌ Prize amount must be greater than 0.' });
    return;
  }

  if (duration < 10 || duration > 300) {
    await interaction.editReply({ content: '❌ Duration must be between 10 and 300 seconds.' });
    return;
  }

  // Pre-check balance to prevent griefing
  const balance = await creditManager.getBalance(interaction.user.id);
  const available = balance?.balance_lamports ?? 0;
  const required = amountLamports + FLAT_FEE_LAMPORTS;

  if (available < required) {
    await interaction.editReply({ 
      content: `❌ Insufficient funds.\n` +
               `Required: ${(required / LAMPORTS_PER_SOL).toFixed(4)} SOL (Prize + Fee)\n` +
               `Available: ${(available / LAMPORTS_PER_SOL).toFixed(4)} SOL` 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🧠 Big Brain Time')
    .setDescription(
      `**Prize:** ${formatAmount(parseResult.data)}\n\n` +
      `**Question:** ${question}\n\n` +
      `*Prove you're smart. Win money.*`
    )
    .setFooter({ text: `Ends in ${duration} seconds • Hosted by ${interaction.user.username}` });

  await interaction.editReply({ embeds: [embed] });

  const filter = (m: Message) => !m.author.bot && m.author.id !== interaction.user.id && m.content.toLowerCase().trim() === answer.toLowerCase().trim();
  const collector = interaction.channel?.createMessageCollector({ filter, time: duration * 1000, max: 1 });

  if (!collector) return;

  collector.on('collect', async (m) => {
    try {
      const { netAmount } = await creditManager.deductForTip(interaction.user.id, m.author.id, amountLamports);
      await creditManager.deposit(m.author.id, netAmount, { memo: 'trivia win' });
      await interaction.followUp(`🎉 **${m.author}** nailed it! The answer was **${answer}**.\nPrize of **${formatAmount(parseResult.data)}** has been credited!`);
    } catch (err) {
      await interaction.followUp(`🎉 **${m.author}** nailed it! But I couldn't process the payment from the host: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      interaction.followUp(`⏰ Silence... really? The answer was **${answer}**.`);
    }
  });
}

async function handleRain(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({ content: '🚫 You are on cooldown.' });
    return;
  }

  if (!interaction.channel || interaction.channel.isDMBased()) {
    await interaction.editReply({ content: '❌ Rain can only be used in server channels.' });
    return;
  }

  const amountRaw = interaction.options.getString('amount', true);
  const count = interaction.options.getInteger('count') || 10;

  if (count < 1 || count > 50) {
    await interaction.editReply({ content: '❌ User count must be between 1 and 50.' });
    return;
  }

  const parseResult = parseAmountNL(amountRaw);
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({ content: `${parseResult.error}` });
    return;
  }

  // Calculate total lamports
  let totalLamports: number;
  let totalUsd = 0;
  if (parseResult.data.currency === 'USD') {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    totalLamports = Math.floor((parseResult.data.value / solPrice) * LAMPORTS_PER_SOL);
    totalUsd = parseResult.data.value;
  } else {
    totalLamports = Math.floor(parseResult.data.value * LAMPORTS_PER_SOL);
    try {
      const solPrice = pricingOracle.getUsdPrice('SOL');
      totalUsd = parseResult.data.value * solPrice;
    } catch (e) { totalUsd = 999; }
  }

  if (totalLamports <= 0) {
    await interaction.editReply({ content: '❌ Amount must be greater than 0.' });
    return;
  }

  // Fetch active users
  let messages;
  try {
    messages = await interaction.channel.messages.fetch({ limit: 100 });
  } catch (e) {
    await interaction.editReply({ content: '❌ Failed to fetch channel history. Missing permissions?' });
    return;
  }

  const activeUserIds = new Set<string>();
  for (const m of messages.values()) {
    if (!m.author.bot && m.author.id !== interaction.user.id) {
      activeUserIds.add(m.author.id);
      if (activeUserIds.size >= count) break;
    }
  }

  if (activeUserIds.size === 0) {
    await interaction.editReply({ content: '❌ No active users found to rain on.' });
    return;
  }

  const recipients = Array.from(activeUserIds);
  const amountPerUser = Math.floor(totalLamports / recipients.length);
  const usdPerUser = totalUsd / recipients.length;

  if (usdPerUser < 1) {
    await interaction.editReply({ content: `❌ Rain amount too low. Must be at least $1 per person (Total: $${recipients.length}).` });
    return;
  }

  if (amountPerUser < 1000) { // arbitrary dust limit
    await interaction.editReply({ content: `❌ Amount too small to split among ${recipients.length} users.` });
    return;
  }

  try {
    const { results } = await creditManager.deductForAirdrop(
      interaction.user.id,
      recipients,
      amountPerUser
    );

    // Process distributions (similar to airdrop)
    const sent: string[] = [];
    const credited: string[] = [];

    for (const { recipientId, amount } of results) {
      const bal = await creditManager.getBalance(recipientId);
      if (bal?.wallet_address) {
        try {
          await botWallet.sendSOL(bal.wallet_address, amount);
          sent.push(recipientId);
        } catch (err) {
          await creditManager.deposit(recipientId, amount, { memo: 'rain received (fallback)' });
          credited.push(recipientId);
        }
      } else {
        await creditManager.deposit(recipientId, amount, { memo: 'rain received' });
        credited.push(recipientId);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x00BFFF) // Deep Sky Blue for Rain
      .setTitle('🌧️ Making It Rain')
      .setDescription(
        `Look at **${interaction.user}** go!\n\n` +
        `**Dropping:** ${formatAmount(parseResult.data)}\n` +
        `**On:** ${results.length} active users\n` +
        `**Each gets:** ${(amountPerUser / LAMPORTS_PER_SOL).toFixed(4)} SOL\n\n` +
        `*${sent.length} sent to wallet, ${credited.length} credited to balance*`
      )
      .setFooter({ text: 'JustTheTip • Blessings' });

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    await interaction.editReply({ content: `❌ Rain failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
  }
}

async function handleAdminSetup(interaction: ChatInputCommandInteraction) {
  // Check permissions (Admin only)
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Nice try. Admins only.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const channels = {
    welcome: process.env.TIP_DISCORD_WELCOME_CHANNEL_ID,
    announcements: process.env.TIP_DISCORD_ANNOUNCEMENT_CHANNEL_ID,
    rules: process.env.TIP_DISCORD_RULES_CHANNEL_ID,
    support: process.env.SUPPORT_CHANNEL_ID,
    howto: process.env.TIP_DISCORD_HOW_TO_USE_BOT_CHANNEL_ID,
  };

  const guild = interaction.guild;
  if (!guild) return;

  const results: string[] = [];

  // 1. Welcome
  if (channels.welcome) {
    const ch = guild.channels.cache.get(channels.welcome) as TextChannel;
    if (ch) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('👋 Welcome to the Degen Den')
        .setDescription(
          `Welcome to **${guild.name}**. Leave your sanity at the door.\n\n` +
          `We gamble, we tip, we win, we lose. Mostly we vibe.\n\n` +
          `**First Steps:**\n` +
          `1. Read the rules (don't get banned)\n` +
          `2. Link your wallet: \`/tip wallet register-external\`\n` +
          `3. Deposit funds: \`/tip deposit\`\n` +
          `4. Start tipping degens.`
        )
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZ5Z2Z5Z2Z5Z2Z5Z2Z5Z2Z5Z2Z5Z2Z5Z2Z5Z2Z5Z2Z5/ASd0Ukj0y3qMM/giphy.gif');
      await ch.send({ embeds: [embed] });
      results.push(`✅ Populated Welcome (${ch.name})`);
    }
  }

  // 2. Rules
  if (channels.rules) {
    const ch = guild.channels.cache.get(channels.rules) as TextChannel;
    if (ch) {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('📜 The Law')
        .setDescription(
          `**1. No Begging.** We tip winners, not beggars. Don't be cringe.\n` +
          `**2. No Scams.** SusLink is watching. Post a scam, get banned.\n` +
          `**3. Respect the Grind.** Don't harass people over losses.\n` +
          `**4. English Only.** Unless you're speaking money.\n` +
          `**5. Mods are God.** Their word is final.`
        )
        .setFooter({ text: 'Break rules = Get Rekt (Banned)' });
      await ch.send({ embeds: [embed] });
      results.push(`✅ Populated Rules (${ch.name})`);
    }
  }

  // 3. How To
  if (channels.howto) {
    const ch = guild.channels.cache.get(channels.howto) as TextChannel;
    if (ch) {
      const embed = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle('📘 How to Degen (Bot Guide)')
        .setDescription(
          `**💰 Tipping**\n` +
          `\`/tip send @user $5\` - Send money instantly\n` +
          `\`/tip airdrop $1 @user1 @user2\` - Make it rain\n` +
          `\`/tip rain $10 5\` - Split $10 among 5 active users\n\n` +
          `**🏦 Banking**\n` +
          `\`/tip deposit\` - Get address to load SOL/Tokens\n` +
          `\`/tip withdraw\` - Cash out to your wallet\n` +
          `\`/tip balance\` - Check your stash\n\n` +
          `**🔐 Vaults**\n` +
          `\`/tip lock $50 24h\` - Lock funds so you don't lose them\n\n` +
          `**🎮 Games**\n` +
          `\`/tip trivia\` - Host a trivia game`
        );
      await ch.send({ embeds: [embed] });
      results.push(`✅ Populated How-To (${ch.name})`);
    }
  }

  // 4. Support
  if (channels.support) {
    const ch = guild.channels.cache.get(channels.support) as TextChannel;
    if (ch) {
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🛠️ Support Station')
        .setDescription(
          `Something broken? Deposit stuck? Found a bug?\n\n` +
          `**Don't DM mods.** Open a ticket below.\n` +
          `We'll get to you when we get to you (usually fast).`
        );
      
      const btn = new ButtonBuilder()
        .setCustomId('jtt_ticket_create')
        .setLabel('🎫 Open Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📩');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btn);

      await ch.send({ embeds: [embed], components: [row] });
      results.push(`✅ Populated Support (${ch.name})`);
    }
  }

  await interaction.editReply({ content: `**Setup Complete:**\n${results.join('\n') || 'No channels configured in .env'}` });
}

async function handleSupportTicketCreate(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId('jtt_ticket_modal')
    .setTitle('Open Support Ticket');

  const reasonInput = new TextInputBuilder()
    .setCustomId('ticket_reason')
    .setLabel('What\'s broken? (Be specific)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function handleSupportTicketSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const reason = interaction.fields.getTextInputValue('ticket_reason');
  const guild = interaction.guild;
  
  if (!guild) return;

  const channel = interaction.channel as TextChannel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.editReply({ content: '❌ Can only create tickets in text channels.' });
    return;
  }

  try {
    const thread = await channel.threads.create({
      name: `ticket-${interaction.user.username}`,
      autoArchiveDuration: 1440,
      type: ChannelType.PrivateThread,
      reason: 'Support Ticket',
    });

    await thread.members.add(interaction.user.id);

    const adminRole = process.env.MOD_ROLE_ID ? `<@&${process.env.MOD_ROLE_ID}>` : '@here';
    const owner = process.env.DISCORD_OWNER_ID ? `<@${process.env.DISCORD_OWNER_ID}>` : '';

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('🎫 New Ticket')
      .setDescription(
        `**User:** ${interaction.user}\n` +
        `**Reason:**\n${reason}\n\n` +
        `Support will be with you shortly.`
      )
      .setFooter({ text: 'JustTheTip Support' });

    await thread.send({ 
      content: `🚨 **Support Request** ${adminRole} ${owner}`, 
      embeds: [embed] 
    });

    await interaction.editReply({ content: `✅ Ticket created: ${thread}` });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ content: '❌ Failed to create ticket thread. Check bot permissions.' });
  }
}

// Export handler for event listener
(tip as any).handleAirdropClaim = handleAirdropClaim;
(tip as any).handleSupportTicketCreate = handleSupportTicketCreate;
(tip as any).handleSupportTicketSubmit = handleSupportTicketSubmit;
