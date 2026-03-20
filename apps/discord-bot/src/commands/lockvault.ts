/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * LockVault Commands
 * Time-lock funds using disposable Magic-like vault wallets.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { lockVault, unlockVault, extendVault, getVaultStatus, setAutoVault, getAutoVault, setReloadSchedule, getReloadSchedule, type LockVaultRecord } from '@tiltcheck/lockvault';
import { parseAmount, parseDuration } from '@tiltcheck/natural-language-parser';

export const lockvault: Command = {
  data: new SlashCommandBuilder()
    .setName('profit-locker')
    .setDescription('SECURE THE BAG. Audit your own entries and lock gains into cold storage.')
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('SECURE THE BAG. Move entries to your PROFIT LOCKER instantly.')
        .addStringOption(o => o.setName('amount').setDescription('How much SOL to lock away? ("$100", "5 SOL", "all")').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('How long to keep it locked? (e.g., 24h, 3d, 90m)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Why are you doing this to yourself? (optional)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('The floor is yours again. Reclaim your secured bags.')
        .addStringOption(o => o.setName('id').setDescription('Which Vault ID are you liberating?').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('extend')
        .setDescription('AUDIT THE ALPHA: Keep the bag locked for a longer session.')
        .addStringOption(o => o.setName('id').setDescription('Which Vault ID needs a longer sentence?').setRequired(true))
        .addStringOption(o => o.setName('additional').setDescription('How much more time? (e.g. 12h, 2d)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check on your funds in timeout.')
    )
    .addSubcommand(sub =>
      sub
        .setName('autovault')
        .setDescription('AUTODEPOSIT SIGNALS. Automate your bag securing with strict friction rules.')
        .addStringOption(o => o.setName('apikey').setDescription(`Your casino API key. We don't store it, so don't ask.`).setRequired(true))
        .addNumberOption(o => o.setName('percentage').setDescription('Percentage of each win to automatically stash away (0-100).'))
        .addNumberOption(o => o.setName('threshold').setDescription('Once your balance hits this, vault everything above it.'))
        .addStringOption(o => o.setName('currency').setDescription('Currency for threshold (SOL/USD)').addChoices({ name: 'SOL', value: 'SOL' }, { name: 'USD', value: 'USD' }))
        .addBooleanOption(o => o.setName('savefornft').setDescription('Auto-save for your Identity NFT? Smart.'))
    )
    .addSubcommand(sub =>
      sub
        .setName('reload')
        .setDescription('Schedule automatic reloads from your vault to your casino account.')
        .addStringOption(o => o.setName('amount').setDescription('How much to reload your account with? ("$50", "10 SOL")').setRequired(true))
        .addStringOption(o => o.setName('interval').setDescription('How often? (daily, weekly, monthly)').setRequired(true))
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'lock') {
        const embed = new EmbedBuilder()
          .setColor(0xFF4500)
          .setTitle('🔒 PROFIT LOCKER: PROTOCOL UPGRADE')
          .setDescription('We are **100% NON-CUSTODIAL.** YOUR KEYS, YOUR PROBLEM.\n\nTime-locking your funds cleanly requires a custodial license we refuse to buy, and lawyers we don\'t respect. We will not keep your keys on a centralized database. This isn\'t FTX.\n\nWe\'re coding a true **V2 On-Chain Smart Contract** right now to do this legally and natively.')
          .addFields({ name: 'Speed Up The Devs', value: 'Want the V2 smart contract faster? Throw some caffeine at the dev fund:\n👉 **[Drop a Ko-fi ☕](https://ko-fi.com/tiltcheck)**' })
          .setFooter({ text: 'TiltCheck: ZERO MORALITY, ALL ALPHA.' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;

      } else if (sub === 'unlock') {
        const id = interaction.options.getString('id', true);
        try {
          const vault = unlockVault(interaction.user.id, id);
          const embed = new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle('Freedom! Vault Unlocked.')
            .addFields(
              { name: 'Vault ID', value: vault.id },
              { name: `Released (SOL) - Go wild. Or don't.`, value: `${vault.lockedAmountSOL === 0 ? 'ALL' : `${vault.lockedAmountSOL.toFixed(4)} SOL`}` },
            );

          if (vault.vaultSecret) {
            embed.addFields({ 
              name: 'Your Precious Private Key (Don\'t F***ing Lose It)',
              value: `||${vault.vaultSecret}||`, 
              inline: false 
            });
            embed.setFooter({ text: `Keep this secret, degen! Use it to sweep your funds. If you lose it, you're f***ed.` });
          }
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `Well, sh**. Couldn't free your funds: ${(err as Error).message}`, ephemeral: true });
        }
      } else if (sub === 'extend') {
        const id = interaction.options.getString('id', true);
        const additional = interaction.options.getString('additional', true);
        try {
          const vault = extendVault(interaction.user.id, id, additional);
          const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('Vault Extended. More Time in the Slammer.')
            .addFields(
              { name: 'Vault ID', value: vault.id },
              { name: 'New Release Date', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>` },
              { name: 'Extended Prison Sentences', value: `${vault.extendedCount}` },
            );
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `Well, sh**. Couldn't extend your sentence: ${(err as Error).message}`, ephemeral: true });
        }
      } else if (sub === 'status') {
        const vaults = getVaultStatus(interaction.user.id);
        const autoVault = getAutoVault(interaction.user.id);
        const reloadSchedule = getReloadSchedule(interaction.user.id);

        if (vaults.length === 0 && !autoVault && !reloadSchedule) {
          await interaction.reply({ content: `Nothing to see here. Your vaults are empty, autovault's off, and no reloads scheduled. You're on your own, degen.`, ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x1E90FF)
          .setTitle('Your Alpha Audit Report. Don\'t Panic.')
          .setDescription(
            (vaults.length > 0 ? vaults.map((v: LockVaultRecord) => {
              const statusText = Date.now() >= v.unlockAt ? 'free' : 'still locked up';
              const amount = v.lockedAmountSOL === 0 ? 'ALL' : `${v.lockedAmountSOL.toFixed(4)} SOL`;
              return `• **${v.id}** – ${v.status} (${statusText}) – unlocks <t:${Math.floor(v.unlockAt / 1000)}:R> – ${amount}`;
            }).join('\n') : `No active vaults. (Are you even trying?)`) +
            (autoVault ? `\n\n**Auto-Vault:** ${autoVault.percentage}% of wins snatched from your greedy hands.` : '') +
            (reloadSchedule ? `\n**Reload:** ${reloadSchedule.amountRaw} every ${reloadSchedule.interval}. Keep that degeneracy fueled.` : '')
          );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (sub === 'autovault') {
        const embed = new EmbedBuilder()
          .setColor(0xFF4500)
          .setTitle('🔒 AUTO-VAULT: PROTOCOL UPGRADE')
          .setDescription('We are **100% NON-CUSTODIAL.** YOUR KEYS, YOUR PROBLEM.\n\nAutomating deposits means touching your keys. Legally, that requires lawyers we don\'t respect and licenses we refuse to pay for.\n\nWe\'re building a **V2 On-Chain Smart Contract** to do this natively without custodial risk.')
          .addFields({ name: 'Speed Up The Devs', value: 'Want this faster? Throw some caffeine at the dev fund:\n👉 **[Drop a Ko-fi ☕](https://ko-fi.com/tiltcheck)**' })
          .setFooter({ text: 'TiltCheck: ZERO MORALITY, ALL ALPHA.' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      } else if (sub === 'reload') {
        const embed = new EmbedBuilder()
          .setColor(0xFF4500)
          .setTitle('🔒 AUTOMATIC RELOADS: PROTOCOL UPGRADE')
          .setDescription('Same deal here, degen. Auto-sweeps require a custodial smart contract. We\'re coding it right now so we don\'t have to deal with the SEC.\n\nWait for V2.')
          .addFields({ name: 'Speed Up The Devs', value: 'Want to rush the smart contract audit?\n👉 **[Drop a Ko-fi ☕](https://ko-fi.com/tiltcheck)**' });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      } else {
        await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `Well, sh**. An unexpected f***-up occurred: ${(err as Error).message}. Blame the blockchain, or the admin. Or your bad luck.`, ephemeral: true });
    }
  },
};