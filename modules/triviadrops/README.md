# TriviaDrops Module

This module powers the `/triviadrop` Discord command for TiltCheck.

## Features
- ✅ **AI-generated trivia questions** (Vercel AI SDK + OpenAI)
- ✅ **Static question bank fallback** (40+ questions)
- ✅ **6 categories**: Crypto, Poker, Sports, Science, History, General
- ✅ **3 difficulty levels**: Easy (10pts), Medium (20pts), Hard (30pts)
- ✅ **Streak tracking** with achievement system
- ✅ **Leaderboard** with accuracy stats
- ✅ **Persistent storage** (JSON-based, upgradable to DB)
- ✅ **Discord integration** with rich embeds

## Achievements
- 🎯 **First Blood** - Answer your first question correctly
- 🔥 **On Fire** - 3 correct answers in a row
- ⚡ **Unstoppable** - 5 correct answers in a row
- 👑 **Legendary** - 10 correct answers in a row
- 💯 **Century** - Earn 100 points
- ⭐ **All-Star** - Earn 500 points
- 🏆 **Champion** - Earn 1,000 points
- 🎓 **Scholar** - Maintain 80%+ accuracy (min 10 attempts)
- 🎮 **Dedicated** - Play 50 questions
- 💪 **Grinder** - Play 100 questions

## AI Question Generation
Set `OPENAI_API_KEY` in your environment to enable infinite AI-generated questions. Falls back to static bank if unavailable.

## Usage
Imported by the Discord bot. See `apps/discord-bot/src/commands/triviadrop.ts` for command wiring.

## Configuration
- `TRIVIA_STORE_PATH` - Path to trivia data store (default: `./data/trivia-store.json`)
- `OPENAI_API_KEY` - Optional OpenAI API key for AI question generation

## Data Structure
```typescript
{
  leaderboard: [
    {
      userId: string;
      username: string;
      score: number;
      correctAnswers: number;
      totalAttempts: number;
      currentStreak: number;
      longestStreak: number;
      lastAnswerCorrect: boolean;
      achievements: string[];
      lastUpdated: number;
    }
  ],
  activeGames: [
    {
      questionId: string;
      guildId: string;
      channelId: string;
      question: TriviaQuestion;
      startedAt: number;
      expiresAt: number;
    }
  ]
}
```

## Future Enhancements
- [x] Integrate OpenAI for question generation
- [x] Add persistent leaderboard storage
- [x] Add streak tracking
- [x] Add achievement system
- [x] Support multiple categories
- [ ] Support multiple concurrent trivia games
- [ ] Add admin controls for custom questions
- [ ] Add database backend option
- [ ] Add tip rewards for leaderboard winners
