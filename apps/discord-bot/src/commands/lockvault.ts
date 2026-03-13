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
    .setDescription('Lock up your degeneracy, manage your vaults, or set up autovault. Don't lose your sh**.') // MODIFIED
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('Stash your SOL away. Out of sight, out of mind. (Unless you're a degenerate with no self-control).') // MODIFIED
        .addStringOption(o => o.setName('amount').setDescription('How much SOL to lock away from your degenerate self? ("$100", "5 SOL", "all")').setRequired(true)) // MODIFIED
        .addStringOption(o => o.setName('duration').setDescription('How long until you can touch your precious again? (24h, 3d, 90m)').setRequired(true)) // MODIFIED
        .addStringOption(o => o.setName('reason').setDescription('Why are you doing this to yourself? (anti-tilt, savings, because you're an ape, etc.)')) // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Your sentence is served. Release the f***ing kraken (your SOL).') // MODIFIED
        .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('extend')
        .setDescription('Can't trust yourself? Add more time to your lock. You know you want to.') // MODIFIED
        .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
        .addStringOption(o => o.setName('additional').setDescription('Additional duration (e.g. 12h, 2d)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('See your locked bags, autovault config, and reload schedule. Hope it's good news.') // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('autovault')
        .setDescription('Automate your self-control. Set up your autovault to save your stupid ass.') // MODIFIED
        .addStringOption(o => o.setName('apikey').setDescription('Your casino API key. We ain't holding it, you ape.').setRequired(true)) // MODIFIED
        .addNumberOption(o => o.setName('percentage').setDescription('What percentage of wins to snatch from your greedy hands? (0-100)')) // MODIFIED
        .addNumberOption(o => o.setName('threshold').setDescription('Vault everything once your balance hits this amount. (Good luck with that).')) // MODIFIED
        .addStringOption(o => o.setName('currency').setDescription('Currency for threshold (SOL/USD)').addChoices({ name: 'SOL', value: 'SOL' }, { name: 'USD', value: 'USD' }))
        .addBooleanOption(o => o.setName('savefornft').setDescription('Auto-save for your Identity NFT. Because who wants to be a poor degen?')) // MODIFIED
    )
    .addSubcommand(sub =>
      sub
        .setName('reload')
        .setDescription('Never run dry. Schedule automatic reloads to keep the game going. Or to dig a deeper hole.') // MODIFIED
        .addStringOption(o => o.setName('amount').setDescription('How much to inject into your account? ("$50", "10 SOL")').setRequired(true)) // MODIFIED
        .addStringOption(o => o.setName('interval').setDescription('How often to get your fix? (daily, weekly, monthly)').setRequired(true)) // MODIFIED
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
          await interaction.reply({ content: `❌ That amount is as f***ed as your trading strategy: ${parsedAmount.error}`, ephemeral: true }); // MODIFIED
          return;
        }
        const parsedDuration = parseDuration(durationRaw);
        if (!parsedDuration.success || !parsedDuration.data) {
          await interaction.reply({ content: `❌ That duration is as f***ed as your attention span: ${parsedDuration.error}`, ephemeral: true }); // MODIFIED
          return;
        }
        const vault = await lockVault({ userId: interaction.user.id, amountRaw, durationRaw, reason });
        const embed = new EmbedBuilder()
          .setColor(0x8A2BE2)
          .setTitle('🔒 Vault Locked. You're Welcome.') // MODIFIED
          .setDescription(vault.vaultType === 'magic' ? 'Funds secured in your **Degen Identity** (Magic) wallet. Smart move.' : 'Funds moved to a disposable time-locked vault wallet. Don't even think about touching it.') // MODIFIED
          .addFields(
            { name: 'Vault ID', value: vault.id, inline: false },
            { name: 'That F***ing Vault Wallet', value: `
`${vault.vaultAddress}``, inline: false }, // MODIFIED
            { name: 'Unlocks', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>`, inline: true },
            { name: 'Amount (SOL, normalized)', value: vault.lockedAmountSOL === 0 ? 'ALL (snapshot, you madman)' : `${vault.lockedAmountSOL.toFixed(4)} SOL`, inline: true }, // MODIFIED
          )
          .setFooter({ text: reason ? `Reason: ${reason}` : 'You'll thank us later. Use `/vault status` to check your prison sentence.' }); // MODIFIED
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (sub === 'unlock') {
        const id = interaction.options.getString('id', true);
        try {
          const vault = unlockVault(interaction.user.id, id);
          const embed = new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle('✅ Freedom! Vault Unlocked.') // MODIFIED
            .addFields(
              { name: 'Vault ID', value: vault.id },
              { name: 'Released (SOL) - Go wild. Or don't.', value: `${vault.lockedAmountSOL === 0 ? 'ALL' : `${vault.lockedAmountSOL.toFixed(4)} SOL`}` }, // MODIFIED
            );

          if (vault.vaultSecret) {
            embed.addFields({ 
              name: '🔑 Your Precious Private Key (Don't F***ing Lose It)', // MODIFIED
              value: `||${vault.vaultSecret}||`, 
              inline: false 
            });
            embed.setFooter({ text: 'Keep this secret, degen! Use it to sweep your funds. If you lose it, you're f***ed.' }); // MODIFIED
          }
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `❌ Well, sh**. Couldn't free your funds: ${(err as Error).message}`, ephemeral: true }); // MODIFIED
        }
      } else if (sub === 'extend') {
        const id = interaction.options.getString('id', true);
        const additional = interaction.options.getString('additional', true);
        try {
          const vault = extendVault(interaction.user.id, id, additional);
          const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('⏫ Vault Extended. More Time in the Slammer.') // MODIFIED
            .addFields(
              { name: 'Vault ID', value: vault.id },
              { name: 'New Release Date', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>` }, // MODIFIED
              { name: 'Extended Prison Sentences', value: `${vault.extendedCount}` }, // MODIFIED
            );
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `❌ Well, sh**. Couldn't extend your sentence: ${(err as Error).message}`, ephemeral: true }); // MODIFIED
        }
      } else if (sub === 'status') {
        const vaults = getVaultStatus(interaction.user.id);
        const autoVault = getAutoVault(interaction.user.id);
        const reloadSchedule = getReloadSchedule(interaction.user.id);

        if (vaults.length === 0 && !autoVault && !reloadSchedule) {
          await interaction.reply({ content: 'ℹ️ Nothing to see here. Your vaults are empty, autovault's off, and no reloads scheduled. You're on your own, degen.', ephemeral: true }); // MODIFIED
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x1E90FF)
          .setTitle('📊 Your Vault Report. Don't Panic.') // MODIFIED
          .setDescription(
            (vaults.length > 0 ? vaults.map((v: LockVaultRecord) => {
              const statusText = Date.now() >= v.unlockAt ? 'free' : 'still locked up'; // MODIFIED
              const amount = v.lockedAmountSOL === 0 ? 'ALL' : `${v.lockedAmountSOL.toFixed(4)} SOL`;
              return `• **${v.id}** – ${v.status} (${statusText}) – unlocks <t:${Math.floor(v.unlockAt/1000)}:R> – ${amount}`;
            }).join('
') : 'No active vaults. (Are you even trying?)') + // MODIFIED
            (autoVault ? `

**Auto-Vault:** ${autoVault.percentage}% of wins snatched from your greedy hands.` : '') + // MODIFIED
            (reloadSchedule ? `
**Reload:** ${reloadSchedule.amountRaw} every ${reloadSchedule.interval}. Keep that degeneracy fueled.` : '') // MODIFIED
          );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (sub === 'autovault') {
        const percentage = interaction.options.getNumber('percentage') || undefined;
        const threshold = interaction.options.getNumber('threshold') || undefined;
        const currency = (interaction.options.getString('currency') as 'SOL' | 'USD') || 'SOL';
        const saveForNft = interaction.options.getBoolean('savefornft') || false;
        const apikey = interaction.options.getString('apikey', true);

        if (percentage === undefined && threshold === undefined) {
          await interaction.reply({ content: '❌ You gotta tell me how to save your ass. Percentage OR threshold, degen.', ephemeral: true }); // MODIFIED
          return;
        }
        if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
          await interaction.reply({ content: '❌ Percentage of snatched wins must be between 0 and 100. Don't be an idiot.', ephemeral: true }); // MODIFIED
          return;
        }

        setAutoVault(interaction.user.id, { percentage, threshold, currency, saveForNft, apiKey: apikey });
        const embed = new EmbedBuilder()
          .setColor(0x00FFFF)
          .setTitle('⚙️ Auto-Vault Activated. Prepare for Self-Control.') // MODIFIED
          .setDescription(`Auto-vault active: ${percentage ? percentage + '% of your f***ing wins' : ''} ${threshold ? 'Everything over ' + threshold + ' ' + currency : ''} ${saveForNft ? '
🎯 **Target:** Saving for that sweet Identity NFT. Smart move.' : ''}`); // MODIFIED
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (sub === 'reload') {
        const amount = interaction.options.getString('amount', true);
        const interval = (interaction.options.getString('interval', true) as 'daily' | 'weekly' | 'monthly');
        if (!['daily', 'weekly', 'monthly'].includes(interval)) {
          await interaction.reply({ content: '❌ Reload interval is as f***ed as your bankroll. Must be "daily", "weekly", or "monthly".', ephemeral: true }); // MODIFIED
          return;
        }
        setReloadSchedule(interaction.user.id, amount, interval);
        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('📅 Reload Scheduled. Never Go Broke Again. (Maybe.)') // MODIFIED
          .setDescription(`Scheduled ${amount} reload every ${interval}. Keep that degeneracy fueled, degen.`); // MODIFIED
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `❌ Well, sh**. An unexpected f***-up occurred: ${(err as Error).message}. Blame the blockchain, or the admin. Or your bad luck.`, ephemeral: true }); // MODIFIED
    }
  },
};
