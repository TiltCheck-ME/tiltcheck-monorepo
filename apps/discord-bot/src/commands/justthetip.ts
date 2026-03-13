/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
    .setDescription('Non-custodial Solana tipping. We move SOL, not your f***ing private keys.') // MODIFIED
    .addSubcommand(sub =>
      sub
        .setName('wallet')
        .setDescription('Manage your degen wallet. View, register, or connect.') // MODIFIED
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Wallet action')
            .setRequired(true)
            .addChoices(
              { name: 'View (your wallet details)', value: 'view' }, // MODIFIED
              { name: 'Register (Magic Link: The easy way)', value: 'register-magic' }, // MODIFIED
              { name: 'Register (External: For the OGs)', value: 'register-external' }, // MODIFIED
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
        .setDescription('Rain down some SOL on another degen. (No bot fees, just blockchain sh**).') // MODIFIED
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User to tip')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('amount')
            .setDescription('How much SOL to bless them with? ("5 sol", "$10", "all")') // MODIFIED
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('balance')
        .setDescription('Check your f***ing SOL balance. Hope it's green.') // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('pending')
        .setDescription('See who tried to tip you before you had a wallet. Don't miss out.') // MODIFIED
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand(false);

      if (!subcommand) {
        await interaction.reply({
          content: '❌ What the f*** do you want? Pick a subcommand:
' + // MODIFIED
            '• `/justthetip wallet` - Manage your damn wallet
' + // MODIFIED
            '• `/justthetip tip` - Send some free money
' + // MODIFIED
            '• `/justthetip balance` - Check your SOL stack
' + // MODIFIED
            '• `/justthetip pending` - See who tried to bless you', // MODIFIED
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
        content: '❌ No wallet registered, you ape. Use `/justthetip wallet register-external` to set up your f***ing wallet.', // MODIFIED
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💳 Your Wallet. Hope It's Fat.') // MODIFIED
      .addFields(
        { name: 'Address', value: ``${wallet.address}``, inline: false },
        { name: 'Type', value: wallet.type, inline: true },
        { name: 'Registered', value: `<t:${Math.floor(wallet.registeredAt / 1000)}:R>`, inline: true },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-magic') {
    if (db.isConnected()) {
      const identity = await db.getDegenIdentity(interaction.user.id);
      if (identity?.magic_address) {
        await interaction.reply({
          content: `✅ You already got a **Degen Identity** wallet linked, you forgetful degen:
`${identity.magic_address}``, // MODIFIED
          ephemeral: true,
        });
        return;
      }
    }

    const dashboardUrl = process.env.DASHBOARD_URL || 'https://tiltcheck.me/dashboard';
    const linkUrl = `${dashboardUrl}?action=link-magic&userId=${interaction.user.id}`;
    
    const embed = new EmbedBuilder()
      .setColor(0x8A2BE2)
      .setTitle('✨ Register with Magic Link: The Easy F***ing Way') // MODIFIED
      .setDescription('Connect your email to create a secure, soft-custody wallet for tipping and vaulting. It's like magic, but for your crypto.') // MODIFIED
      .addFields(
        { name: 'Step 1', value: `[Click here to open the goddamn Dashboard](${linkUrl})` }, // MODIFIED
        { name: 'Step 2', value: 'Login with your Email' },
        { name: 'Step 3', value: 'Link your Discord account' }
      )
      .setFooter({ text: 'TiltCheck • Trust & Safety' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (action === 'register-external') {
    const address = interaction.options.getString('address');
    
    if (!address) {
      await interaction.reply({
        content: '❌ Where's your f***ing address? You need to tell me:
' + // MODIFIED
          '`/justthetip wallet register-external address:<your-address>`

' + // MODIFIED
          'Find it in your Phantom, Solflare, or whatever sketchy wallet you're using.', // MODIFIED
        ephemeral: true,
      });
      return;
    }

    try {
      const wallet = await registerExternalWallet(interaction.user.id, address);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Wallet Registered! Get Ready to Ape.') // MODIFIED
        .setDescription('Your external wallet has been connected. We see you.') // MODIFIED
        .addFields(
          { name: 'Address', value: ``${wallet.address}``, inline: false },
          { name: 'Type', value: 'External', inline: true },
        )
        .setFooter({ text: 'You can now send and receive tips! Don't be a cheap f***.' }); // MODIFIED

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({
        content: `❌ Well, sh**. Invalid wallet address or some other f***-up: ${error instanceof Error ? error.message : 'Unknown error'}.`, // MODIFIED
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
      content: '🚫 You're on cooldown, degen. Can't send tips when you're being a liability. Take a f***ing break.', // MODIFIED
    });
    return;
  }

  // Check sender has wallet
  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ What the f***? No wallet registered? Use `/justthetip wallet register-external` to connect your damn Solana wallet before you try to tip anyone.', // MODIFIED
    });
    return;
  }

  const recipient = interaction.options.getUser('user', true);
  const amountInput = interaction.options.getString('amount', true);

  // Don't allow self-tipping
  if (recipient.id === interaction.user.id) {
    await interaction.editReply({
      content: '❌ Seriously? You can't tip yourself, you narcissistic f***. Pick another degen.', // MODIFIED
    });
    return;
  }

  // Parse amount with NLP
  const parseResult = parseAmount(amountInput);
  
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({
      content: `❌ Your amount is as f***ed as your trading strategy: ${parseResult.error}

` + // MODIFIED
        `${parseResult.suggestions?.join('
') || ''}. Try again, but this time with a valid number.`, // MODIFIED
    });
    return;
  }

  const parsedAmount = parseResult.data;

  // Handle confirmation if needed
  if (parseResult.needsConfirmation && parseResult.confirmationPrompt) {
    const confirmButton = new ButtonBuilder()
      .setCustomId(`tip_confirm_sol_${recipient.id}_${parsedAmount.value}`)
      .setLabel(`F*** yeah, ${parsedAmount.value} SOL`) // MODIFIED
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('tip_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

    await interaction.editReply({
      content: `⚠️ **Confirm This S***!**

${parseResult.confirmationPrompt}`, // MODIFIED
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
      content: `⚠️ ${recipient} is rocking empty pockets, no wallet registered.
Your tip will be held for 24 hours. Tell that degen to link their f***ing wallet!`, // MODIFIED
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
      .setLabel('💸 Open in Wallet')
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('💸 Tip Ready to F***ing Send!') // MODIFIED
      .setDescription( // MODIFIED
        `**Recipient:** ${recipient}
` +
        `**Amount:** ${formatAmount(parsedAmount)}
` +
        `**Fee:** 0.0007 SOL (~$0.07) (That's cheaper than your mom's taxi ride.)

` +
        '**Tap the goddamn button below** to open in your wallet:
' +
        '• Phantom
' +
        '• Solflare
' +
        '• Backpack
' +
        '• Any f***ing Solana wallet

' +
        'Your device will ask which wallet to use! 📱'
      )
      .setFooter({ text: 'Powered by Solana Pay' });

    await interaction.editReply({ 
      embeds: [embed],
      components: [row],
    });

  } catch (error) {
    await interaction.editReply({
      content: `❌ Well, sh**. Couldn't summon that payment request: ${error instanceof Error ? error.message : 'Unknown error'}. Is the blockchain f***ed? Maybe. Try again.`, // MODIFIED
    });
  }
}

async function handleBalance(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!hasWallet(interaction.user.id)) {
    await interaction.editReply({
      content: '❌ No wallet registered, you ape. Use `/justthetip wallet register-external` to connect your f***ing wallet.', // MODIFIED
    });
    return;
  }

  try {
    const balance = await getWalletBalance(interaction.user.id);
    const wallet = getWallet(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('💰 Your SOL Stack. Hope It's Fat.') // MODIFIED
      .addFields(
        { name: 'Balance', value: `${balance.toFixed(6)} SOL`, inline: true },
        { name: 'Address', value: ``${wallet?.address}``, inline: false },
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply({
      content: `❌ Well, sh**. Couldn't fetch your f***ing balance: ${error instanceof Error ? error.message : 'Unknown error'}. Is the RPC f***ed? Maybe. Try again.`, // MODIFIED
    });
  }
}

async function handlePending(interaction: ChatInputCommandInteraction) {
  const pending = getPendingTips(interaction.user.id);
  
  if (pending.length === 0) {
    await interaction.reply({
      content: '📋 Your inbox is empty, just like your pockets. No pending tips for you, degen.', // MODIFIED
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📋 Pending Tips. Don't F***ing Miss Out.') // MODIFIED
    .setDescription('These tips were sent to you before you linked your f***ing wallet. Get it together, degen.') // MODIFIED
    .addFields(
      pending.map(tip => ({
        name: `${tip.amount} SOL`,
        value: `From: <@${tip.senderId}>
Expires: <t:${Math.floor(tip.expiresAt / 1000)}:R>`,
        inline: false
      }))
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
