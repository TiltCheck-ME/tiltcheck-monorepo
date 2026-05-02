// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
/**
 * Trivia Notifier — listens for trivia.notification events from Director's Booth
 * and broadcasts to configured Discord channels + DMs to opted-in users.
 */

import type { Client, TextChannel } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';

const TRIVIA_ANNOUNCE_CHANNEL_IDS = (process.env.TRIVIA_ANNOUNCE_CHANNEL_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

let initialized = false;

export function initializeTriviaNotifier(client: Client): void {
  if (initialized) return;
  initialized = true;

  eventRouter.subscribe(
    'trivia.notification' as any,
    async (event: any) => {
      const { message, type, channels } = event.data as {
        message: string;
        type: 'impromptu' | 'scheduled';
        channels?: string[];
      };

      const targetChannels = [
        ...TRIVIA_ANNOUNCE_CHANNEL_IDS,
        ...(channels || []),
      ].filter((id, i, arr) => id && arr.indexOf(id) === i);

      if (targetChannels.length === 0) {
        console.warn('[TriviaNotifier] No target channels configured');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(type === 'impromptu' ? 0xd946ef : 0x17c3b2)
        .setTitle(type === 'impromptu' ? '[LIVE TRIVIA — NOW]' : '[LIVE TRIVIA — SCHEDULED]')
        .setDescription(message)
        .setFooter({ text: 'Made for Degens. By Degens.' })
        .setTimestamp();

      for (const channelId of targetChannels) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel && 'send' in channel) {
            await (channel as TextChannel).send({ embeds: [embed] });
          }
        } catch (err) {
          console.error(`[TriviaNotifier] Failed to send to ${channelId}:`, err);
        }
      }
    },
    'discord-bot',
  );

  // Also listen for trivia.started to auto-announce game starts
  eventRouter.subscribe(
    'trivia.started' as any,
    async (event: any) => {
      const { category, theme, totalRounds } = event.data as {
        category?: string;
        theme?: string;
        totalRounds?: number;
      };

      const embed = new EmbedBuilder()
        .setColor(0x22d3a6)
        .setTitle('[LIVE TRIVIA — GAME ON]')
        .setDescription(
          `**${theme || category || 'Trivia'}** just went live.\n` +
          `**${totalRounds || '?'} rounds** — last degen standing takes the pot.\n\n` +
          `Open the Degens Activity or use \`/launch\` to join.`,
        )
        .setFooter({ text: 'Made for Degens. By Degens.' })
        .setTimestamp();

      for (const channelId of TRIVIA_ANNOUNCE_CHANNEL_IDS) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (channel && 'send' in channel) {
            await (channel as TextChannel).send({ embeds: [embed] });
          }
        } catch {}
      }
    },
    'discord-bot',
  );

  console.log(`[TriviaNotifier] Listening (${TRIVIA_ANNOUNCE_CHANNEL_IDS.length} channel(s) configured)`);
}
