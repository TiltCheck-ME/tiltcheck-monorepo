# AI Integration Quick Start Guide

## 🎯 Goal
Add natural language command parsing to TiltCheck Discord bot in 30 minutes.

---

## Step 1: Test Current Setup (5 min)

### Verify AI Package Built
```bash
cd $(git rev-parse --show-toplevel)
ls -la packages/ai-service/dist/
# Should see: index.js, nlu.js, smart-help.js, *.d.ts files
```

### Test `/play-analyze` Fix
1. Open Discord
2. Run `/play-analyze casino:stake-us`
3. Should see: ✅ Success message with session URL
4. If error: Check that bot restarted with new `.env` changes

---

## Step 2: Add Natural Language Handler (15 min)

### Create Message Handler

**File**: `apps/discord-bot/src/handlers/natural-language.ts`

```typescript
import { Client, Events, Message } from 'discord.js';
import { parseNaturalLanguage, isAIEnabled } from '@tiltcheck/ai-service';

export function registerNaturalLanguageHandler(client: Client) {
  client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore bots
    if (message.author.bot) return;
    
    // Only parse messages starting with "tc " prefix
    if (!message.content.startsWith('tc ')) return;
    
    const userInput = message.content.slice(3).trim();
    
    try {
      const result = await parseNaturalLanguage(userInput, message.author.id);
      
      // Log for debugging
      console.log('[NLU]', {
        input: userInput,
        intent: result.intent,
        confidence: result.confidence
      });
      
      // Low confidence - suggest slash commands
      if (result.confidence < 0.6) {
        await message.reply({
          content: `🤔 I'm not sure what you meant.\n\nTry using slash commands like \`/help\` or type \`tc help\` for assistance.`,
          allowedMentions: { repliedUser: false }
        });
        return;
      }
      
      // High confidence - show suggested command
      const aiIndicator = isAIEnabled() ? '🤖 AI' : '🔍 Pattern';
      
      await message.reply({
        content: 
          `${aiIndicator} | Confidence: ${(result.confidence * 100).toFixed(0)}%\n\n` +
          `I understood: **${result.intent}**\n\n` +
          `Suggested command:\n\`\`\`\n${result.suggested_command}\n\`\`\`\n\n` +
          `React with ✅ to execute or ❌ to cancel.`,
        allowedMentions: { repliedUser: false }
      });
      
      // Add reactions
      await message.react('✅');
      await message.react('❌');
      
      // TODO: Handle reactions (see Step 3)
      
    } catch (error) {
      console.error('[NLU] Error:', error);
      await message.reply({
        content: '❌ Failed to process your message. Please use slash commands.',
        allowedMentions: { repliedUser: false }
      });
    }
  });
  
  console.log('[NLU] Natural language handler registered');
}
```

### Wire It Up

**File**: `apps/discord-bot/src/index.ts`

```typescript
// Add import at top
import { registerNaturalLanguageHandler } from './handlers/natural-language.js';

// In main() function, after commandHandler setup:
async function main() {
  // ... existing setup ...
  
  // Register command handler
  commandHandler.registerCommands();
  
  // NEW: Register natural language handler
  registerNaturalLanguageHandler(client);
  
  // ... rest of code ...
}
```

---

## Step 3: Add Reaction Collector (10 min)

Update `apps/discord-bot/src/handlers/natural-language.ts`:

```typescript
// After adding reactions
await message.react('✅');
await message.react('❌');

// Create reaction collector
const filter = (reaction: any, user: any) => {
  return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
};

const replyMsg = await message.fetchReference();
const collector = replyMsg.createReactionCollector({ 
  filter, 
  max: 1, 
  time: 30000 // 30 seconds
});

collector.on('collect', async (reaction, user) => {
  if (reaction.emoji.name === '✅') {
    // User confirmed - execute command
    await message.channel.send({
      content: `⚡ Executing: \`${result.suggested_command}\`\n\n` +
               `💡 Tip: You can use slash commands directly for faster execution!`
    });
    
    // TODO: Actually execute the command
    // For now, just show instructions
    
  } else {
    // User cancelled
    await message.channel.send({
      content: `❌ Cancelled. Use \`/help\` to see all commands.`
    });
  }
});

collector.on('end', (collected) => {
  if (collected.size === 0) {
    message.channel.send({
      content: `⏱️ Confirmation timeout. Use \`/help\` for command list.`
    }).catch(console.error);
  }
});
```

---

## Step 4: Test It! (5 min)

### Rebuild & Restart Bot
```bash
cd $(git rev-parse --show-toplevel)

