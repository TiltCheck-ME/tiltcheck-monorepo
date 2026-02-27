/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { collectclock } from '@tiltcheck/collectclock';
import type { Command } from '../types.js';

export const bonus: Command = {
  data: new SlashCommandBuilder()
    .setName('bonus')
    .setDescription('Track and manage your daily social casino bonuses')
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all available casino bonuses')
    )
    .addSubcommand(sub =>
      sub
        .setName('ready')
        .setDescription('Show bonuses that are ready to claim right now')
    )
    .addSubcommand(sub =>
      sub
        .setName('claim')
        .setDescription('Mark a bonus as claimed to start the timer')
        .addStringOption(opt =>
          opt
            .setName('casino')
            .setDescription('Name of the casino')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('timers')
        .setDescription('View all your active bonus timers')
    )
    .addSubcommand(sub =>
      sub
        .setName('notify')
        .setDescription('Manage your bonus notifications')
        .addStringOption(opt =>
          opt
            .setName('casino')
            .setDescription('Name of the casino')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addBooleanOption(opt =>
          opt
            .setName('enabled')
            .setDescription('Enable or disable notifications for this casino')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('View your bonus claim statistics')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'list':
        await handleList(interaction);
        break;
      case 'ready':
        await handleReady(interaction);
        break;
      case 'claim':
        await handleClaim(interaction);
        break;
      case 'timers':
        await handleTimers(interaction);
        break;
      case 'notify':
        await handleNotify(interaction);
        break;
      case 'stats':
        await handleStats(interaction);
        break;
      default:
        await interaction.reply({ content: '❌ Unknown subcommand', ephemeral: true });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();
    const casinos = collectclock.getCasinos();

    const filtered = casinos.filter(c => c.toLowerCase().includes(focusedValue.toLowerCase())).slice(0, 25);
    await interaction.respond(filtered.map(c => ({ name: c, value: c })));
  }
};

async function handleList(interaction: ChatInputCommandInteraction) {
  const casinos = collectclock.getCasinos();

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('🎰 Available Casino Bonuses')
    .setDescription('Use `/bonus claim <casino>` to start your timer!');

  // Limit to 25 fields (Discord limit)
  const displayCasinos = casinos.slice(0, 24);

  displayCasinos.forEach(c => {
    const state = collectclock.getCasinoState(c);
    embed.addFields({
      name: c,
      value: state ? `${state.currentAmount} SC / Daily` : 'Daily Bonus',
      inline: true
    });
  });

  if (casinos.length > 24) {
    embed.setFooter({ text: `...and ${casinos.length - 24} more! Type /bonus claim to see all options.` });
  } else {
    embed.setFooter({ text: 'Claim your daily bonuses to maximize your stack!' });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleReady(interaction: ChatInputCommandInteraction) {
  const ready = collectclock.getReadyTimers(interaction.user.id);

  if (ready.length === 0) {
    await interaction.reply({
      content: '⌛ No bonuses ready yet! Check back later or use `/bonus timers` to see when they reset.',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Bonuses Ready to Claim!')
    .setDescription('Go get \'em, tiger!')
    .addFields(
      ready.map(t => ({
        name: t.casinoName,
        value: t.categoryName ? `Category: ${t.categoryName}` : 'Daily Bonus',
        inline: true
      }))
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleNotify(interaction: ChatInputCommandInteraction) {
  const casino = interaction.options.getString('casino', true);
  const enabled = interaction.options.getBoolean('enabled', true);

  if (enabled) {
    collectclock.subscribeNotifications(interaction.user.id, casino, {
      notifyOnReady: true,
      notifyOnNerf: true,
      discordDM: true
    });
    await interaction.reply({
      content: `🔔 Notifications **enabled** for **${casino}**. We'll DM you when your bonus is ready!`,
      ephemeral: true
    });
  } else {
    collectclock.unsubscribeNotifications(interaction.user.id, casino);
    await interaction.reply({
      content: `🔕 Notifications **disabled** for **${casino}**.`,
      ephemeral: true
    });
  }
}

async function handleStats(interaction: ChatInputCommandInteraction) {
  const stats = collectclock.getUserBonusStats(interaction.user.id);

  if (stats.totalClaims === 0) {
    await interaction.reply({
      content: '📊 You haven\'t claimed any bonuses yet! Start claiming to see your stats.',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('📊 Your Bonus Statistics')
    .addFields(
      { name: 'Total Claims', value: `${stats.totalClaims}`, inline: true },
      { name: 'Total Value', value: `${stats.totalAmount.toFixed(2)} SC`, inline: true },
    );

  const topCasinos = Object.entries(stats.casinoBreakdown)
    .sort((a: [string, any], b: [string, any]) => b[1].claims - a[1].claims)
    .slice(0, 5);

  if (topCasinos.length > 0) {
    let breakdownText = '';
    topCasinos.forEach(([name, data]: [string, any]) => {
      breakdownText += `**${name}**: ${data.claims} claims (${data.amount.toFixed(2)} SC)\n`;
    });
    embed.addFields({ name: 'Top Casinos', value: breakdownText });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleClaim(interaction: ChatInputCommandInteraction) {
  const casino = interaction.options.getString('casino', true);

  try {
    const claim = collectclock.claimBonus(casino, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x00CED1)
      .setTitle('💰 Bonus Claimed!')
      .setDescription(`Timer started for **${casino}**.`)
      .addFields(
        { name: 'Claimed At', value: `<t:${Math.floor(claim.claimedAt / 1000)}:f>`, inline: true },
        { name: 'Next Eligible', value: `<t:${Math.floor(claim.nextEligibleAt / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: 'We\'ll remind you when it\'s ready if you have notifications on!' });

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.reply({
      content: `❌ Could not claim bonus: ${error.message}`,
      ephemeral: true
    });
  }
}

async function handleTimers(interaction: ChatInputCommandInteraction) {
  const timers = collectclock.getUserTimers(interaction.user.id);

  if (timers.length === 0) {
    await interaction.reply({
      content: '📊 You haven\'t claimed any bonuses yet! Use `/bonus claim` to start tracking.',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('⏲️ Your Bonus Timers')
    .setDescription('Here\'s when your next bonuses become available:');

  timers.forEach(t => {
    const status = t.isReady ? '✅ **Ready!**' : `⌛ <t:${Math.floor(t.nextEligibleAt / 1000)}:R>`;
    embed.addFields({
      name: t.casinoName,
      value: status,
      inline: true
    });
  });

  await interaction.reply({ embeds: [embed] });
}
