import { Client, Events, Message } from 'discord.js';
import { buildPersonaReply, detectConversationIntent } from '../utils/conversation-nlp.js';

export function registerDMHandler(client: Client): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (message.guildId) return; // DM only

    const intent = detectConversationIntent(message.content);
    const reply = buildPersonaReply(intent);
    await message.reply(reply).catch(() => {});
  });

  console.log('[DM] JustTheTip DM NLP handler registered');
}
