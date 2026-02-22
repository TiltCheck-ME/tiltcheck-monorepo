/**
 * Tip Command — Credit-based custodial tipping
 *
 * All subcommands operate on credit balances managed by the bot wallet.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
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

// These are injected at startup via setCreditDeps()
let creditManager: CreditManager;
let depositMonitor: DepositMonitor;
let botWallet: BotWalletService;

export function setCreditDeps(cm: CreditManager, dm: DepositMonitor, bw: BotWalletService) {
  creditManager = cm;
  depositMonitor = dm;
  botWallet = bw;
}

export const tip: Command = {
  data: new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Custodial Solana tipping & wallet management')
    // Deposit
    .addSubcommand(sub => sub
      .setName('deposit')
      .setDescription('Generate a deposit code to fund your credit balance')
    )
    // Send
    .addSubcommand(sub => sub
      .setName('send')
      .setDescription('Send SOL to another user from your credit')
      .addUserOption(o => o.setName('user').setDescription('User to tip').setRequired(true))
      .addStringOption(o => o.setName('amount').setDescription('Amount (e.g., "$5", "0.1 sol")').setRequired(true))
    )
    // Airdrop
    .addSubcommand(sub => sub
      .setName('airdrop')
      .setDescription('Send SOL to multiple users from your credit')
      .addStringOption(o => o.setName('amount').setDescription('Amount per recipient').setRequired(true))
      .addStringOption(o => o.setName('recipients').setDescription('User mentions (@user1 @user2)').setRequired(true))
    )
    // Withdraw
    .addSubcommand(sub => sub
      .setName('withdraw')
      .setDescription('Withdraw your full credit balance to your wallet')
    )
    // Balance
    .addSubcommand(sub => sub
      .setName('balance')
      .setDescription('Check your credit balance')
    )
    // History
    .addSubcommand(sub => sub
      .setName('history')
      .setDescription('View recent credit transactions')
    )
    // Wallet
    .addSubcommand(sub => sub
      .setName('wallet')
      .setDescription('Register or view your withdrawal wallet')
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
      .setDescription('Configure auto-refund behavior')
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
      .setDescription('Manually claim a deposit by transaction signature')
      .addStringOption(o => o.setName('signature').setDescription('Solana transaction signature').setRequired(true))
    )
    // Lock vault
    .addSubcommand(sub => sub
      .setName('lock')
      .setDescription('Lock funds in a time-locked vault')
      .addStringOption(o => o.setName('amount').setDescription('Amount (e.g. "$100", "5 SOL")').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Lock duration (e.g. 24h, 3d)').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Optional reason'))
    )
    // Vault unlock
    .addSubcommand(sub => sub
      .setName('unlock')
      .setDescription('Unlock a vault (after expiry)')
      .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
    )
    // Vault extend
    .addSubcommand(sub => sub
      .setName('extend')
      .setDescription('Extend a locked vault duration')
      .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
      .addStringOption(o => o.setName('additional').setDescription('Additional duration').setRequired(true))
    )
    // View vaults
    .addSubcommand(sub => sub
      .setName('vaults')
      .setDescription('View your locked vaults')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case 'deposit': return handleDeposit(interaction);
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
        case 'extend': return handleVaultExtend(interaction);
        case 'vaults': return handleVaultStatus(interaction);
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

  const code = depositMonitor.generateDepositCode(interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('Deposit SOL to Credit Balance')
    .setDescription(
      `Send SOL to the bot wallet with the memo below.\n\n` +
      `**Bot Wallet:**\n\`\`\`\n${botWallet.address}\n\`\`\`\n` +
      `**Deposit Memo:**\n\`\`\`\n${code}\n\`\`\`\n` +
      `Include this memo in your transaction so we can credit your account.\n\n` +
      `**Minimum deposit:** ${MIN_DEPOSIT_LAMPORTS / LAMPORTS_PER_SOL} SOL\n` +
      `**Code expires:** 1 hour\n\n` +
      `If your wallet doesn't support memos, send SOL to the address above ` +
      `then use \`/tip claim <tx_signature>\` to manually claim.`
    )
    .setFooter({ text: 'JustTheTip Credit System' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSend(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({ content: 'You\'re on cooldown. Take a break.' });
    return;
  }

  const recipient = interaction.options.getUser('user', true);
  const amountInput = interaction.options.getString('amount', true);

  if (recipient.id === interaction.user.id) {
    await interaction.editReply({ content: 'You cannot tip yourself.' });
    return;
  }
  if (recipient.bot) {
    await interaction.editReply({ content: 'You cannot tip bots.' });
    return;
  }

  const parseResult = parseAmountNL(amountInput);
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({ content: `${parseResult.error}\n\nExamples: "$5", "0.1 sol", "five bucks"` });
    return;
  }

  let amountLamports: number;
  if (parseResult.data.currency === 'USD') {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    amountLamports = Math.floor((parseResult.data.value / solPrice) * LAMPORTS_PER_SOL);
  } else {
    amountLamports = Math.floor(parseResult.data.value * LAMPORTS_PER_SOL);
  }

  // Check if recipient has a wallet
  const recipientBalance = await creditManager.getBalance(recipient.id);
  const recipientWallet = recipientBalance?.wallet_address;

  if (!recipientWallet) {
    // Create pending tip
    try {
      await creditManager.createPendingTip(interaction.user.id, recipient.id, amountLamports);
      await interaction.editReply({
        content: `Tip of ${formatAmount(parseResult.data)} held for ${recipient}.\n` +
          `They need to register a wallet with \`/tip wallet register-external\` to receive it.\n` +
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

  const amountRaw = interaction.options.getString('amount', true);
  const recipientsRaw = interaction.options.getString('recipients', true);

  const parseResult = parseAmountNL(amountRaw);
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({ content: `${parseResult.error}\n\nExamples: "$5", "0.1 sol"` });
    return;
  }

  let amountPerLamports: number;
  if (parseResult.data.currency === 'USD') {
    const solPrice = pricingOracle.getUsdPrice('SOL');
    amountPerLamports = Math.floor((parseResult.data.value / solPrice) * LAMPORTS_PER_SOL);
  } else {
    amountPerLamports = Math.floor(parseResult.data.value * LAMPORTS_PER_SOL);
  }

  // Extract user IDs
  const idRegex = /<@!?(\d+)>/g;
  const userIds: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(recipientsRaw)) !== null) {
    userIds.push(match[1]);
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
    const skipped: string[] = [];

    for (const { recipientId, amount } of results) {
      const bal = await creditManager.getBalance(recipientId);
      if (bal?.wallet_address) {
        try {
          await botWallet.sendSOL(bal.wallet_address, amount);
          sent.push(recipientId);
        } catch (err) {
          console.error(`[Airdrop] Failed to send to ${recipientId}:`, err);
          skipped.push(recipientId);
        }
      } else {
        skipped.push(recipientId);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x8844FF)
      .setTitle('Airdrop Sent!')
      .setDescription(
        `**Per recipient:** ${formatAmount(parseResult.data)}\n` +
        `**Sent to:** ${sent.length} user(s)\n` +
        `**Total deducted:** ${(totalDeducted / LAMPORTS_PER_SOL).toFixed(4)} SOL (incl fee)\n` +
        `**Your new balance:** ${(senderNewBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL` +
        (skipped.length > 0 ? `\n\nSkipped ${skipped.length} user(s) without wallets.` : '')
      )
      .setFooter({ text: 'JustTheTip Credit System' });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `${err instanceof Error ? err.message : 'Airdrop failed'}` });
  }
}

async function handleWithdraw(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const { amountLamports, walletAddress } = await creditManager.withdraw(interaction.user.id);

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
    .setTitle('Credit Balance')
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

  embed.setFooter({ text: 'JustTheTip Credit System' });
  await interaction.editReply({ embeds: [embed] });
}

async function handleHistory(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const txs = await creditManager.getTransactionHistory(interaction.user.id, 15);

  if (txs.length === 0) {
    await interaction.editReply({ content: 'No transactions yet. Use `/tip deposit` to get started.' });
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
      .setTitle('Your Wallet')
      .addFields(
        { name: 'Address', value: `\`${balance.wallet_address}\``, inline: false },
        { name: 'Refund Mode', value: balance.refund_mode, inline: true },
        { name: 'Inactivity Days', value: `${balance.inactivity_days}`, inline: true },
      )
      .setFooter({ text: 'JustTheTip Credit System' });

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
        .setTitle('Wallet Registered!')
        .setDescription(`\`${address}\`${extraMsg}`)
        .setFooter({ text: 'You can now receive on-chain withdrawals and tips.' });

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
  const amountRaw = interaction.options.getString('amount', true);
  const durationRaw = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') || undefined;

  const parsedAmount = parseAmountNL(amountRaw);
  if (!parsedAmount.success || !parsedAmount.data) {
    await interaction.reply({ content: `${parsedAmount.error}`, ephemeral: true });
    return;
  }

  const parsedDuration = parseDurationNL(durationRaw);
  if (!parsedDuration.success || !parsedDuration.data) {
    await interaction.reply({ content: `${parsedDuration.error}`, ephemeral: true });
    return;
  }

  try {
    const vault = await lockVault({ userId: interaction.user.id, amountRaw, durationRaw, reason });
    const embed = new EmbedBuilder()
      .setColor(0x8A2BE2)
      .setTitle('Vault Locked')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'Vault Wallet', value: `\`${vault.vaultAddress}\`` },
        { name: 'Unlocks', value: `<t:${Math.floor(vault.unlockAt / 1000)}:R>`, inline: true },
        { name: 'Amount', value: vault.lockedAmountSOL === 0 ? 'ALL' : `${vault.lockedAmountSOL.toFixed(4)} SOL`, inline: true },
      )
      .setFooter({ text: reason ? `Reason: ${reason}` : 'Use /tip vaults to view all vaults' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `${(err as Error).message}`, ephemeral: true });
  }
}

async function handleVaultUnlock(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  try {
    const vault = unlockVault(interaction.user.id, id);
    const embed = new EmbedBuilder()
      .setColor(0x00AA00)
      .setTitle('Vault Unlocked')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'Released', value: `${vault.lockedAmountSOL === 0 ? 'ALL' : vault.lockedAmountSOL.toFixed(4) + ' SOL'}` },
      )
      .setFooter({ text: 'JustTheTip Credit System' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `${(err as Error).message}`, ephemeral: true });
  }
}

async function handleVaultExtend(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  const additional = interaction.options.getString('additional', true);
  try {
    const vault = extendVault(interaction.user.id, id, additional);
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('Vault Extended')
      .addFields(
        { name: 'Vault ID', value: vault.id },
        { name: 'New Unlock', value: `<t:${Math.floor(vault.unlockAt / 1000)}:R>` },
        { name: 'Extensions', value: `${vault.extendedCount}` },
      )
      .setFooter({ text: 'JustTheTip Credit System' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `${(err as Error).message}`, ephemeral: true });
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
    .setTitle('Your Vaults')
    .setDescription(vaults.map((v: LockVaultRecord) =>
      `**${v.id}** - ${v.status} - unlocks <t:${Math.floor(v.unlockAt / 1000)}:R> - ${v.lockedAmountSOL === 0 ? 'ALL' : v.lockedAmountSOL.toFixed(4) + ' SOL'}`
    ).join('\n'))
    .setFooter({ text: 'JustTheTip Credit System' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}
