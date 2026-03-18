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
    .setName('vault')
    .setDescription('A time-locked safe for your SOL. Protect your funds from yourself.')
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription(`Stash your SOL before you do something stupid with it.`)
        .addStringOption(o => o.setName('amount').setDescription('How much SOL to lock away? ("$100", "5 SOL", "all")').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('How long to keep it locked? (e.g., 24h, 3d, 90m)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Why are you doing this to yourself? (optional)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Your sentence is served. Time to reclaim your assets.')
        .addStringOption(o => o.setName('id').setDescription('Which Vault ID are you liberating?').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('extend')
        .setDescription(`Don't trust yourself yet? Add more time to your lock.`)
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
        .setDescription('Let the bot be the responsible one. Set rules to save your winnings from yourself.')
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
        const amountRaw = interaction.options.getString('amount', true);
        const durationRaw = interaction.options.getString('duration', true);
        const reason = interaction.options.getString('reason') || undefined;
        const parsedAmount = parseAmount(amountRaw);
        if (!parsedAmount.success || !parsedAmount.data) {
          await interaction.reply({ content: 'Is that even a number? Try again with an actual amount, like "$100" or "5 SOL".', ephemeral: true });
          return;
        }
        const parsedDuration = parseDuration(durationRaw);
        if (!parsedDuration.success || !parsedDuration.data) {
          await interaction.reply({ content: `That duration doesn't look right. Try something like "1d", "8h", or "90m".`, ephemeral: true });
          return;
        }
        const vault = await lockVault({ userId: interaction.user.id, amountRaw, durationRaw, reason });
        const embed = new EmbedBuilder()
          .setColor(0x8A2BE2)
          .setTitle(`Vault Locked. You're Welcome.`)
          .setDescription(vault.vaultType === 'magic' ? `Funds secured in your **Degen Identity** (Magic) wallet. Smart move.` : `Funds moved to a disposable time-locked vault wallet. Don't even think about touching it.`)
          .addFields(
            { name: 'Vault ID', value: vault.id, inline: false },
            { name: 'That F***ing Vault Wallet', value: `\`${vault.vaultAddress}\``, inline: false },
            { name: 'Unlocks', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>`, inline: true },
            { name: 'Amount (SOL, normalized)', value: vault.lockedAmountSOL === 0 ? 'ALL (snapshot, you madman)' : `${vault.lockedAmountSOL.toFixed(4)} SOL`, inline: true },
          )
          .setFooter({ text: reason ? `Reason: ${reason}` : `You'll thank us later. Use /vault status to check your prison sentence.` });
        await interaction.reply({ embeds: [embed], ephemeral: true });
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
          .setTitle(`Your Vault Report. Don't Panic.`)
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
        const percentage = interaction.options.getNumber('percentage') || undefined;
        const threshold = interaction.options.getNumber('threshold') || undefined;
        const currency = (interaction.options.getString('currency') as 'SOL' | 'USD') || 'SOL';
        const saveForNft = interaction.options.getBoolean('savefornft') || false;
        const apikey = interaction.options.getString('apikey', true);

        if (percentage === undefined && threshold === undefined) {
          await interaction.reply({ content: 'You have to give me a rule to follow. Set a percentage or a threshold.', ephemeral: true });
          return;
        }
        if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
          await interaction.reply({ content: 'Percentage has to be between 0 and 100. I know math is hard, but try to keep it in that range.', ephemeral: true });
          return;
        }

        setAutoVault(interaction.user.id, { percentage, threshold, currency, saveForNft, apiKey: apikey });
        const embed = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setTitle('Auto-Vault Activated. Prepare for Self-Control.')
            .setDescription(`Auto-vault active: ${percentage ? percentage + '% of your wins are now safe from you.' : ''} ${threshold ? `Everything over ${threshold} ${currency} will be stashed.` : ''} ${saveForNft ? 'Saving for that sweet Identity NFT. Smart move.' : ''}`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (sub === 'reload') {
        const amount = interaction.options.getString('amount', true);
        const interval = (interaction.options.getString('interval', true) as 'daily' | 'weekly' | 'monthly');
        if (!['daily', 'weekly', 'monthly'].includes(interval)) {
          await interaction.reply({ content: `That's not a real interval. Use "daily", "weekly", or "monthly".`, ephemeral: true });
          return;
        }
        setReloadSchedule(interaction.user.id, amount, interval);
        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('Reload Scheduled. Never Go Broke Again. (Maybe.)')
          .setDescription(`Scheduled ${amount} reload every ${interval}. Keep that degeneracy fueled, degen.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `Well, sh**. An unexpected f***-up occurred: ${(err as Error).message}. Blame the blockchain, or the admin. Or your bad luck.`, ephemeral: true });
    }
  },
};