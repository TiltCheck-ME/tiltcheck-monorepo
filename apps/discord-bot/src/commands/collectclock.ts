import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { getCasinoMetrics, listCasinos, requestAddition, approvePending, getPendingWithCounts } from '../collectclock.js';
import { getCasino, getEnabledCasinos, searchCasinos, formatCasinoInfo, getCasinoChoices } from '../casino-data.js';

function formatMetric(v: number | null, suffix = '') {
  return v === null || v === undefined ? 'n/a' : (suffix ? v.toFixed(2) + suffix : v.toFixed(2));
}

export const collectclock: Command = {
  data: new SlashCommandBuilder()
    .setName('collectclock')
    .setDescription('Query gameplay trust metrics for casinos')
    .addSubcommand(sc => sc
      .setName('status')
      .setDescription('Get trust status for a casino')
      .addStringOption(o => o.setName('casino').setDescription('Casino ID or name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sc => sc
      .setName('top')
      .setDescription('List top casinos by latest trust score')
      .addIntegerOption(o => o.setName('limit').setDescription('How many (default 10)').setMinValue(1).setMaxValue(50)))
    .addSubcommand(sc => sc
      .setName('pending')
      .setDescription('View pending add requests'))
    .addSubcommand(sc => sc
      .setName('request')
      .setDescription('Request tracking for a casino')
      .addStringOption(o => o.setName('casino').setDescription('Casino ID or name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sc => sc
      .setName('list')
      .setDescription('List available casinos')
      .addBooleanOption(o => o.setName('enabled_only').setDescription('Show only enabled casinos (default: true)')))
    .addSubcommand(sc => sc
      .setName('approve')
      .setDescription('Owner: approve a pending casino')
      .addStringOption(o => o.setName('casino').setDescription('Casino ID').setRequired(true).setAutocomplete(true))),

  async execute(interaction: ChatInputCommandInteraction) {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === 'casino') {
        const query = focusedOption.value as string;
        const casinos = query.length > 0 ? searchCasinos(query).slice(0, 25) : getEnabledCasinos().slice(0, 25);
        const choices = casinos.map(casino => ({
          name: `${casino.name} (${casino.id})`,
          value: casino.id
        }));
        await interaction.respond(choices);
      }
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const casinoId = interaction.options.getString('casino', true);
      
      // Find casino info from database
      const casinoInfo = getCasino(casinoId);
      const displayName = casinoInfo ? casinoInfo.name : casinoId;
      const actualId = casinoInfo ? casinoInfo.id : casinoId;
      
      const metrics = getCasinoMetrics(actualId);
      if (!metrics) {
        const req = requestAddition(actualId, interaction.user.id);
        if (!req.ok && req.rateLimited) {
          await interaction.reply({ content: `⏱️ Rate limited. Retry in ${(req.retryInMs!/1000).toFixed(0)}s`, ephemeral: true });
          return;
        }
        const ownerId = process.env.COLLECT_CLOCK_OWNER_ID;
        if (ownerId && req.ok && !req.duplicate) {
          try {
            const ownerUser = await interaction.client.users.fetch(ownerId);
            await ownerUser.send(`➕ CollectClock add request: ${actualId} (${displayName}) by ${interaction.user.tag}`);
          } catch {}
        }
        
        // Show casino info even if not tracked
        let responseContent = `⏱️ **${displayName}** not tracked yet.\n${req.duplicate ? 'Already pending.' : 'Queued for addition.'}`;
        
        if (casinoInfo) {
          responseContent += `\n\n${formatCasinoInfo(casinoInfo)}`;
        }
        
        await interaction.reply({
          content: responseContent,
          ephemeral: true
        });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`⏱️ CollectClock: ${displayName}`)
        .setColor(metrics.latestTrustScore !== null ? (metrics.latestTrustScore > 0.8 ? 0x00aa00 : metrics.latestTrustScore > 0.6 ? 0xffd700 : metrics.latestTrustScore > 0.4 ? 0xff8c00 : 0xff4500) : 0x555555)
        .addFields(
          { name: 'Latest Trust Score', value: formatMetric(metrics.latestTrustScore, ''), inline: true },
          { name: 'Avg Trust Score', value: formatMetric(metrics.avgTrustScore, ''), inline: true },
          { name: 'Updates', value: metrics.updateCount.toString(), inline: true },
          { name: 'Alerts', value: metrics.alerts.toString(), inline: true },
          { name: 'Critical Alerts', value: metrics.criticalAlerts.toString(), inline: true },
          { name: 'First Seen', value: `<t:${Math.floor(metrics.firstSeen/1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Gameplay-derived trust telemetry • Prototype' });
      
      // Add casino info if available
      if (casinoInfo) {
        let casinoDetails = `**Website:** [${casinoInfo.baseURL}](${casinoInfo.baseURL})`;
        if (casinoInfo.regulator) casinoDetails += `\n**Regulator:** ${casinoInfo.regulator}`;
        if (casinoInfo.platforms?.reddit) casinoDetails += `\n**Reddit:** ${casinoInfo.platforms.reddit}`;
        
        embed.addFields({
          name: '🏪 Casino Info',
          value: casinoDetails,
          inline: false
        });
      }
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'list') {
      const enabledOnly = interaction.options.getBoolean('enabled_only') ?? true;
      const casinos = enabledOnly ? getEnabledCasinos() : await import('../casino-data.js').then(m => m.loadCasinosDataSync());
      
      if (casinos.length === 0) {
        await interaction.reply({ 
          content: enabledOnly ? 'No enabled casinos found.' : 'No casinos configured.', 
          ephemeral: true 
        });
        return;
      }

      // Group casinos by chunks for better display
      const chunks = [];
      for (let i = 0; i < casinos.length; i += 10) {
        chunks.push(casinos.slice(i, i + 10));
      }

      const embed = new EmbedBuilder()
        .setTitle('🎰 Available Casinos')
        .setColor(0x00aa00)
        .setDescription(`Found ${casinos.length} ${enabledOnly ? 'enabled ' : ''}casinos`)
        .setFooter({ text: `Showing ${enabledOnly ? 'enabled casinos only' : 'all casinos'} • Use /collectclock status <casino> for details` });

      // Add fields for each chunk
      chunks.forEach((chunk, index) => {
        const casinoList = chunk.map(casino => {
          const status = casino.enabled ? '✅' : '❌';
          const metrics = getCasinoMetrics(casino.id);
          const trustScore = metrics?.latestTrustScore;
          const trustText = trustScore !== null ? ` (${trustScore.toFixed(2)})` : '';
          return `${status} **${casino.name}** \`${casino.id}\`${trustText}`;
        }).join('\n');
        
        embed.addFields({
          name: index === 0 ? 'Casinos' : '\u200b',
          value: casinoList,
          inline: false
        });
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'list') {
      const limit = interaction.options.getInteger('limit') || 10;
      const list = listCasinos(limit);
      if (list.length === 0) {
        await interaction.reply({ content: 'No casinos tracked yet.', ephemeral: true });
        return;
      }
      const lines = list.map((c,i) => `${i+1}. **${c.casinoId}** – ${formatMetric(c.latestTrustScore,'')} (avg ${formatMetric(c.avgTrustScore,'')}) alerts:${c.alerts}`);
      await interaction.reply({ content: `🏁 Top Casinos (limit ${limit})\n${lines.join('\n')}`, ephemeral: true });
      return;
    }

    if (sub === 'pending') {
      const pending = getPendingWithCounts();
      if (pending.length === 0) {
        await interaction.reply({ content: 'No pending add requests.', ephemeral: true });
        return;
      }
      const lines = pending.slice(0,25).map(r => `• ${r.casinoId} (requests x${r.requestCount}, provisional sessions ${r.provisionalSessions}) by <@${r.requestedBy}> <t:${Math.floor(r.ts/1000)}:R>`);
      await interaction.reply({ content: `🗂 Pending Casino Add Requests:\n${lines.join('\n')}`, ephemeral: true });
      return;
    }

    if (sub === 'request') {
      const casinoInput = interaction.options.getString('casino', true);
      
      // Find casino info from database
      const casinoInfo = getCasino(casinoInput);
      const actualId = casinoInfo ? casinoInfo.id : casinoInput;
      const displayName = casinoInfo ? casinoInfo.name : casinoInput;
      
      const metrics = getCasinoMetrics(actualId);
      if (metrics) {
        await interaction.reply({ 
          content: `Already tracked: **${displayName}** (\`${actualId}\`)`, 
          ephemeral: true 
        });
        return;
      }
      
      const req = requestAddition(actualId, interaction.user.id);
      if (!req.ok && req.rateLimited) {
        await interaction.reply({ 
          content: `Rate limited. Retry in ${(req.retryInMs!/1000).toFixed(0)}s`, 
          ephemeral: true 
        });
        return;
      }
      
      const ownerId = process.env.COLLECT_CLOCK_OWNER_ID;
      if (ownerId && req.ok && !req.duplicate) {
        try {
          const ownerUser = await interaction.client.users.fetch(ownerId);
          await ownerUser.send(`➕ CollectClock add request: ${actualId} (${displayName}) by ${interaction.user.tag}`);
        } catch {}
      }
      
      let responseContent = `Queued **${displayName}** (\`${actualId}\`). ${req.duplicate ? 'Already pending.' : 'Owner notified.'}`;
      
      // Show casino info if available
      if (casinoInfo) {
        responseContent += `\n\n${formatCasinoInfo(casinoInfo)}`;
      }
      
      await interaction.reply({ content: responseContent, ephemeral: true });
      return;
    }

    if (sub === 'approve') {
      const ownerId = process.env.COLLECT_CLOCK_OWNER_ID;
      if (!ownerId || ownerId !== interaction.user.id) {
        await interaction.reply({ content: 'Owner only.', ephemeral: true });
        return;
      }
      const casinoId = interaction.options.getString('casino', true);
      const result = approvePending(casinoId);
      if (!result.ok) {
        await interaction.reply({ content: `Not pending: ${casinoId}`, ephemeral: true });
        return;
      }
      await interaction.reply({ content: `Approved & tracking initialized for ${casinoId}`, ephemeral: true });
      // Post approval update to configured channel with starting metrics
      try {
        const channelId = process.env.COLLECT_CLOCK_APPROVAL_CHANNEL_ID || '1441513324792647794';
        const channel: any = await interaction.client.channels.fetch(channelId);
        const metrics = getCasinoMetrics(casinoId);
        const starting = metrics?.latestTrustScore ?? null;
        const rationale = metrics?.lastSnapshot?.grading ? 'Awaiting first grading snapshot.' : 'No gameplay graded yet.';
        if (channel && channel.isTextBased()) {
          await channel.send(`✅ Approved casino **${casinoId}**\nStarting Trust Score: ${starting === null ? 'n/a' : starting.toFixed(2)}\nCalculation: ${starting === null ? 'No spins graded; initialization baseline.' : 'Derived from composite fairness grading /100 -> normalized.'}\nRationale: ${rationale}`);
        }
      } catch (e) {
        console.error('[CollectClock] Failed to send approval notification:', (e as any).message);
      }
      return;
    }
  }
};
