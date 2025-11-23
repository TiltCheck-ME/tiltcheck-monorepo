# DA&D Game Bot

Discord bot dedicated to **Degens Against Decency** (card game) and **Poker**.

## Features

### DA&D Commands
- `/play` - Start a new DA&D game
- `/join` - Join an active game
- `/startgame` - Start the game (2+ players required)
- `/hand` - View your cards
- `/submit <card>` - Play a card for the current round
- `/vote <player>` - Vote for the funniest answer
- `/scores` - View current game leaderboard

### Poker Commands
- `/poker` - Play poker with friends

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Discord bot token and client ID
```

3. Build:
```bash
pnpm build
```

4. Run:
```bash
pnpm start
# Or for development:
pnpm dev
```

## Discord Bot Setup

1. Create a new Discord application at https://discord.com/developers/applications
2. Create a bot user
3. Copy the bot token to your `.env` file
4. Enable these Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
5. Invite the bot to your server with these permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands

## Deployment

See the main TiltCheck repository documentation for deployment options.

---

**Part of the TiltCheck Ecosystem**  
Built for degens, by degens. 🃏
