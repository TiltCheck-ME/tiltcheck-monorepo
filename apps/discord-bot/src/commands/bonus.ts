/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { collectclock } from '@tiltcheck/collectclock';
import type { Command } from '../types.js';

export const bonus: Command = {
  data: new SlashCommandBuilder()
    .setName('bonus')
    .setDescription('Track your bonus timers so you don't miss a single f***ing dollar.')
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
    .setTitle('🎰 Your Bonus Hitlist')
    .setDescription('Ready to hit those daily bonuses like a degenerate? Pick your poison, then use `/bonus claim <casino>` to kick off the timer. We track the rest, you stack the chips.')

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
    embed.setFooter({ text: `...and ${casinos.length - 24} more. Yeah, we're tracking ALL that sh**. Use /bonus claim for the full menu.` });
  } else {
    embed.setFooter({ text: 'Maximize your degenerate stack. Don\'t miss a single one.' });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleReady(interaction: ChatInputCommandInteraction) {
  const ready = collectclock.getReadyTimers(interaction.user.id);

  if (ready.length === 0) {
    await interaction.reply({ content: '⌛ Still waiting on those sweet, sweet reloads. Check back later, or hit `/bonus timers` to see when you can next get your fix.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Get Your F***ing Bonuses!')
    .setDescription('Stop scrolling. Start claiming. These bad boys are ready. Go. Now!')
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
      content: `🔔 Notifications **ENABLED** for **${casino}**. We'll hit you up when that sweet bonus is ripe for the picking. Don't worry, we won't tell your mom.`,
      ephemeral: true
    });
  } else {
    collectclock.unsubscribeNotifications(interaction.user.id, casino);
    await interaction.reply({
      content: `🔕 Notifications **DISABLED** for **${casino}**. You're on your own, degen. Hope you remember to claim!`,
      ephemeral: true
    });
  }
}

async function handleStats(interaction: ChatInputCommandInteraction) {
  const stats = collectclock.getUserBonusStats(interaction.user.id);

  if (stats.totalClaims === 0) {
    await interaction.reply({ content: '📊 What are you doing with your life? No claims yet? Get in there and start claiming some free money, then check your stats.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('📊 Your Degen Bonus Report')
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
      .setTitle('💰 BOOM! Bonus Secured!')
      .setDescription(`Timer started for **${casino}**. Don't f*** it up.`)
      .addFields(
        { name: 'Claimed At', value: `<t:${Math.floor(claim.claimedAt / 1000)}:f>`, inline: true },
        { name: 'Next Eligible', value: `<t:${Math.floor(claim.nextEligibleAt / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: 'We\'ll hit you up when it\'s ready again. Unless you turned off notifications, you degenerate.' });

    await interaction.reply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.reply({
      content: `❌ Well, sh**. Couldn't claim that bonus for **${casino}**: ${error.message}`,
      ephemeral: true
    });
  }
}

async function handleTimers(interaction: ChatInputCommandInteraction) {
  const timers = collectclock.getUserTimers(interaction.user.id);

  if (timers.length === 0) {
    await interaction.reply({ content: '📊 No active timers? Are you even trying? Use `/bonus claim` to get this party started.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('⏲️ Your Reload Countdown')
    .setDescription('Here\'s when you can next get your hands on some sweet, sweet bonus action:')

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