# Rebuild Discord bot
pnpm -F @tiltcheck/discord-bot build

# Restart
pkill -f "discord-bot/dist" && sleep 2 && ./scripts/start-bot.sh
```

### Test in Discord

**Natural Language Commands**:
```
tc tip alice 5 bucks
tc send bob 10 sol
tc what's my balance
tc analyze stake
tc register phantom
tc trivia about crypto
tc help
```

**Expected Behavior**:
1. Bot analyzes your message
2. Shows intent, confidence, and suggested command
3. Adds ✅ and ❌ reactions
4. Waits for your confirmation
5. Executes or cancels based on reaction

---

## Step 5: Add Smart Help (Bonus - 10 min)

### Create `/ask` Command

**File**: `apps/discord-bot/src/commands/ask.ts`

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { generateSmartHelp } from '@tiltcheck/ai-service';

export const ask = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask TiltCheck Helper anything')
    .addStringOption(opt => 
      opt.setName('question')
         .setDescription('Your question')
         .setRequired(true)
    ),
    
  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('question', true);
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const response = await generateSmartHelp(question, {
        userId: interaction.user.id,
        // TODO: Add real user context from database
        userLevel: 'intermediate'
      });
      
      const relatedCmds = response.relatedCommands.length > 0
        ? `\n\n📚 Related: ${response.relatedCommands.join(', ')}`
        : '';
      
      await interaction.editReply({
        content: `**${question}**\n\n${response.answer}${relatedCmds}`
      });
      
    } catch (error) {
      console.error('[Ask] Error:', error);
      await interaction.editReply({
        content: '❌ Failed to generate answer. Try `/help` instead.'
      });
    }
  }
};
```

### Register Command

**File**: `apps/discord-bot/src/commands/index.ts`

```typescript
export { ask } from './ask.js';
```

### Test
```
/ask question: How do I tip someone?
/ask question: What are the fees?
/ask question: Can I tip in USDC?
```

---

## 🎉 You're Done!

You now have:
- ✅ Natural language command parsing
- ✅ Confirmation flow with reactions
- ✅ Smart help assistant
- ✅ Fallback to regex when AI unavailable

---

## 📊 Monitor Performance

### Check Logs
```bash
# Discord bot logs
tail -f /tmp/tiltcheck-bot.log

# Look for:
# [NLU] Parsed: { input: "...", intent: "...", confidence: 0.95 }
```

### Track Metrics
Add to your bot:

```typescript
// Metrics object
const metrics = {
  nlu_requests: 0,
  nlu_high_confidence: 0, // > 0.8
  nlu_low_confidence: 0,  // < 0.6
  nlu_errors: 0,
  ai_enabled: isAIEnabled()
};

// Update in handler
metrics.nlu_requests++;
if (result.confidence > 0.8) metrics.nlu_high_confidence++;
if (result.confidence < 0.6) metrics.nlu_low_confidence++;

// Endpoint
app.get('/metrics', (req, res) => {
  res.json(metrics);
});
```

---

## 🐛 Troubleshooting

### "Command not found"
```bash
# Rebuild commands
pnpm -F @tiltcheck/discord-bot build

# Restart bot
pkill -f "discord-bot/dist" && sleep 2 && ./scripts/start-bot.sh
```

### "OPENAI_API_KEY missing"
```bash
# Add to .env
echo "OPENAI_API_KEY=sk-your-key-here" >> .env

# Restart bot (it will use AI mode now)
```

### "Low confidence scores"
- AI mode: Improve system prompt with more examples
- Fallback mode: Add more regex patterns
- User education: Show slash command examples

### "Rate limit exceeded"
Implement caching:
```typescript
const cache = new Map<string, NLUResult>();

async function cachedParse(text: string) {
  const key = text.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;
  
  const result = await parseNaturalLanguage(text);
  cache.set(key, result);
  return result;
}
```

---

## 🚀 Next Steps

1. [ ] Add user context tracking (recent commands, preferences)
2. [ ] Implement command execution from NLU results
3. [ ] Add FAQ auto-generation
4. [ ] Track engagement metrics
5. [ ] A/B test vs traditional slash commands
6. [ ] Launch premium AI features

---

## 📚 Resources

- [AI Integration Roadmap](./AI_INTEGRATION_ROADMAP.md)
- [AI Service README](../packages/ai-service/README.md)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Discord.js Guide](https://discordjs.guide/)

---

**Time to implement**: ~30 minutes  
**Difficulty**: Intermediate  
**Impact**: High (better UX, lower barrier to entry)
