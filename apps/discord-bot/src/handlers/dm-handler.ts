/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * DM Handler - NLP-first routing for safety bot conversations.
 */

import { Client, Events, Message } from 'discord.js';
import { trackMessage } from '@tiltcheck/tiltcheck-core';
import { buildPersonaReply, detectConversationIntent } from '../utils/conversation-nlp.js';

export async function handleDirectMessage(_client: Client, message: Message): Promise<void> {
  if (message.author.bot) return;
  if (message.guildId) return; // DM only

  trackMessage(message.author.id, message.content, message.channelId);

  const intent = detectConversationIntent(message.content);
  const reply = buildPersonaReply(intent);

  await message.reply({ content: reply });
}

export function registerDMHandler(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message.guildId || message.author.bot) return;
    try {
      await handleDirectMessage(client, message);
    } catch (error) {
      console.error('[DM Handler] Error handling DM:', error);
      await message.reply('Something went wrong. Try `/help` for the command list.');
    }
  });

  console.log('[DM Handler] TiltCheck DM NLP handler registered');
}
