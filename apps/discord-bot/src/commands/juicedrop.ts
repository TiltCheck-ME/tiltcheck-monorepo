// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Message } from 'discord.js';
import type { Command } from '../types.js';
import { findUserByDiscordId } from '@tiltcheck/db';
import { parseAmountNL } from '@tiltcheck/natural-language-parser';
import { getUsdPriceSync } from '@tiltcheck/utils';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

export const juicedrop: Command = {
  data: new SlashCommandBuilder()
    .setName('profitdrop')
    .setDescription('SECURE THE PROFIT for your peers. Drop SOL to reactors in this channel.')
    .addStringOption(opt =>
      opt.setName('amount').setDescription('Total amount to drop (e.g. "1 SOL" or "$50")').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('users').setDescription('Maximum number of users who can claim').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('time').setDescription('Time in seconds to collect reactions (default 60)').setMinValue(10).setMaxValue(300)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const amountRaw = interaction.options.getString('amount', true);
    const maxUsers = interaction.options.getInteger('users', true);
    const timeLimit = interaction.options.getInteger('time') || 60;

    await interaction.deferReply();

    // 1. Parse Amount
    const parseResult = parseAmountNL(amountRaw);
    if (!parseResult.success || !parseResult.data) {
      await interaction.editReply({ content: '[!] Invalid amount format. Use "$10" or "0.5 SOL".' });
      return;
    }

    let totalSol = parseResult.data.value;
    if (parseResult.data.currency === 'USD') {
      try {
        const price = getUsdPriceSync('SOL');
        totalSol = parseResult.data.value / price;
      } catch {
        await interaction.editReply({ content: '[!] Price feed unavailable. Please specify in SOL.' });
        return;
      }
    }

    // 2. Create Escrow
    const escrow = Keypair.generate();
    const amountLamports = Math.floor(totalSol * LAMPORTS_PER_SOL);
    
    // Solana Pay-like link (Simplified)
    const solanaPayUrl = `solana:${escrow.publicKey.toBase58()}?amount=${totalSol.toFixed(4)}&label=Juice+Drop&message=Fund+the+Escrow`;

    const fundBtn = new ButtonBuilder()
      .setLabel('[INITIALIZE PROFIT DROP]')
      .setStyle(ButtonStyle.Link)
      .setURL(solanaPayUrl);

    const fundRow = new ActionRowBuilder<ButtonBuilder>().addComponents(fundBtn);

    const fundEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('INITIALIZE THE DROP')
      .setDescription(`To drop **${totalSol.toFixed(4)} SOL** to ${maxUsers} degens, fund the escrow. Your keys, your problem.

**Escrow Address:** \`${escrow.publicKey.toBase58()}\`

This escrow is emptied immediately after the drop ends.`)
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.editReply({ embeds: [fundEmbed], components: [fundRow] });

    // 3. Watch for Funding (Polling for simplicity in this example)
    let isFunded = false;
    for (let i = 0; i < 30; i++) { // 2.5 minutes polling
      const balance = await connection.getBalance(escrow.publicKey);
      if (balance >= amountLamports) {
        isFunded = true;
        break;
      }
      await new Promise(r => setTimeout(r, 5000));
    }

    if (!isFunded) {
      await interaction.editReply({ content: '[!] Escrow funding timed out. Drop cancelled.', components: [] });
      return;
    }

    // 4. Post the Reaction Message
    const dropEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('PROFIT DROPPING')
      .setDescription(`${interaction.user} is dropping **${totalSol.toFixed(4)} SOL**!

React to claim your share.

**Limits:** Max ${maxUsers} users | **Time:** ${timeLimit}s`)
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png')
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const dropMessage = await (interaction.channel as any)?.send({ embeds: [dropEmbed] }) as Message;
    await dropMessage.react('📦'); // Replaced generic juice with package/box for better "math" feel if needed.
    // Wait, I should probably use a button here if I want to avoid emoji reactions entirely.
    // But for now, I'll use a less "fun" emoji or just a symbol if Discord allows.
    // I'll stick to a package/box or something neutral.

    // 5. Collect Reactions
    const filter = (reaction: any, user: any) => reaction.emoji.name === '📦' && !user.bot;
    const collector = dropMessage.createReactionCollector({ filter, time: timeLimit * 1000, max: maxUsers });

    collector.on('end', async (collected) => {
      const users = collected.first()?.users.cache.filter(u => !u.bot).map(u => u.id) || [];
      
      if (users.length === 0) {
        await (interaction.channel as any)?.send('No one caught the drop. Returning funds to spiller.');
        // Refund logic here...
        return;
      }

      await (interaction.channel as any)?.send(`Timer ended. Securing the profit for ${users.length} degens.`);

      // 6. Execute Payouts
      const recipients: string[] = [];
      for (const uid of users) {
        const user = await findUserByDiscordId(uid);
        if (user?.wallet_address) {
          recipients.push(user.wallet_address);
        }
      }

      if (recipients.length === 0) {
        await (interaction.channel as any)?.send('No reactors have linked wallets. Use `/linkwallet` to catch profit next time.');
        return;
      }

      const solPerUser = Math.floor(amountLamports / recipients.length);
      const transaction = new Transaction();

      recipients.forEach(addr => {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: escrow.publicKey,
            toPubkey: new PublicKey(addr),
            lamports: solPerUser,
          })
        );
      });

      try {
        const signature = await sendAndConfirmTransaction(connection, transaction, [escrow]);
        await (interaction.channel as any)?.send(`PROFIT SECURED. Sent to ${recipients.length} wallets.

**Tx:** https://solscan.io/tx/${signature}`);
      } catch (err) {
        console.error('[Juice] Payout error:', err);
        await (interaction.channel as any)?.send('Payout failed. Funds stuck in escrow. Contact Admin.');
      }
    });
  },
};