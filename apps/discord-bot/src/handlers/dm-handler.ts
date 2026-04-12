// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
/**
 * DM Handler
 * NLP routing for direct messages is handled by EventHandler.registerDiscordEvents().
 * This module exports helpers used by that handler.
 */

import { Client, Message } from 'discord.js';
import { trackMessage } from '@tiltcheck/tiltcheck-core';
import { buildPersonaReply, detectConversationIntent } from '../utils/conversation-nlp.js';
import { hasMessageContentConsent } from '../services/data-consent.js';

export async function handleDirectMessage(_client: Client, message: Message): Promise<void> {
  if (message.author.bot) return;
  if (message.guildId) return;

  if (await hasMessageContentConsent(message.author.id)) {
    trackMessage(message.author.id, message.content, message.channelId);
  }

  const intent = detectConversationIntent(message.content);
  const reply = buildPersonaReply(intent);

  await message.reply({ content: reply });
}

/** No-op — DM NLP is registered once in EventHandler.registerDiscordEvents(). */
export function registerDMHandler(_client: Client): void {
  console.log('[DM Handler] NLP routing delegated to EventHandler');
}
