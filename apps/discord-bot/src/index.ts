// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
/**
 * TiltCheck Discord Bot
 * Main entry point for the safety and moderation bot.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import http from 'http';
import fs from 'fs';
import { config, validateConfig } from './config.js';
import {
  CommandHandler,
  EventHandler,
  registerDMHandler,
  initializeTiltEventsHandler,
  initializeAccountabilityPings,
} from './handlers/index.js';
import { initializeAlertService } from './services/alert-service.js';
import { BonusFeedHandler } from './handlers/bonus-feed-handler.js';
import { TrustAlertsHandler } from './handlers/trust-alerts-handler.js';
import { ensureTelemetryIndex } from './services/elastic-telemetry.js';
import { ensureTiltAgentContextIndex } from './services/tilt-agent-context-store.js';
import { startTiltAgentLoop, stopTiltAgentLoop } from './services/tilt-agent.js';
import { startRegulationsNotifier, stopRegulationsNotifier } from './services/regulations-notifier.js';
import { handleSafetyIntervention } from './services/intervention-service.js';
import { initializeBetaReviewQueue, syncBetaReviewQueue } from './services/beta-review-queue.js';

import { startTrustAdapter } from '@tiltcheck/discord-utils/trust-adapter';

import { getUserBuddies, type BetaSignupStatus } from '@tiltcheck/db';

async function main() {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('TILTCHECK — SESSION AUDIT AND ACCOUNTABILITY BOT');
  console.log('='.repeat(60));
  console.log(`SESSION INITIALIZED at: ${new Date().toLocaleString()}`);
  console.log(`ENV: ${process.env.NODE_ENV || 'production'}`);
  console.log('='.repeat(60) + '\n');

  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    console.log('[Config] SKIP_DISCORD_LOGIN enabled - skipping Discord auth');
  } else {
    console.log('[Config] Validating configuration...');
    validateConfig();
    console.log('[Config] Configuration validated\n');
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  console.log('[Handlers] Initializing handlers...');
  const commandHandler = new CommandHandler();
  const eventHandler = new EventHandler(client, commandHandler);
  console.log('[Handlers] Handlers initialized\n');

  console.log('[Alerts] Initializing alert service...');
  initializeAlertService(client);
  console.log('[Alerts] Alert service ready\n');

  console.log('[BetaQueue] Initializing beta review queue...');
  initializeBetaReviewQueue(client);
  console.log('[BetaQueue] Beta review queue ready\n');

  console.log('[Trust] Initializing trust alerts...');
  TrustAlertsHandler.initialize();
  console.log('[Trust] Trust alerts subscribed\n');

  console.log('[BonusFeed] Initializing bonus feed...');
  BonusFeedHandler.initialize();
  console.log('[BonusFeed] Bonus feed subscribed\n');

  console.log('[Tilt] Initializing tilt events handler...');
  initializeTiltEventsHandler();
  console.log('[Tilt] Tilt events handler ready\n');

  console.log('[Accountability] Initializing accountability ping system...');
  initializeAccountabilityPings(client);
  console.log('[Accountability] Accountability pings active\n');

  console.log('[Elastic] Ensuring telemetry index...');
  await ensureTelemetryIndex();
  console.log('[Elastic] Telemetry index ready\n');

  console.log('[Elastic] Ensuring tilt-agent context index...');
  await ensureTiltAgentContextIndex();
  console.log('[Elastic] Tilt-agent context index ready\n');

  console.log('[TiltAgent] Starting background scan loop...');
  startTiltAgentLoop(async (userId, message, severity) => {
    try {
      const user = await client.users.fetch(userId);
      const prefix = severity === 'high' ? '[HIGH RISK]' : severity === 'medium' ? '[AUDIT ALERT]' : '[EDGE EQUALIZER]';
      
      // Notify the User
      await user.send(`${prefix} TILTCHECK EDGE EQUALIZER AUDIT\n\n${message}\n\nDo not get rinsed. Secure the profit.\nView Dashboard: https://dashboard.tiltcheck.me/dashboard`);
      console.log(`[TiltAgent] Transparency signal sent to ${userId} (${severity})`);


      // Notify Buddies (Accountability)
      if (severity === 'high' || severity === 'medium') {
          const buddies = await getUserBuddies(userId);
          if (buddies && buddies.length > 0) {
              const buddyMsg = [
                `[BUDDY ALERT]: <@${userId}> is showing **${severity.toUpperCase()}** signs of tilt.`,
                '',
                'Support only. Tell them to pause, cash out, drink water, or jump in voice.',
                'Do not ask for money, tips, transfers, wallet screenshots, or bankroll details.',
              ].join('\n');
              
              for (const buddyRel of buddies) {
                  try {
                      const buddy = await client.users.fetch(buddyRel.buddy_id);
                      await buddy.send(buddyMsg);
                      console.log(`[Buddy] Alert sent to ${buddyRel.buddy_id} for user ${userId}`);
                  } catch (e) {
                      console.warn(`[Buddy] Failed to alert ${buddyRel.buddy_id}:`, e);
                  }
              }
          }
      }
    } catch (err) {
      console.error(`[TiltAgent] Failed to process intervention for ${userId}:`, err);
    }
  });
  console.log('[TiltAgent] Scan loop active\n');
  if (process.env.ELASTIC_URL && process.env.ELASTIC_API_KEY) {
    const regsChannelId = process.env.REGULATIONS_ALERTS_CHANNEL_ID || '';
    const regsGuildId = process.env.REGULATIONS_ALERTS_GUILD_ID || '';

    startRegulationsNotifier(client, {
      elasticUrl: process.env.ELASTIC_URL,
      elasticApiKey: process.env.ELASTIC_API_KEY,
      channelId: regsChannelId,
      guildId: regsGuildId,
      intervalMs: Number(process.env.REGULATIONS_NOTIFIER_INTERVAL_MS || 6 * 60 * 60 * 1000),
      maxRowsInMessage: Number(process.env.REGULATIONS_NOTIFIER_MAX_ROWS || 15),
    });
  } else {
    console.log('[Regulations] Skipping notifier (Elastic not configured)');
  }

  console.log('[DM] Registering direct message handler...');
  registerDMHandler(client);
  console.log('[DM] DM handler ready\n');

  console.log('[Adapter] Starting trust adapter...');
  startTrustAdapter({
    onFormatted: (formatted: string) => {
      console.log('[TrustAdapter]', formatted);
    },
  });
  console.log('[Adapter] Trust adapter ready\n');

  console.log('[Commands] Loading slash commands...');
  commandHandler.loadCommands();
  console.log('');

  // Auto-register slash commands with Discord on every startup
  if (config.clientId && config.discordToken && process.env.SKIP_DISCORD_LOGIN !== 'true') {
    const { REST, Routes } = await import('discord.js');
    const rest = new REST().setToken(config.discordToken);
    const commandData = commandHandler.getCommandData();
    try {
      if (config.guildId) {
        // Guild deploy — also clear global to prevent duplicates showing in Discord
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commandData });
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
        console.log(`[Commands] ${commandData.length} guild commands registered, global commands cleared\n`);
      } else {
        // Global deploy — clear any stale guild commands if guildId was previously set
        await rest.put(Routes.applicationCommands(config.clientId), { body: commandData });
        console.log(`[Commands] ${commandData.length} global slash commands registered\n`);
      }
    } catch (err) {
      console.error('[Commands] Failed to register slash commands:', err);
    }
  }

  console.log('[Events] Registering Discord events...');
  eventHandler.registerDiscordEvents();
  console.log('[Events] Discord events registered');

  console.log('[Events] Registering payment events...');
  eventHandler.registerPaymentEvents();
  console.log('[Events] Payment events registered');

  console.log('[Events] Subscribing to EventRouter...');
  eventHandler.subscribeToEvents();
  console.log('[Events] EventRouter subscriptions active\n');

  console.log('[Discord] Connecting to Discord...');
  let ready = false;
  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    console.log('[Discord] CI mode - skipping Discord login');
    ready = true;
    try {
      fs.writeFileSync('/tmp/bot-ready', 'ready');
      console.log('[Health] Ready marker written');
    } catch (e) {
      console.error('[Health] Failed to write ready marker:', e);
    }
  } else {
    await client.login(config.discordToken);
    client.once('ready', () => {
      ready = true;
      console.log('[Discord] Connected and ready!');
      try {
        fs.writeFileSync('/tmp/bot-ready', 'ready');
        console.log('[Health] Ready marker written');
      } catch (e) {
        console.error('[Health] Failed to write ready marker:', e);
      }
    });
  }
  console.log('');

  const HEALTH_PORT = process.env.PORT || '8080';
  const PORT = parseInt(HEALTH_PORT, 10);

  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const body = JSON.stringify({
        service: 'tiltcheck',
        ready,
        uptime: Math.round((Date.now() - startTime) / 1000),
        commands: commandHandler.getAllCommands().length
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }
    if (req.method === 'POST' && req.url === '/internal/interventions') {
      void handleInternalIntervention(req, res);
      return;
    }
    if (req.method === 'POST' && req.url === '/internal/beta-signups') {
      void handleInternalBetaSignupSync(req, res);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  healthServer.listen(PORT, () => {
    console.log(`[Health] Bot health check listening on port ${PORT}`);
    console.log('[Bot] Ready');
  });

  healthServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    }
    throw err;
  });

  const shutdown= async () => {
    console.log('\n[Bot] Shutting down gracefully...');

    stopTiltAgentLoop();
    stopRegulationsNotifier();

    if (healthServer.listening) {
      healthServer.close();
    }

    if (client.isReady()) {
      console.log('[Bot] Destroying Discord client...');
      await client.destroy();
    }

    console.log('[Bot] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  async function handleInternalIntervention(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const serviceSecret = process.env.INTERNAL_API_SECRET;
    if (!serviceSecret || serviceSecret.trim() === '') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_API_SECRET is not configured' }));
      return;
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${serviceSecret}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized internal request' }));
      return;
    }

    try {
      const payload = await readJsonBody(req);
      const intervention = payload as {
        userId?: unknown;
        riskScore?: unknown;
        interventionLevel?: unknown;
        action?: unknown;
        displayText?: unknown;
        metadata?: unknown;
      };

      if (
        typeof intervention.userId !== 'string'
        || typeof intervention.riskScore !== 'number'
        || typeof intervention.interventionLevel !== 'string'
        || typeof intervention.action !== 'string'
        || typeof intervention.displayText !== 'string'
      ) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid intervention payload' }));
        return;
      }

      const delivery = await handleSafetyIntervention(client, {
        userId: intervention.userId,
        riskScore: intervention.riskScore,
        interventionLevel: intervention.interventionLevel as 'CAUTION' | 'WARNING' | 'CRITICAL',
        action: intervention.action as 'OVERLAY_MESSAGE' | 'COOLDOWN_LOCK' | 'SELF_EXCLUDE_PROMPT' | 'PHONE_FRIEND' | 'PROFITS_VAULTED',
        displayText: intervention.displayText,
        metadata: typeof intervention.metadata === 'object' && intervention.metadata ? intervention.metadata as Record<string, unknown> : undefined,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, delivery }));
    } catch (error) {
      console.error('[Bot] Failed to handle internal intervention request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to handle intervention' }));
    }
  }

  async function handleInternalBetaSignupSync(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const serviceSecret = process.env.INTERNAL_API_SECRET;
    if (!serviceSecret || serviceSecret.trim() === '') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_API_SECRET is not configured' }));
      return;
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${serviceSecret}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized internal request' }));
      return;
    }

    try {
      const payload = await readJsonBody(req);
      const body = payload as {
        signupId?: unknown;
        eventType?: unknown;
        previousStatus?: unknown;
      };

      if (typeof body.signupId !== 'string' || body.signupId.trim() === '') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid beta signup payload' }));
        return;
      }

      const previousStatus = typeof body.previousStatus === 'string'
        && ['pending', 'approved', 'rejected', 'waitlisted'].includes(body.previousStatus)
        ? body.previousStatus as BetaSignupStatus
        : undefined;

      const syncResult = await syncBetaReviewQueue({
        signupId: body.signupId,
        eventType: body.eventType === 'reviewed' ? 'reviewed' : 'submitted',
        previousStatus,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...syncResult }));
    } catch (error) {
      console.error('[Bot] Failed to sync beta review queue:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to sync beta review queue' }));
    }
  }
}

process.on('unhandledRejection', (error) => {
  console.error('[Bot] Unhandled rejection:', error);
});

main().catch((error) => {
  console.error('[Bot] Fatal error:', error);
  process.exit(1);
});

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}



