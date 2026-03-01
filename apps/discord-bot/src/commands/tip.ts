/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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
  ButtonInteraction,
} from 'discord.js';
import type { Command } from '../types.js';
import {
  CreditManager,
  MIN_DEPOSIT_LAMPORTS,
  type DepositMonitor,
} from '@tiltcheck/justthetip';
import { lockVault, unlockVault, extendVault, getVaultStatus, type LockVaultRecord } from '@tiltcheck/lockvault';
import { parseAmountNL, formatAmount, parseDurationNL } from '@tiltcheck/natural-language-parser';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { isOnCooldown } from '@tiltcheck/tiltcheck-core';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { BotWalletService } from '../services/tipping/bot-wallet.js';
import type { TokenDepositMonitor } from '../services/tipping/token-deposit-monitor.js';
import { DEPOSIT_TOKENS } from '../services/tipping/token-swap.js';

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

const activeAirdrops = new Map<string, {
  hostId: string;
  amountPerUserLamports: number;
  totalSlots: number;
  claimedBy: Set<string>;
}>();

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
    .setTitle('JustTheTip - Credit-Based Tipping')
    .setDescription('Deposit SOL to your credit balance, then tip others instantly!')
    .addFields(
      { name: 'Step 1', value: 'Register your withdrawal wallet: `/tip wallet register-external`' },
      { name: 'Step 2', value: 'Load your balance: `/tip deposit`' },
      { name: 'Step 3', value: 'Send a tip: `/tip send @user $5`' }
    );
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDeposit(interaction: ChatInputCommandInteraction) {
  const code = depositMonitor.generateDepositCode(interaction.user.id);
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('📥 Load SOL Credit')
    .setDescription(`Send SOL to:\n\`${botWallet.address}\`\n\n**Memo (REQUIRED):**\n\`${code}\``);
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
  await interaction.deferReply();
  const recipient = interaction.options.getUser('user', true);
  const amountStr = interaction.options.getString('amount', true);
  const parse = parseAmountNL(amountStr);

  if (!parse.success || !parse.data) {
    await interaction.editReply(`❌ Invalid amount: ${parse.error}`);
    return;
  }

  const solPrice = pricingOracle.getUsdPrice('SOL');
  const amountLamports = parse.data.currency === 'USD'
    ? Math.floor((parse.data.value / solPrice) * LAMPORTS_PER_SOL)
    : Math.floor(parse.data.value * LAMPORTS_PER_SOL);

  try {
    const bal = await creditManager.getBalance(recipient.id);
    if (!bal?.wallet_address) {
      await interaction.editReply(`❌ ${recipient.username} has no wallet. Tell them to run \`/tip wallet register-external\``);
      return;
    }

    const { senderNewBalance, netAmount } = await creditManager.deductForTip(interaction.user.id, recipient.id, amountLamports);
    const signature = await botWallet.sendSOL(bal.wallet_address, netAmount);

    await interaction.editReply(`✅ Sent tip to ${recipient}! New balance: ${(senderNewBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n[Transaction](https://solscan.io/tx/${signature})`);
  } catch (err) {
    await interaction.editReply(`❌ Error: ${err instanceof Error ? err.message : err}`);
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
    await interaction.editReply(`✅ Withdrawn ${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL to \`${walletAddress}\`\n[Transaction](https://solscan.io/tx/${sig})`);
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
    await interaction.reply({ content: `🔐 Locked vault created (ID: ${vault.id}). Unlocks <t:${Math.floor(vault.unlockAt / 1000)}:R>`, ephemeral: true });
  } catch (err) {
    await interaction.reply({ content: `❌ Lock failed: ${err instanceof Error ? err.message : err}`, ephemeral: true });
  }
}

async function handleVaultUnlock(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  try {
    const vault = unlockVault(interaction.user.id, id);
    await interaction.reply({ content: `✅ Vault ${id} unlocked!`, ephemeral: true });
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
  const list = vaults.map((v: any) => `• ${v.id}: ${v.status}, unlocks <t:${Math.floor(v.unlockAt / 1000)}:R>`).join('\n');
  await interaction.reply({ content: `🔐 **Your Vaults:**\n${list}`, ephemeral: true });
}

async function handleAirdrop(interaction: ChatInputCommandInteraction) {
  await interaction.reply({ content: 'Airdrops are coming soon in the consolidated bot!', ephemeral: true });
}
