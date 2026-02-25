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
    .setDescription('Lock / manage time-locked vaults')
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('Create a time-locked vault')
        .addStringOption(o => o.setName('amount').setDescription('Amount (e.g. "$100", "5 SOL", "all")').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('Lock duration (e.g. 24h, 3d, 90m)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Optional reason (anti-tilt, savings, etc.)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Unlock a vault (after expiry)')
        .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('extend')
        .setDescription('Extend a locked vault duration')
        .addStringOption(o => o.setName('id').setDescription('Vault ID').setRequired(true))
        .addStringOption(o => o.setName('additional').setDescription('Additional duration (e.g. 12h, 2d)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('View your vaults')
    )
    .addSubcommand(sub =>
      sub
        .setName('autovault')
        .setDescription('Set auto-vault configuration')
        .addStringOption(o => o.setName('apikey').setDescription('API key for casino integration').setRequired(true))
        .addNumberOption(o => o.setName('percentage').setDescription('Percentage of wins to auto-vault (0-100)'))
        .addNumberOption(o => o.setName('threshold').setDescription('Vault everything over this balance amount'))
        .addStringOption(o => o.setName('currency').setDescription('Currency for threshold (SOL/USD)').addChoices({ name: 'SOL', value: 'SOL' }, { name: 'USD', value: 'USD' }))
        .addBooleanOption(o => o.setName('savefornft').setDescription('Automatically save vaulted funds for your Identity NFT fee'))
    )
    .addSubcommand(sub =>
      sub
        .setName('reload')
        .setDescription('Set reload schedule')
        .addStringOption(o => o.setName('amount').setDescription('Amount to reload (e.g. "$50", "10 SOL")').setRequired(true))
        .addStringOption(o => o.setName('interval').setDescription('Reload interval (daily, weekly, monthly)').setRequired(true))
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
          await interaction.reply({ content: `❌ ${parsedAmount.error}`, ephemeral: true });
          return;
        }
        const parsedDuration = parseDuration(durationRaw);
        if (!parsedDuration.success || !parsedDuration.data) {
          await interaction.reply({ content: `❌ ${parsedDuration.error}`, ephemeral: true });
          return;
        }
        const vault = await lockVault({ userId: interaction.user.id, amountRaw, durationRaw, reason });
        const embed = new EmbedBuilder()
          .setColor(0x8A2BE2)
          .setTitle('🔒 Vault Locked')
          .setDescription(vault.vaultType === 'magic' ? 'Funds secured in your Degen Identity (Magic) wallet' : 'Funds moved to disposable time-locked vault wallet')
          .addFields(
            { name: 'Vault ID', value: vault.id, inline: false },
            { name: 'Vault Wallet', value: `
\`${vault.vaultAddress}\``, inline: false },
            { name: 'Unlocks', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>`, inline: true },
            { name: 'Amount (SOL eq)', value: vault.lockedAmountSOL === 0 ? 'ALL (snapshot)' : vault.lockedAmountSOL.toFixed(4), inline: true },
          )
          .setFooter({ text: reason ? `Reason: ${reason}` : 'Use /vault status to view all vaults' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (sub === 'unlock') {
        const id = interaction.options.getString('id', true);
        try {
          const vault = unlockVault(interaction.user.id, id);
          const embed = new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle('✅ Vault Unlocked')
            .addFields(
              { name: 'Vault ID', value: vault.id },
              { name: 'Released', value: `${vault.lockedAmountSOL === 0 ? 'ALL' : vault.lockedAmountSOL.toFixed(4)} SOL eq` },
            );
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `❌ ${(err as Error).message}`, ephemeral: true });
        }
      } else if (sub === 'extend') {
        const id = interaction.options.getString('id', true);
        const additional = interaction.options.getString('additional', true);
        try {
          const vault = extendVault(interaction.user.id, id, additional);
          const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('⏫ Vault Extended')
            .addFields(
              { name: 'Vault ID', value: vault.id },
              { name: 'New Unlock', value: `<t:${Math.floor(vault.unlockAt/1000)}:R>` },
              { name: 'Extensions', value: `${vault.extendedCount}` },
            );
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
          await interaction.reply({ content: `❌ ${(err as Error).message}`, ephemeral: true });
        }
      } else if (sub === 'status') {
        const vaults = getVaultStatus(interaction.user.id);
        const autoVault = getAutoVault(interaction.user.id);
        const reloadSchedule = getReloadSchedule(interaction.user.id);

        if (vaults.length === 0 && !autoVault && !reloadSchedule) {
          await interaction.reply({ content: 'ℹ️ No active vaults, auto-vault, or reload schedule.', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x1E90FF)
          .setTitle('📊 Your Vaults')
          .setDescription(
            (vaults.length > 0 ? vaults.map((v: LockVaultRecord) => `• **${v.id}** – ${v.status} – unlocks <t:${Math.floor(v.unlockAt/1000)}:R> – ${v.lockedAmountSOL===0? 'ALL' : v.lockedAmountSOL.toFixed(4)+' SOL'}`).join('\n') : 'No active vaults.') +
            (autoVault ? `\n\n**Auto-Vault:** ${autoVault.percentage}% active` : '') +
            (reloadSchedule ? `\n**Reload:** ${reloadSchedule.amountRaw} ${reloadSchedule.interval}` : '')
          );
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (sub === 'autovault') {
        const percentage = interaction.options.getNumber('percentage') || undefined;
        const threshold = interaction.options.getNumber('threshold') || undefined;
        const currency = (interaction.options.getString('currency') as 'SOL' | 'USD') || 'SOL';
        const saveForNft = interaction.options.getBoolean('savefornft') || false;
        const apikey = interaction.options.getString('apikey', true);

        if (percentage === undefined && threshold === undefined) {
          await interaction.reply({ content: '❌ Must specify either percentage or threshold.', ephemeral: true });
          return;
        }
        if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
          await interaction.reply({ content: '❌ Percentage must be between 0 and 100.', ephemeral: true });
          return;
        }

        setAutoVault(interaction.user.id, { percentage, threshold, currency, saveForNft, apiKey: apikey });
        const embed = new EmbedBuilder()
          .setColor(0x00FFFF)
          .setTitle('⚙️ Auto-Vault Configured')
          .setDescription(`Auto-vault active: ${percentage ? percentage + '% of wins' : ''} ${threshold ? 'Everything over ' + threshold + ' ' + currency : ''} ${saveForNft ? '\n🎯 **Target:** Saving for Identity NFT' : ''}`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (sub === 'reload') {
        const amount = interaction.options.getString('amount', true);
        const interval = interaction.options.getString('interval', true) as any;
        if (!['daily', 'weekly', 'monthly'].includes(interval)) {
          await interaction.reply({ content: '❌ Interval must be "daily", "weekly", or "monthly".', ephemeral: true });
          return;
        }
        setReloadSchedule(interaction.user.id, amount, interval);
        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('📅 Reload Scheduled')
          .setDescription(`Scheduled ${amount} reload every ${interval}.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `❌ Unexpected error: ${(err as Error).message}`, ephemeral: true });
    }
  },
};
