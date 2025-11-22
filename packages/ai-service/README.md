# AI Service Package

AI-powered natural language understanding and smart assistance for TiltCheck Discord bots.

## Features

### 🧠 Natural Language Understanding (NLU)
Parse user messages into structured commands:

```typescript
import { parseNaturalLanguage } from '@tiltcheck/ai-service';

const result = await parseNaturalLanguage("tip alice 10 bucks");
// {
//   intent: 'tip',
//   entities: { recipient: 'alice', amount: 10, currency: 'USD' },
//   confidence: 0.95,
//   suggested_command: '/tip user:@alice amount:10 currency:USD'
// }
```

**Supported Intents**:
- `tip` - Send SOL/USD to another user
- `register_wallet` - Register Solana wallet
- `balance` - Check wallet balance
- `analyze` - Start casino analysis
- `trivia` - Play trivia game
- `leaderboard` - View rankings
- `help` - Get assistance
- `unknown` - Fallback

### 💬 Smart Help Assistant
Context-aware help with AI-generated responses:

```typescript
import { generateSmartHelp } from '@tiltcheck/ai-service';

const response = await generateSmartHelp(
  "How do I tip someone?",
  {
    userId: '123',
    userLevel: 'new',
    recentCommands: ['/register-magic']
  }
);
// {
//   answer: "Use `/tip` to send SOL or USD to another user!...",
//   relatedCommands: ['/tip', '/balance'],
//   confidence: 0.9
// }
```

### 📚 FAQ Generation
Auto-generate FAQs from common questions:

```typescript
import { generateFAQ } from '@tiltcheck/ai-service';

const faq = await generateFAQ([
  "What are the fees?",
  "How do I register?",
  "Can I tip in USDC?"
]);
// [
//   { question: "What are the fees?", answer: "Flat $0.07 per tip..." },
//   ...
// ]
```

## Installation

```bash
# From monorepo root
pnpm install

# Build the package
pnpm -F @tiltcheck/ai-service build
```

## Configuration

Set environment variable for AI features:

```env
OPENAI_API_KEY=sk-...
```

**Fallback behavior**: If no API key is set, the package falls back to regex-based parsing (less accurate but functional).

## Usage in Discord Bot

### Example: Natural Language Message Handler

```typescript
import { parseNaturalLanguage } from '@tiltcheck/ai-service';
import { Client, Events } from 'discord.js';

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // Only parse messages that start with "tc " (TiltCheck prefix)
  if (!message.content.startsWith('tc ')) return;
  
  const userInput = message.content.slice(3); // Remove "tc " prefix
  
  try {
    const result = await parseNaturalLanguage(userInput, message.author.id);
    
    if (result.confidence < 0.6) {
      await message.reply(
        `🤔 Not sure what you meant. Try using slash commands like \`/help\``
      );
      return;
    }
    
    // Confirm before executing
    await message.reply(
      `I understood: **${result.intent}**\n\n` +
      `Suggested command: \`${result.suggested_command}\`\n\n` +
      `React with ✅ to confirm or ❌ to cancel.`
    );
    
    // Add reactions for user confirmation
    await message.react('✅');
    await message.react('❌');
    
    // Handle reaction (see full example in docs)
  } catch (error) {
    console.error('[NLU] Error:', error);
    await message.reply('❌ Failed to process your message.');
  }
});
```

### Example: Smart Help Command

```typescript
import { generateSmartHelp } from '@tiltcheck/ai-service';

// In your help command handler
const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask TiltCheck Helper anything')
    .addStringOption(opt => 
      opt.setName('question')
         .setDescription('Your question')
         .setRequired(true)
    ),
  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    
    await interaction.deferReply({ ephemeral: true });
    
    const response = await generateSmartHelp(question, {
      userId: interaction.user.id,
      userLevel: 'intermediate', // Detect from usage history
      recentCommands: ['/tip', '/balance']
    });
    
    await interaction.editReply({
      content: `**${question}**\n\n${response.answer}\n\n` +
               `📚 Related: ${response.relatedCommands.join(', ')}`
    });
  }
};
```

## API Reference

### `parseNaturalLanguage(text, userId?)`

Parse user input into structured command.

**Parameters**:
- `text` (string) - User input text
- `userId` (string, optional) - User ID for context

**Returns**: `Promise<NLUResult>`

```typescript
interface NLUResult {
  intent: Intent;
  entities: Entities;
  confidence: number; // 0-1
  suggested_command?: string;
}
```

### `generateSmartHelp(question, context?)`

Generate context-aware help response.

**Parameters**:
- `question` (string) - User's question
- `context` (HelpContext, optional) - User context

**Returns**: `Promise<HelpResponse>`

```typescript
interface HelpResponse {
  answer: string;
  relatedCommands: string[];
  confidence: number;
}
```

### `generateFAQ(questions, category?)`

Generate FAQ from common questions.

**Parameters**:
- `questions` (string[]) - List of questions
- `category` (string, optional) - FAQ category

**Returns**: `Promise<Array<{ question, answer }>>`

### `isAIEnabled()`

Check if AI features are available (OpenAI API key set).

**Returns**: `boolean`

## Testing

```bash
# Run tests
pnpm -F @tiltcheck/ai-service test

# Run with coverage
pnpm -F @tiltcheck/ai-service test -- --coverage
```

## Cost Optimization

### Caching
```typescript
import { parseNaturalLanguage } from '@tiltcheck/ai-service';

const cache = new Map<string, NLUResult>();

async function cachedParse(text: string) {
  const cacheKey = text.toLowerCase().trim();
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  
  const result = await parseNaturalLanguage(text);
  cache.set(cacheKey, result);
  
  return result;
}
```

### Rate Limiting
```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m') // 10 requests per minute
});

async function rateLimitedParse(text: string, userId: string) {
  const { success } = await ratelimit.limit(userId);
  
  if (!success) {
    // Fall back to regex parser
    return fallbackParser(text);
  }
  
  return parseNaturalLanguage(text, userId);
}
```

## Security

### Input Sanitization
All user input is sanitized to prevent prompt injection:
- Removes system/assistant markers
- Limits length to 500 characters
- Strips suspicious patterns

### Content Moderation
For user-facing responses, consider adding:

```typescript
import { moderateContent } from 'openai';

const moderation = await moderateContent(userQuestion);

if (moderation.flagged) {
  return {
    answer: "I can't help with that. Please keep questions appropriate.",
    relatedCommands: ['/help'],
    confidence: 1.0
  };
}
```

## Performance Metrics

| Operation | Avg Latency | Cost/Request |
|-----------|-------------|--------------|
| NLU Parse (AI) | 500-800ms | $0.0003 |
| NLU Parse (Fallback) | <10ms | $0 |
| Smart Help | 800-1200ms | $0.0005 |
| FAQ Generation | 2-3s | $0.002 |

## Troubleshooting

### "OPENAI_API_KEY missing"
Set the environment variable:
```bash
export OPENAI_API_KEY=sk-...
```

### "Rate limit exceeded"
Implement caching and rate limiting (see examples above).

### "Low confidence scores"
- Check if input is too ambiguous
- Use fallback parser for simple patterns
- Add more examples to system prompt

## Roadmap

- [ ] Multi-language support (ES, FR, DE)
- [ ] Fine-tuned model for TiltCheck commands
- [ ] Streaming responses for real-time feedback
- [ ] Voice command support (Discord voice channels)
- [ ] Sentiment analysis for support tickets

## Contributing

See main monorepo [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT - See [LICENSE](../../LICENSE)
