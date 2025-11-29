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
} from '@tiltcheck/justthetip';
// TODO: Import trackTransaction once we can extract signatures from user wallet responses
import { parseAmount, formatAmount } from '@tiltcheck/natural-language-parser';
import { isOnCooldown } from '@tiltcheck/tiltcheck-core';
import { Connection } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export const justthetip: Command = {
  data: new SlashCommandBuilder()
    .setName('justthetip')
    .setDescription('Non-custodial Solana tipping')
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
    const subcommand = interaction.options.getSubcommand();

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
  },
};

async function handleWallet(interaction: ChatInputCommandInteraction) {
  const action = interaction.options.getString('action', true);

  if (action === 'view') {
    const wallet = getWallet(interaction.user.id);
    
    if (!wallet) {
      await interaction.reply({
        content: '❌ No wallet registered. Use `/justthetip wallet register-external`',
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
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-magic') {
    await interaction.reply({
      content: '❌ **Magic Link Not Supported**\n\n' +
        'We use Solana Pay QR codes for signing instead of Magic Link.\n' +
        'Please use `/justthetip wallet register-external` to connect your Phantom or Solflare wallet.',
      ephemeral: true,
    });
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

async function handleTip(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Check if sender is on cooldown
  if (isOnCooldown(interaction.user.id)) {
    await interaction.editReply({
      content: '🚫 You\'re on cooldown and cannot send tips right now. Take a break.',
    });
    return;
  }

  // Check sender has wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ You need to register a wallet first!\n' +
        'Use `/justthetip wallet register-external` to connect your Solana wallet.',
    });
    return;
  }

  const recipient = interaction.options.getUser('user', true);
  const amountInput = interaction.options.getString('amount', true);

  // Don't allow self-tipping
  if (recipient.id === interaction.user.id) {
    await interaction.editReply({
      content: '❌ You cannot tip yourself!',
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

  // Check if recipient has wallet
  const recipientWallet = getWallet(recipient.id);
  
  if (!recipientWallet) {
    await interaction.editReply({
      content: `⚠️ ${recipient} doesn't have a wallet registered yet.\n` +
        'Your tip will be held for 24 hours. They can claim it by registering a wallet.',
    });
    // TODO: Create pending tip
    return;
  }

  // Generate Solana Pay deep link
  try {
    const senderWallet = getWallet(interaction.user.id);
    if (!senderWallet) {
      throw new Error('Sender wallet not found');
    }

    const { url } = await createTipWithFeeRequest(
      connection,
      senderWallet.address,
      recipientWallet.address,
      parsedAmount.value,
      `TiltCheck Tip to ${recipient.username}`
    );

    // Create button with Solana Pay deep link
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
        '• Phantom\n' +
        '• Solflare\n' +
        '• Backpack\n' +
        '• Any Solana wallet\n\n' +
        'Your device will ask which wallet to use! 📱'
      )
      .setFooter({ text: 'Powered by Solana Pay' });

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
      content: '❌ No wallet registered. Use `/justthetip wallet register-external`',
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
      );

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
  
  // TODO: Integrate with getPendingTips from justthetip module
}
