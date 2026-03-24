/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Tip Command — Credit-based custodial tipping (Consolidated)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} from 'discord.js';
import { LEGAL_DISCLAIMERS } from '@tiltcheck/shared/legal';
import { FLAT_FEE_LAMPORTS } from '@tiltcheck/justthetip';
import type { Command } from '../types.js';
import {
  CreditManager,
} from '../services/tipping/credit-manager.js';
import type { DepositMonitor } from '../services/tipping/deposit-monitor.js';
import { lockVault, unlockVault, getVaultStatus } from '@tiltcheck/lockvault';
import { parseAmountNL } from '@tiltcheck/natural-language-parser';
import { getUsdPriceSync } from '@tiltcheck/utils';
// Removed unused isOnCooldown import
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { BotWalletService } from '../services/tipping/bot-wallet.js';
import type { TokenDepositMonitor } from '../services/tipping/token-deposit-monitor.js';
// Removed unused DEPOSIT_TOKENS import

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

// Removed unused activeAirdrops

export const tip: Command = {
  data: new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Consolidated Tipping: deposit, send, withdraw SOL credit')
    .addSubcommand((sub) => sub.setName('help').setDescription('Explain how tipping works'))
    .addSubcommand(sub => sub
      .setName('deposit')
      .setDescription('Get your deposit address to load SOL credit')
    )
    .addSubcommand(sub => sub
      .setName('deposit-token')
      .setDescription('Deposit tokens to load credit (auto-swapped to SOL)')
      .addStringOption(o => o
        .setName('token')
        .setDescription('Token symbol (e.g. USDC)')
        .setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName('send')
      .setDescription('Send from your custodial credit balance')
      .addUserOption(o => o.setName('user').setDescription('User to tip').setRequired(true))
      .addStringOption(o => o.setName('amount').setDescription('Amount (e.g. "$5", "0.1 sol")').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('airdrop')
      .setDescription('Distribute credit: specific users or public claim')
      .addStringOption(o => o.setName('amount').setDescription('Amount per person').setRequired(true))
      .addStringOption(o => o.setName('recipients').setDescription('Mentions (@user1) OR "public"').setRequired(false))
      .addIntegerOption(o => o.setName('slots').setDescription('Max claims').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('withdraw')
      .setDescription('Withdraw balance to an external wallet')
    )
    .addSubcommand(sub => sub
      .setName('balance')
      .setDescription('Check your balance and wallet status')
    )
    .addSubcommand(sub => sub
      .setName('history')
      .setDescription('View recent transactions')
    )
    .addSubcommand(sub => sub
      .setName('wallet')
      .setDescription('Manage withdrawal wallet')
      .addStringOption(o => o
        .setName('action')
        .setDescription('Action')
        .setRequired(true)
        .addChoices(
          { name: 'View', value: 'view' },
          { name: 'Register (External)', value: 'register-external' },
        ))
      .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('lock')
      .setDescription('Lock funds in a time-vault')
      .addStringOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Optional reason'))
    )
    .addSubcommand(sub => sub
      .setName('unlock')
      .setDescription('Unlock an expired vault')
      .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('vaults')
      .setDescription('View active locked vaults')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!creditManager || !botWallet) {
      await interaction.reply({ content: '❌ Tipping system is not initialized. Check bot configuration.', ephemeral: true });
      return;
    }

    try {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case 'help': return handleHelp(interaction);
        case 'deposit': return handleDeposit(interaction);
        case 'deposit-token': return handleDepositToken(interaction);
        case 'send': return handleSend(interaction);
        case 'airdrop': return handleAirdrop(interaction);
        case 'withdraw': return handleWithdraw(interaction);
        case 'balance': return handleBalance(interaction);
        case 'history': return handleHistory(interaction);
        case 'wallet': return handleWallet(interaction);
        case 'lock': return handleVaultLock(interaction);
        case 'unlock': return handleVaultUnlock(interaction);
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

// Handlers (Simplified for brevity in the consolidated version, can be expanded)

async function handleHelp(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x00BFFF)
    .setTitle('JustTheTip - Solana Tipping Engine')
    .setDescription('Deposit SOL to your credit balance, then tip others instantly!')
    .addFields(
      { name: 'Step 1', value: 'Register your withdrawal wallet: `/tip wallet register-external`' },
      { name: 'Step 2', value: 'Load your balance: `/tip deposit`' },
      { name: 'Step 3', value: 'Send a tip: `/tip send @user $5`' }
    )
    .setFooter({ text: 'Powered by JustTheTip Engine | v1.1.0' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDeposit(interaction: ChatInputCommandInteraction) {
  const code = depositMonitor.generateDepositCode(interaction.user.id);
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('📥 Load SOL Credit')
    .setDescription(`Send SOL to:\n\`${botWallet.address}\`\n\n**Memo (REQUIRED):**\n\`${code}\``)
    .setFooter({ text: 'TiltCheck Payments | JustTheTip' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDepositToken(interaction: ChatInputCommandInteraction) {
  if (!tokenDepositMonitor) {
    await interaction.reply({ content: '❌ Token deposits are disabled.', ephemeral: true });
    return;
  }
  const token = interaction.options.getString('token', true).toUpperCase();
  const code = depositMonitor.generateDepositCode(interaction.user.id);
  tokenDepositMonitor.registerDepositCode(code, interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(`Deposit ${token}`)
    .setDescription(`Send ${token} to:\n\`${botWallet.address}\`\n\n**Memo (REQUIRED):**\n\`${code}\``);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSend(interaction: ChatInputCommandInteraction) {
  const recipient = interaction.options.getUser('user', true);
  const amountStr = interaction.options.getString('amount', true);
  const parse = parseAmountNL(amountStr);

  if (!parse.success || !parse.data) {
    await interaction.reply({ content: `❌ Invalid amount: ${parse.error}`, ephemeral: true });
    return;
  }

  const solPrice = getUsdPriceSync('SOL');
  const amountLamportsInTarget = parse.data.currency === 'USD'
    ? Math.floor((parse.data.value / solPrice) * LAMPORTS_PER_SOL)
    : Math.floor(parse.data.value * LAMPORTS_PER_SOL);

  const feeLamports = FLAT_FEE_LAMPORTS;
  const totalLamports = amountLamportsInTarget + feeLamports;

  // 1. Send Confirmation Embed
  const confirmEmbed = new EmbedBuilder()
    .setColor(0x17c3b2)
    .setTitle('💸 TIP TRANSACTION: CONFIRMATION REQUIRED')
    .setDescription(`You are about to send a tip to **${recipient.username}**.`)
    .addFields(
      { name: 'Tip Amount', value: `${(amountLamportsInTarget / LAMPORTS_PER_SOL).toFixed(4)} SOL (~$${(amountLamportsInTarget / LAMPORTS_PER_SOL * solPrice).toFixed(2)})`, inline: true },
      { name: 'Fixed Fee', value: `${(feeLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL (~$${(feeLamports / LAMPORTS_PER_SOL * solPrice).toFixed(2)})`, inline: true },
      { name: 'Total Deduction', value: `**${(totalLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL**`, inline: false },
      { name: 'Legal Disclosure', value: LEGAL_DISCLAIMERS.FEE_DISCLOSURE }
    )
    .setFooter({ text: 'Audit your transaction context before confirming.' });

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_tip')
        .setLabel('CONFIRM & SEND')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel_tip')
        .setLabel('CANCEL')
        .setStyle(ButtonStyle.Danger)
    );

  const response = await interaction.reply({
    embeds: [confirmEmbed],
    components: [row],
    ephemeral: true
  });

  try {
    const i = await response.awaitMessageComponent({
      filter: (btn) => btn.user.id === interaction.user.id,
      time: 30000,
      componentType: ComponentType.Button
    });

    if (i.customId === 'cancel_tip') {
      await i.update({ content: '❌ Transaction cancelled.', embeds: [], components: [] });
      return;
    }

    await i.update({ content: '⏳ Processing non-custodial disbursement...', embeds: [confirmEmbed], components: [] });

    const bal = await creditManager.getBalance(recipient.id);
    if (!bal?.wallet_address) {
      throw new Error(`${recipient.username} has no registered wallet. Ask them to run /tip wallet register-external.`);
    }

    const { senderNewBalance, netAmount } = await creditManager.deductForTip(interaction.user.id, recipient.id, amountLamportsInTarget);
    const signature = await botWallet.sendSOL(bal.wallet_address, netAmount);

    await i.followUp({
      content: `✅ **SUCCESS.** Sent tip to ${recipient}! \nRemaining Balance: ${(senderNewBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n[Verify Transaction](https://solscan.io/tx/${signature})`,
      ephemeral: true
    });
  } catch (err) {
    if (!interaction.replied) {
       await interaction.reply({ content: `❌ **ACTION FAILED/TIMED OUT.** ${err instanceof Error ? err.message : 'Timeout'}`, ephemeral: true });
    } else {
       await interaction.followUp({ content: `❌ **ACTION FAILED/TIMED OUT.** ${err instanceof Error ? err.message : 'Timeout'}`, ephemeral: true });
    }
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction) {
  const bal = await creditManager.getBalance(interaction.user.id);
  const sol = ((bal?.balance_lamports || 0) / LAMPORTS_PER_SOL).toFixed(4);
  await interaction.reply({ content: `💰 Your balance: ${sol} SOL`, ephemeral: true });
}

async function handleWithdraw(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const { amountLamports, walletAddress } = await creditManager.withdraw(interaction.user.id);
    const sig = await botWallet.sendSOL(walletAddress, amountLamports);
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ WITHDRAWAL SUCCESSFUL')
      .setDescription(`Successfully withdrawn funds to your registered wallet.`)
      .addFields(
        { name: 'Amount', value: `${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`, inline: true },
        { name: 'Destination', value: `\`${walletAddress}\``, inline: true },
        { name: 'Legal Note', value: LEGAL_DISCLAIMERS.DIGITAL_ASSET_RISKS },
        { name: 'Explorer', value: `[View on Solscan](https://solscan.io/tx/${sig})` }
      )
      .setFooter({ text: 'TiltCheck | Non-Custodial Layer' });
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ Withdrawal failed: ${err instanceof Error ? err.message : err}`);
  }
}

async function handleHistory(interaction: ChatInputCommandInteraction) {
  const txs = await creditManager.getTransactionHistory(interaction.user.id, 10);
  if (!txs.length) {
    await interaction.reply({ content: 'No transactions yet.', ephemeral: true });
    return;
  }
  const lines = txs.map(t => `${t.type}: ${(t.amount_lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL @ ${new Date(t.created_at).toLocaleString()}`);
  await interaction.reply({ content: `📜 **History:**\n${lines.join('\n')}`, ephemeral: true });
}

async function handleWallet(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);
  if (action === 'view') {
    const bal = await creditManager.getBalance(interaction.user.id);
    await interaction.reply({ content: `💳 Registered wallet: \`${bal?.wallet_address || 'None'}\``, ephemeral: true });
  } else {
    const addr = interaction.options.getString('address', true);
    await creditManager.registerWallet(interaction.user.id, addr);
    await interaction.reply({ content: `✅ Wallet registered: \`${addr}\``, ephemeral: true });
  }
}

async function handleVaultLock(interaction: ChatInputCommandInteraction) {
  const amountStr = interaction.options.getString('amount', true);
  const durationStr = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') || undefined;

  try {
    const vault = await lockVault({ userId: interaction.user.id, amountRaw: amountStr, durationRaw: durationStr, reason });
    const embed = new EmbedBuilder()
      .setColor(0x17c3b2)
      .setTitle('🔐 VAULT SECURED')
      .setDescription(`Successfully created a non-custodial lock for **${amountStr}**.`)
      .addFields(
        { name: 'Vault ID', value: `\`${vault.id}\``, inline: true },
        { name: 'Unlocks', value: `<t:${Math.floor(vault.unlockAt / 1000)}:R>`, inline: true },
        { name: 'Legal Disclosure', value: LEGAL_DISCLAIMERS.DIGITAL_ASSET_RISKS },
        { name: 'Independent Verification', value: '[Audit Tool](https://tiltcheck.me/tools/verify)' }
      )
      .setFooter({ text: 'TiltCheck | Non-Custodial Layer' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `❌ Lock failed: ${err instanceof Error ? err.message : err}`, ephemeral: true });
  }
}

async function handleVaultUnlock(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  try {
    const vault = unlockVault(interaction.user.id, id);
    const released = vault.lockedAmountSOL === 0 ? 'ALL' : `${vault.lockedAmountSOL.toFixed(4)} SOL`;
    await interaction.reply({ content: `✅ Vault ${id} unlocked. Released: ${released}`, ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `❌ Unlock failed: ${err instanceof Error ? err.message : err}`, ephemeral: true });
  }
}

async function handleVaultStatus(interaction: ChatInputCommandInteraction) {
  const vaults = getVaultStatus(interaction.user.id);
  if (!vaults.length) {
    await interaction.reply({ content: 'No active vaults.', ephemeral: true });
    return;
  }
  const list = vaults.map((v: any) => {
    const ready = Date.now() >= v.unlockAt ? 'ready' : 'waiting';
    const amount = v.lockedAmountSOL === 0 ? 'ALL' : `${Number(v.lockedAmountSOL || 0).toFixed(4)} SOL`;
    return `• ${v.id}: ${v.status} (${ready}), unlocks <t:${Math.floor(v.unlockAt / 1000)}:R>, amount ${amount}`;
  }).join('\n');
  await interaction.reply({ content: `🔐 **Your Vaults:**\n${list}`, ephemeral: true });
}

async function handleAirdrop(interaction: ChatInputCommandInteraction) {
  await interaction.reply({ content: 'Airdrops are coming soon in the consolidated bot!', ephemeral: true });
}
