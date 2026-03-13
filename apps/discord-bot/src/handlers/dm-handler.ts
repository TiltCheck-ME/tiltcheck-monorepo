/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * DM Handler - NLP-first routing for safety bot conversations.
 */

import { Client, Events, Message } from 'discord.js';
import { trackMessage } from '@tiltcheck/tiltcheck-core';
import { runner } from '@tiltcheck/agent';
import { stringifyContent } from '@google/adk';

export async function handleDirectMessage(_client: Client, message: Message): Promise<void> {
  if (message.author.bot) return;
  if (message.guildId) return; // DM only

  trackMessage(message.author.id, message.content, message.channelId);

  try {
    // Indicate typing while AI processes
    await message.channel.sendTyping();

    let finalResponse = '';
    const it = runner.runAsync({
      userId: message.author.id,
      sessionId: `discord-dm-${message.author.id}`,
      newMessage: {
        role: 'user',
        parts: [{ text: message.content }]
      }
    });

    for await (const event of it) {
      if (event.content) {
        finalResponse = stringifyContent(event.content);
      }
    }

    if (finalResponse) {
      await message.reply({ content: finalResponse });
    } else {
      await message.reply('I processed your message but have no specific insight. Try asking about your gaming stats or tilt status!');
    }
  } catch (error) {
    console.error('[DM Handler] AI Agent error:', error);
    await message.reply('My brain is a bit foggy right now. Try again in a minute, or use `/help` to see available commands.');
  }
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
