/**
 * JustTheTip Commands
 * Non-custodial tipping on Solana
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { 
  registerExternalWallet, 
  getWallet, 
  getWalletBalance,
  hasWallet,
  createTipWithFeeRequest,
  trackTransactionByReference,
  getPendingTips,
} from '@tiltcheck/justthetip';
import { parseAmount, formatAmount } from '@tiltcheck/natural-language-parser';
import { isOnCooldown } from '@tiltcheck/tiltcheck-core';
import { db } from '@tiltcheck/database';
import { Connection } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export const justthetip: Command = {
  data: new SlashCommandBuilder()
    .setName('justthetip')
    .setDescription('Direct wallet-to-wallet tipping (no middleman)')
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
          opt
            .setName('address')
            .setDescription('Wallet address (for external registration)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('tip')
        .setDescription('Send a tip to another user')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User to tip')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('amount')
            .setDescription('Amount (e.g., "5 sol", "$10", "all")')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('balance')
        .setDescription('Check your wallet balance')
    )
    .addSubcommand(sub =>
      sub
        .setName('pending')
        .setDescription('View pending tips sent to you')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand(false);

      if (!subcommand) {
        await interaction.reply({
          content: '❌ Bro, what do you want? Pick a subcommand:\n' +
            '• `/justthetip wallet` - Manage your wallet\n' +
            '• `/justthetip tip` - Send a tip\n' +
            '• `/justthetip balance` - Check balance\n' +
            '• `/justthetip pending` - View pending tips',
          ephemeral: true
        });
        return;
      }

      switch (subcommand) {
        case 'wallet':
          await handleWallet(interaction);
          break;
        case 'tip':
          await handleTip(interaction);
          break;
        case 'balance':
          await handleBalance(interaction);
          break;
        case 'pending':
          await handlePending(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command', ephemeral: true });
      }
    } catch (error) {
      console.error('[JUSTTHETIP] Command error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `❌ Error: ${errorMessage}` });
      } else {
        await interaction.reply({ content: `❌ Error: ${errorMessage}`, ephemeral: true });
      }
    }
  },
};

async function handleWallet(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);

  if (action === 'view') {
    const wallet = getWallet(interaction.user.id);
    
    if (!wallet) {
      await interaction.reply({
        content: '❌ No wallet? NGMI. Use `/justthetip wallet register-external`',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💳 The Stash')
      .addFields(
        { name: 'Address', value: `\`${wallet.address}\``, inline: false },
        { name: 'Type', value: wallet.type, inline: true },
        { name: 'Registered', value: `<t:${Math.floor(wallet.registeredAt / 1000)}:R>`, inline: true },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-magic') {
    if (db.isConnected()) {
      const identity = await db.getDegenIdentity(interaction.user.id);
      if (identity?.magic_address) {
        await interaction.reply({
          content: `✅ You already have a **Degen Identity** wallet linked:\n\`${identity.magic_address}\``,
          ephemeral: true,
        });
        return;
      }
    }

    const dashboardUrl = process.env.DASHBOARD_URL || 'https://tiltcheck.me/dashboard';
    const linkUrl = `${dashboardUrl}?action=link-magic&userId=${interaction.user.id}`;
    
    const embed = new EmbedBuilder()
      .setColor(0x8A2BE2)
      .setTitle('✨ Magic Link (Normie Mode)')
      .setDescription('Connect your email to create a secure **Soft-Custody** wallet. Good for beginners, bad for maxis.')
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
          '`/justthetip wallet register-external address:<your-address>`\n\n' +
          'Find your address in Phantom, Solflare, or other Solana wallets.',
        ephemeral: true,
      });
      return;
    }

    try {
      const wallet = await registerExternalWallet(interaction.user.id, address);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Wallet Linked')
        .setDescription('Your wallet is connected. You are ready to ape.')
        .addFields(
          { name: 'Address', value: `\`${wallet.address}\``, inline: false },
          { name: 'Type', value: 'External', inline: true },
        )
        .setFooter({ text: 'Funds SAFU.' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({
        content: `❌ ${error instanceof Error ? error.message : 'Invalid wallet address'}`,
        ephemeral: true,
      });
    }
  }
}

async function handleTip(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Check if sender is on cooldown
  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({
      content: '🚫 You\'re on cooldown. Go touch grass.',
    });
    return;
  }

  // Check sender has wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ No wallet? NGMI. Link one first.\n' +
        'Use `/justthetip wallet register-external` to connect your Solana wallet.',
    });
    return;
  }

  const recipient = interaction.options.getUser('user', true);
  const amountInput = interaction.options.getString('amount', true);

  // Don't allow self-tipping
  if (recipient.id === interaction.user.id) {
    await interaction.editReply({
      content: '❌ Stop playing with yourself. Tip someone else.',
    });
    return;
  }

  // Parse amount with NLP
  const parseResult = parseAmount(amountInput);
  
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({
      content: `❌ ${parseResult.error}\n\n` +
        `${parseResult.suggestions?.join('\n') || ''}`,
    });
    return;
  }

  const parsedAmount = parseResult.data;

  // Handle confirmation if needed
  if (parseResult.needsConfirmation && parseResult.confirmationPrompt) {
    const confirmButton = new ButtonBuilder()
      .setCustomId(`tip_confirm_sol_${recipient.id}_${parsedAmount.value}`)
      .setLabel(`Send It (${parsedAmount.value} SOL)`)
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('tip_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

    await interaction.editReply({
      content: `⚠️ **Hol' up**\n\n${parseResult.confirmationPrompt}`,
      components: [row],
    });
    return;
  }

  // Check if recipient has wallet
  const recipientWallet = getWallet(recipient.id);
  const senderWallet = getWallet(interaction.user.id);
  
  if (!senderWallet) {
    throw new Error('Sender wallet not found');
  }

  if (!recipientWallet) {
    await interaction.editReply({
      content: `⚠️ **${recipient}** is walletless (NGMI).\n` +
        'Tip held for 24h. Tell them to register or it expires.',
    });
    
    // We can't really "hold" a non-custodial tip without the sender signing something,
    // so we just log it as a pending intent for now.
    return;
  }

  // Generate Solana Pay deep link
  try {
    const { url, reference } = await createTipWithFeeRequest(
      connection,
      senderWallet.address,
      recipientWallet.address,
      parsedAmount.value,
      `TiltCheck Tip to ${recipient.username}`
    );

    // Track the transaction by reference
    trackTransactionByReference(
      reference,
      interaction.user.id,
      'tip',
      parsedAmount.value,
      recipient.id
    );

    // Create button with Solana Pay deep link
    const payButton = new ButtonBuilder()
      .setLabel('💸 Sign Transaction')
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💸 Send It')
      .setDescription(
        `**Recipient:** ${recipient}\n` +
        `**Amount:** ${formatAmount(parsedAmount)}\n` +
        `**Fee:** 0.0007 SOL (~$0.07)\n\n` +
        '**Smash the button** to sign in your wallet:\n' +
        '• Phantom\n' +
        '• Solflare\n' +
        '• Backpack\n' +
        '• Any Solana wallet\n\n' +
        'Your device will ask which wallet to use! 📱'
      )
      .setFooter({ text: 'Powered by Solana Pay • Don\'t fade it' });

    await interaction.editReply({ 
      embeds: [embed],
      components: [row],
    });

  } catch (error) {
    await interaction.editReply({
      content: `❌ Failed to create payment request: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ No wallet? NGMI. Use `/justthetip wallet register-external`',
    });
    return;
  }

  try {
    const balance = await getWalletBalance(interaction.user.id);
    const wallet = getWallet(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('💰 The Stash')
      .addFields(
        { name: 'Balance', value: `${balance.toFixed(6)} SOL`, inline: true },
        { name: 'Address', value: `\`${wallet?.address}\``, inline: false },
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply({
      content: `❌ Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function handlePending(interaction: ChatInputCommandInteraction) {
  const pending = getPendingTips(interaction.user.id);
  
  if (pending.length === 0) {
    await interaction.reply({
      content: '📋 No free money waiting for you.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📋 Free Money (Pending)')
    .setDescription('Tips sent while you were walletless. Claim them now.')
    .addFields(
      pending.map(tip => ({
        name: `${tip.amount} SOL`,
        value: `From: <@${tip.senderId}>\nExpires: <t:${Math.floor(tip.expiresAt / 1000)}:R>`,
        inline: false
      }))
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
