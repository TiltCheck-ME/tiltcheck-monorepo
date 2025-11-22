import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getOrReuseSession, encodeSessionTokenB64 } from '../session.js';
import { getCasinoMetrics, requestAddition, checkProvisionalAllowed, recordProvisional, incrementProvisionalSession } from '../collectclock.js';

export const playanalyze = {
  data: new SlashCommandBuilder()
    .setName('play-analyze')
    .setDescription('Start a real-time gameplay analysis session')
    .addStringOption(o => o
      .setName('casino')
      .setDescription('Casino ID (tracked by CollectClock)')
      .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const casinoRaw = interaction.options.getString('casino', true);
      const casino = casinoRaw.trim().toLowerCase();
      const userId = interaction.user.id;

      // Basic casino id format guard (lowercase, hyphen, numeric) to reduce noisy provisional requests
      if (!/^[a-z0-9][a-z0-9\-]{2,48}$/.test(casino)) {
        await interaction.reply({
          content: `⚠️ Invalid casino id format: '${casinoRaw}'. Use lowercase alphanumerics and hyphens (3-49 chars).`,
          ephemeral: true
        });
        return;
      }

      // CollectClock validation (Option B: allow provisional session if untracked)
      const metrics = getCasinoMetrics(casino);
      let provisional = false;
      if (!metrics) {
        provisional = true;
        // Enforce per-user daily provisional limit
        const allowance = checkProvisionalAllowed(userId);
        if (!allowance.ok) {
          await interaction.reply({
            content: `🚫 Daily provisional session limit reached (${process.env.COLLECT_CLOCK_PROVISIONAL_DAILY_LIMIT || '3'}). Try again tomorrow or wait for approval.`,
            ephemeral: true
          });
          return;
        }
        const addResult = requestAddition(casino, userId);
        if (!addResult.ok && addResult.rateLimited) {
          await interaction.reply({
            content: `⏱️ Rate limited. Retry in ${(addResult.retryInMs!/1000).toFixed(0)}s. Casino not yet tracked: ${casino}`,
            ephemeral: true
          });
          return;
        }
        const ownerId = process.env.COLLECT_CLOCK_OWNER_ID;
        if (ownerId && addResult.ok && !addResult.duplicate) {
          try {
            const ownerUser = await interaction.client.users.fetch(ownerId);
            await ownerUser.send(`➕ Provisional analyze request for '${casino}' (by ${interaction.user.tag}). Queued for CollectClock addition.`);
          } catch {}
        }
        // Record provisional usage
        recordProvisional(userId);
        incrementProvisionalSession(casino);
        // Recompute remaining after record
        const remainingAfter = checkProvisionalAllowed(userId).remaining;
        (interaction as any).provisionalRemaining = remainingAfter;
      }
      
      // Reuse existing active session if available to avoid re-login friction
      const { info: session, reused } = await getOrReuseSession(userId, casino);
      const token = encodeSessionTokenB64(session);
      const base = process.env.GAMEPLAY_ANALYZER_PUBLIC_ORIGIN || process.env.GAMEPLAY_ANALYZER_BASE_URL || 'https://tiltcheck.it.com';
      const usingDefaultBase = !process.env.GAMEPLAY_ANALYZER_PUBLIC_ORIGIN && !process.env.GAMEPLAY_ANALYZER_BASE_URL;
      const url = `${base.replace(/\/$/, '')}/analyze?session=${encodeURIComponent(token)}&casino=${encodeURIComponent(casino)}${provisional ? '&provisional=1' : ''}`;
      
      const remainingMsg = provisional ? `Remaining provisional sessions today: ${(interaction as any).provisionalRemaining}` : '';
      await interaction.reply({
        content: [
          reused ? '🔄 **Session Resumed**' : '✅ **Analysis Session Created**',
          '',
          `🎰 Casino: \`${casino}\`${provisional ? ' (provisional)' : ''}`,
          `🔗 Open analyzer: ${url}`,
          usingDefaultBase ? '⚠️ Analyzer origin not configured. Set `GAMEPLAY_ANALYZER_PUBLIC_ORIGIN` for a working link.' : '',
          provisional ? '⚠️ Not yet fully tracked. Gated metrics until approved.' : '',
          provisional ? remainingMsg : '',
          reused ? `♻️ Reused existing session (expires <t:${Math.floor(session.expires/1000)}:R>)` : '⏰ Session expires in 30 minutes',
          '',
          '🔐 Token format: base64 (backwards-compatible)'
        ].filter(Boolean).join('\n'),
        ephemeral: true
      });
    } catch (error) {
      console.error('[play-analyze] Error creating session:', error);
      
      let errorMessage = '❌ Failed to create analysis session.';
      if (error instanceof Error) {
        if (error.message.includes('SESSION_SIGNING_SECRET')) {
          errorMessage += '\n\n⚠️ Server configuration issue. Please contact an administrator.';
        } else {
          errorMessage += `\n\n${error.message}`;
        }
      }
      
      await interaction.reply({ 
        content: errorMessage, 
        ephemeral: true 
      });
    }
  }
};
