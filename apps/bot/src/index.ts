/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/bot - Bot HTTP Service
 * 
 * Minimal HTTP service for bot-related operations:
 * - Health checks
 * - Internal webhooks/triggers
 * - Command syncing
 * 
 * Note: The actual Discord bot runs in /apps/discord-bot as a WebSocket connection.
 */

import express from 'express';
import { serviceAuth } from '@tiltcheck/auth/middleware/express';

const app = express();

app.use(express.json());

// ============================================================================
// Health Check Routes (Public)
// ============================================================================

/**
 * GET /health
 * Basic health check
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'bot-http',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/discord
 * Discord bot status (would communicate with discord-bot service)
 */
app.get('/health/discord', (_req, res) => {
  // In production, this would check the actual bot status
  res.json({
    status: 'ok',
    connected: true,
    guilds: 0, // Would be populated from actual bot
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Internal Routes (Service Auth Required)
// ============================================================================

/**
 * POST /internal/sync-commands
 * Trigger command sync with Discord
 */
app.post('/internal/sync-commands', serviceAuth(), (req, res) => {
  const service = (req as any).service;
  
  console.log(`[Bot] Command sync triggered by ${service?.id}`);
  
  // In production, this would trigger the discord-bot to sync commands
  res.json({
    success: true,
    message: 'Command sync triggered',
    triggeredBy: service?.id,
  });
});

/**
 * POST /internal/broadcast
 * Send a broadcast message to specified channels
 */
app.post('/internal/broadcast', serviceAuth(), (req, res) => {
  const { channelIds, message, embed } = req.body;
  const service = (req as any).service;
  
  if (!channelIds || !message) {
    res.status(400).json({ error: 'Missing channelIds or message' });
    return;
  }
  
  console.log(`[Bot] Broadcast triggered by ${service?.id} to ${channelIds.length} channels`);
  
  // In production, this would send to discord-bot to broadcast
  res.json({
    success: true,
    message: 'Broadcast queued',
    channels: channelIds.length,
  });
});

/**
 * POST /internal/notify-user
 * Send a DM to a Discord user
 */
app.post('/internal/notify-user', serviceAuth(), (req, res) => {
  const { discordId, message, embed } = req.body;
  const service = (req as any).service;
  
  if (!discordId || !message) {
    res.status(400).json({ error: 'Missing discordId or message' });
    return;
  }
  
  console.log(`[Bot] User notification triggered by ${service?.id} for ${discordId}`);
  
  // In production, this would send to discord-bot to DM the user
  res.json({
    success: true,
    message: 'Notification queued',
    discordId,
  });
});

// ============================================================================
// Webhook Routes (For Discord Interactions if needed)
// ============================================================================

/**
 * POST /webhook/interactions
 * Discord interactions webhook (if using HTTP-based interactions)
 */
app.post('/webhook/interactions', (req, res) => {
  const { type, data } = req.body;
  
  // Handle Discord interaction types
  switch (type) {
    case 1: // PING
      res.json({ type: 1 }); // PONG
      return;
    
    case 2: // APPLICATION_COMMAND
      // In production, this would route to command handlers
      res.json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: 'Command received',
        },
      });
      return;
    
    default:
      res.status(400).json({ error: 'Unknown interaction type' });
  }
});

// ============================================================================
// Server Start
// ============================================================================

const PORT = parseInt(process.env.PORT || '3003', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[Bot HTTP] Running on http://${HOST}:${PORT}`);
  console.log(`[Bot HTTP] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
