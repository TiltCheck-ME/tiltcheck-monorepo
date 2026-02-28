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
  let reply = buildPersonaReply(intent);

  const text = message.content.toLowerCase();
  if (text.includes('tip') || text.includes('wallet') || text.includes('deposit')) {
    reply += '\n\nTip flow lives in JustTheTip bot: `/tip` (custodial credit flow).';
  } else if (text.includes('poker') || text.includes('dad') || text.includes('play')) {
    reply += '\n\nGame flow lives in DA&D bot: `/dad lobby ...` and `/dad poker ...`.';
  }

  await message.reply({ content: reply });
}

export function registerDMHandler(client: Client): void {
  client.on(Events.MessageCreate, async (message) => {
    if (message.guildId || message.author.bot) return;
    try {
      await handleDirectMessage(client, message);
    } catch (error) {
      console.error('[DM Handler] Error handling DM:', error);
      await message.reply('Brain lag. Try again with: `help`, `tilt`, `scan`, `tip`, or `poker`.');
    }
  });

  console.log('[DM Handler] TiltCheck DM NLP handler registered');
}
