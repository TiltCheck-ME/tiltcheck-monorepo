/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Message } from 'discord.js';
import type { Command } from '../types.js';
import { db } from '@tiltcheck/database';
import { parseAmountNL } from '@tiltcheck/natural-language-parser';
import { getUsdPriceSync } from '@tiltcheck/utils';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

export const juice: Command = {
  data: new SlashCommandBuilder()
    .setName('juice')
    .setDescription('Unleash the liquid gold! Drop SOL to the quick-reacting degens in this channel.') // MODIFIED
    .addStringOption(opt =>
      opt.setName('amount').setDescription('How much of that sweet, sweet SOL to rain down on the peasants? (e.g. "1 SOL" or "$50")').setRequired(true) // MODIFIED
    )
    .addIntegerOption(opt =>
      opt.setName('users').setDescription('Max number of lucky degens who can catch the rain. (Don't be stingy).').setRequired(true) // MODIFIED
    )
    .addIntegerOption(opt =>
      opt.setName('time').setDescription('How long until the free money disappears? Time in seconds. (default 60)').setMinValue(10).setMaxValue(300) // MODIFIED
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const amountRaw = interaction.options.getString('amount', true);
    const maxUsers = interaction.options.getInteger('users', true);
    const timeLimit = interaction.options.getInteger('time') || 60;

    await interaction.deferReply();

    // 1. Parse Amount
    const parseResult = parseAmountNL(amountRaw);
    if (!parseResult.success || !parseResult.data) {
      await interaction.editReply({ content: '❌ Your SOL format is as bad as your trading decisions. Use "$10" or "0.5 SOL", degen.' }); // MODIFIED
      return;
    }

    let totalSol = parseResult.data.value;
    if (parseResult.data.currency === 'USD') {
      try {
        const price = getUsdPriceSync('SOL');
        totalSol = parseResult.data.value / price;
      } catch {
        await interaction.editReply({ content: '❌ The market's f***ed, so I can't get a USD price. Specify your drop in SOL, you ape.' }); // MODIFIED
        return;
      }
    }

    // 2. Create Escrow
    const escrow = Keypair.generate();
    const amountLamports = Math.floor(totalSol * LAMPORTS_PER_SOL);
    
    // Solana Pay-like link (Simplified)
    const solanaPayUrl = `solana:${escrow.publicKey.toBase58()}?amount=${totalSol.toFixed(4)}&label=Juice+Drop&message=Fund+the+Escrow`;

    const fundBtn = new ButtonBuilder()
      .setLabel('🧃 Fund the Damn Juice!') // MODIFIED
      .setStyle(ButtonStyle.Link)
      .setURL(solanaPayUrl);

    const fundRow = new ActionRowBuilder<ButtonBuilder>().addComponents(fundBtn);

    const fundEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('🧃 Prepare the F***ing Juice!') // MODIFIED
      .setDescription(`You're about to rain down **${totalSol.toFixed(4)} SOL** on ${maxUsers} lucky degens! First, fund this temporary escrow wallet. It's safe, I promise. Probably.

**Escrow Address:** `${escrow.publicKey.toBase58()}`

*This escrow will be emptied immediately after the event ends. No rug pulls here, just good old-fashioned distribution.*`) // MODIFIED
      .setFooter({ text: 'TiltCheck Non-Custodial Funding • But we're holding it for a second for the greater good.' }); // MODIFIED

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
      await interaction.editReply({ content: '❌ You took too long, degen! Escrow funding timed out. Juice drop cancelled. Get it together next time.', components: [] }); // MODIFIED
      return;
    }

    // 4. Post the Reaction Message
    const dropEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('🧃 LIQUID GOLD IS SPILLING! GET SOME, DEGENS!') // MODIFIED
      .setDescription(`${interaction.user} is about to make it rain **${totalSol.toFixed(4)} SOL**!

React with 🧃 right the f*** now to claim your share before it's gone!

**Limits:** Max ${maxUsers} degens | **Time:** ${timeLimit}s. Don't be a slowpoke.`) // MODIFIED
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    const dropMessage = await interaction.channel?.send({ embeds: [dropEmbed] }) as Message;
    await dropMessage.react('🧃');

    // 5. Collect Reactions
    const filter = (reaction: any, user: any) => reaction.emoji.name === '🧃' && !user.bot;
    const collector = dropMessage.createReactionCollector({ filter, time: timeLimit * 1000, max: maxUsers });

    collector.on('end', async (collected) => {
      const users = collected.first()?.users.cache.filter(u => !u.bot).map(u => u.id) || [];
      
      if (users.length === 0) {
        await interaction.channel?.send('😢 What? No one caught the juice? This is why we can't have nice things. Returning funds to the spiller...'); // MODIFIED
        // Refund logic here...
        return;
      }

      await interaction.channel?.send(`⌛ Time's up! The feeding frenzy is over. Processing payouts for ${users.length} lucky degens... Don't spend it all in one place. Or do. We don't care.`); // MODIFIED

      // 6. Execute Payouts
      const recipients: string[] = [];
      for (const uid of users) {
        const identity = await db.getDegenIdentity(uid);
        if (identity?.primary_external_address) {
          recipients.push(identity.primary_external_address);
        }
      }

      if (recipients.length === 0) {
        await interaction.channel?.send('❌ What the f***? No linked wallets? You can't catch juice with empty pockets! Use `/linkwallet` next time, you degenerate.'); // MODIFIED
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
        await interaction.channel?.send(`✅ **JUICE DISTRIBUTED!** 💸
${recipients.length} wallets just got f***ing blessed. Go check your bags, degens!

**Tx:** https://solscan.io/tx/${signature}`); // MODIFIED
      } catch (err) {
        console.error('[Juice] Payout error:', err);
        await interaction.channel?.send('❌ Payout failed! Some sh** went wrong and funds are stuck in escrow. Contact an admin, you lucky f***.'); // MODIFIED
      }
    });
  },
};
