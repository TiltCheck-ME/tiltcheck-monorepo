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
import { getUsdPriceSync } from '@tiltcheck/utils';
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
    .setDescription('The custodial wallet. Deposit SOL, send tips, withdraw. Try not to lose it all.')
    .addSubcommand((sub) => sub.setName('help').setDescription('Figure out how this whole tipping thing works.'))
    .addSubcommand(sub => sub
      .setName('deposit')
      .setDescription('Get your personal deposit address to load up on SOL.')
    )
    .addSubcommand(sub => sub
      .setName('deposit-token')
      .setDescription('Deposit other sh**coins. We\'ll swap them to SOL for you.')
      .addStringOption(o => o
        .setName('token')
        .setDescription('Token symbol (e.g. USDC). If it\'s not on the list, we don\'t want it.')
        .setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName('send')
      .setDescription('Make it rain on another degen from your balance.')
      .addUserOption(o => o.setName('user').setDescription('Who are you blessing?').setRequired(true))
      .addStringOption(o => o.setName('amount').setDescription('How much? (e.g. "$5", "0.1 sol")').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('airdrop')
      .setDescription('Spread the love. Or show off. Your call.')
      .addStringOption(o => o.setName('amount').setDescription('Amount per person. Don\'t be cheap.').setRequired(true))
      .addStringOption(o => o.setName('recipients').setDescription('Tag the lucky ones (@user1 @user2) or just type "public"').setRequired(false))
      .addIntegerOption(o => o.setName('slots').setDescription('Max number of people who can claim.').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('withdraw')
      .setDescription('Cash out your winnings. Or what\'s left of them.')
    )
    .addSubcommand(sub => sub
      .setName('balance')
      .setDescription('Check your stack. Hope it\'s not zero.')
    )
    .addSubcommand(sub => sub
      .setName('history')
      .setDescription('See your transaction history. The good, the bad, and the ugly.')
    )
    .addSubcommand(sub => sub
      .setName('wallet')
      .setDescription('Manage your withdrawal wallet. This is where the money goes.')
      .addStringOption(o => o
        .setName('action')
        .setDescription('View or register your wallet.')
        .setRequired(true)
        .addChoices(
          { name: 'View', value: 'view' },
          { name: 'Register', value: 'register-external' },
        ))
      .addStringOption(o => o.setName('address').setDescription('Your Solana wallet address.').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('lock')
      .setDescription('Lock your funds so your drunk ass can\'t touch them.')
      .addStringOption(o => o.setName('amount').setDescription('How much to lock up?').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('For how long? (e.g., "1d", "8h")').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Why are you doing this to yourself? (optional)'))
    )
    .addSubcommand(sub => sub
      .setName('unlock')
      .setDescription('Unlock a vault that\'s served its time.')
      .addStringOption(o => o.setName('id').setDescription('Which vault ID?').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('vaults')
      .setDescription('See your funds in timeout.')
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
    .setTitle('How To Not Be a Poor: Tipping Edition')
    .setDescription('This is your custodial wallet. It holds the money. Don\'t f*** it up. Here\'s how it works:')
    .addFields(
      { name: 'Step 1: Register', value: 'Tell us where to send your money if you ever decide to cash out. Use `/tip wallet register`.' },
      { name: 'Step 2: Deposit', value: 'Load up your balance with SOL or other sh**coins. Use `/tip deposit`.' },
      { name: 'Step 3: Make It Rain', value: 'Send tips to other degens. Use `/tip send @user $5`.' }
    )
    .setFooter({ text: 'If you lose money, that\'s on you. Not us.' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDeposit(interaction: ChatInputCommandInteraction) {
  const code = depositMonitor.generateDepositCode(interaction.user.id);
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('Load Up Your Wallet')
    .setDescription(`Send SOL to the bot's wallet address below.
**YOU MUST USE THE MEMO OR YOUR FUNDS WILL BE A DONATION.**`)
    .addFields(
      { name: 'Bot Wallet Address', value: `\`${botWallet.address}\`` },
      { name: 'Your Unique Memo', value: `\`${code}\`` }
    )
    .setFooter({ text: 'Funds should appear in your balance after a few confirmations. Or they won\'t. Blockchain, amirite?' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDepositToken(interaction: ChatInputCommandInteraction) {
  if (!tokenDepositMonitor) {
    await interaction.reply({ content: 'Token deposits are disabled right now. Sucks to be you.', ephemeral: true });
    return;
  }
  const token = interaction.options.getString('token', true).toUpperCase();
  const code = depositMonitor.generateDepositCode(interaction.user.id);
  tokenDepositMonitor.registerDepositCode(code, interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(`So, You Have Some ${token}...`)
    .setDescription(`Alright, we'll take it. Send your ${token} to the bot's wallet address below. We'll swap it for SOL.
**AND DON'T FORGET THE MEMO. SERIOUSLY.**`)
    .addFields(
      { name: 'Bot Wallet Address', value: `\`${botWallet.address}\`` },
      { name: 'Your Unique Memo', value: `\`${code}\`` }
    )
    .setFooter({ text: 'If it doesn\'t show up, you probably f***ed up the memo.' });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSend(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const recipient = interaction.options.getUser('user', true);
  const amountStr = interaction.options.getString('amount', true);
  
  if (recipient.id === interaction.user.id) {
    await interaction.editReply('You can\'t tip yourself, you narcissistic f***.');
    return;
  }
  
  const parse = parseAmountNL(amountStr);

  if (!parse.success || !parse.data) {
    await interaction.editReply(`That's not a real number. Try again with an actual amount, like '$5' or '0.1 sol'.`);
    return;
  }

  const solPrice = getUsdPriceSync('SOL');
  const amountLamports = parse.data.currency === 'USD'
    ? Math.floor((parse.data.value / solPrice) * LAMPORTS_PER_SOL)
    : Math.floor(parse.data.value * LAMPORTS_PER_SOL);

  try {
    const bal = await creditManager.getBalance(recipient.id);
    if (!bal?.wallet_address) {
      await interaction.editReply(`${recipient.username} hasn't registered a wallet. They're probably poor. Tell them to run \`/tip wallet register\`.`);
      return;
    }

    const { senderNewBalance, netAmount } = await creditManager.deductForTip(interaction.user.id, recipient.id, amountLamports);
    const signature = await botWallet.sendSOL(bal.wallet_address, netAmount);

    await interaction.editReply(`Sent tip to ${recipient}! You now have ${(senderNewBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL left to degen away.\n[Transaction](https://solscan.io/tx/${signature})`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Something f***ed up.';
    await interaction.editReply(`Error: ${errorMessage}`);
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction) {
  const bal = await creditManager.getBalance(interaction.user.id);
  const sol = ((bal?.balance_lamports || 0) / LAMPORTS_PER_SOL).toFixed(4);
  const solPrice = getUsdPriceSync('SOL');
  const usd = (parseFloat(sol) * solPrice).toFixed(2);
  await interaction.reply({ content: `You're sitting on ${sol} SOL (about $${usd}). Don't spend it all in one place.`, ephemeral: true });
}

async function handleWithdraw(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const { amountLamports, walletAddress } = await creditManager.withdraw(interaction.user.id);
    if (amountLamports === 0) {
      await interaction.editReply('You have no money. You can\'t withdraw zero.');
      return;
    }
    const sig = await botWallet.sendSOL(walletAddress, amountLamports);
    await interaction.editReply(`Sent ${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL to your wallet: \`${walletAddress}\`. It's your money now, try not to lose it immediately.\n[Transaction](https://solscan.io/tx/${sig})`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Something f***ed up.';
    await interaction.editReply(`Withdrawal failed. ${errorMessage}`);
  }
}

async function handleHistory(interaction: ChatInputCommandInteraction) {
  const txs = await creditManager.getTransactionHistory(interaction.user.id, 10);
  if (!txs.length) {
    await interaction.reply({ content: 'No transaction history. You either have the patience of a saint, or you\'re just getting started.', ephemeral: true });
    return;
  }
  const lines = txs.map(t => {
    const action = t.type === 'deposit' ? 'Deposited' : 'Sent';
    const amount = (t.amount_lamports / LAMPORTS_PER_SOL).toFixed(4);
    const date = new Date(t.created_at).toLocaleString();
    return `• ${action} ${amount} SOL @ ${date}`;
  });
  await interaction.reply({ content: `**Your Paper Trail:**\n${lines.join('\n')}`, ephemeral: true });
}

async function handleWallet(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);
  if (action === 'view') {
    const bal = await creditManager.getBalance(interaction.user.id);
    await interaction.reply({ content: `Your withdrawal wallet is set to: \`${bal?.wallet_address || 'Nothing. You should probably set one.'}\``, ephemeral: true });
  } else {
    const addr = interaction.options.getString('address', true);
    // Basic validation, can be improved
    if (!addr || addr.length < 32 || addr.length > 44) {
      await interaction.reply({ content: `That doesn't look like a real Solana address. Try again.`, ephemeral: true });
      return;
    }
    await creditManager.registerWallet(interaction.user.id, addr);
    await interaction.reply({ content: `Alright, your withdrawal wallet is now set to \`${addr}\`. Don't mess it up.`, ephemeral: true });
  }
}

async function handleVaultLock(interaction: ChatInputCommandInteraction) {
  const amountStr = interaction.options.getString('amount', true);
  const durationStr = interaction.options.getString('duration', true);
  const reason = interaction.options.getString('reason') || 'Saving you from yourself';

  try {
    const vault = await lockVault({ userId: interaction.user.id, amountRaw: amountStr, durationRaw: durationStr, reason });
    await interaction.reply({ content: `Vault locked (ID: ${vault.id}). We've hidden your money from you. It unlocks <t:${Math.floor(vault.unlockAt / 1000)}:R>.`, ephemeral: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Something f***ed up.';
    await interaction.reply({ content: `Couldn't lock your vault. ${errorMessage}`, ephemeral: true });
  }
}

async function handleVaultUnlock(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getString('id', true);
  try {
    const vault = unlockVault(interaction.user.id, id);
    const released = vault.lockedAmountSOL === 0 ? 'ALL' : `${vault.lockedAmountSOL.toFixed(4)} SOL`;
    await interaction.reply({ content: `Vault ${id} unlocked. We've released ${released} back into your custody. Try not to lose it all at once.`, ephemeral: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Something f***ed up.';
    await interaction.reply({ content: `Couldn't unlock that vault. ${errorMessage}`, ephemeral: true });
  }
}

async function handleVaultStatus(interaction: ChatInputCommandInteraction) {
  const vaults = getVaultStatus(interaction.user.id);
  if (!vaults.length) {
    await interaction.reply({ content: 'You have no funds in timeout. You\'re either responsible or broke.', ephemeral: true });
    return;
  }
  const list = vaults.map((v: any) => {
    const ready = Date.now() >= v.unlockAt ? 'Ready to be unlocked' : 'Still in timeout';
    const amount = v.lockedAmountSOL === 0 ? 'ALL' : `${Number(v.lockedAmountSOL || 0).toFixed(4)} SOL`;
    return `• ID ${v.id}: ${amount} | Status: ${v.status} (${ready}) | Unlocks: <t:${Math.floor(v.unlockAt / 1000)}:R>`;
  }).join('\n');
  await interaction.reply({ content: `**Your Time-Locked Degeneracy:**\n${list}`, ephemeral: true });
}

async function handleAirdrop(interaction: ChatInputCommandInteraction) {
  await interaction.reply({ content: 'Patience, degen. This command is still cooking. Don\'t DM the admins about it.', ephemeral: true });
}
