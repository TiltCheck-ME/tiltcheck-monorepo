© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

# TiltCheck Game Arena

Web-based multiplayer game arena for **Degens Against Decency** (DA&D) and **Texas Hold'em Poker** with Discord authentication.

## Features

- 🎮 **Multiplayer Web Games**: Play DA&D and Poker in your browser
- 🔐 **Discord Authentication**: Secure login with Discord OAuth
- 🔄 **Real-time Sync**: WebSocket-powered live gameplay
- 📊 **Unified Stats**: User stats tracked across web and Discord bot gameplay
- 🏆 **Leaderboards**: Cross-platform leaderboards via event-router
- 💬 **In-game Chat**: Communicate with other players
- 📱 **Responsive Design**: Works on desktop and mobile

## Architecture

### Tech Stack (MVP)

- **Backend**: Express.js + TypeScript
- **Real-time**: Socket.IO with WebSocket
- **Auth**: Passport.js with Discord strategy
- **Session**: express-session (in-memory for MVP)
- **Game Logic**: Existing @tiltcheck/dad and @tiltcheck/poker modules
- **Event System**: @tiltcheck/event-router for cross-service communication
- **Styling**: Vanilla CSS from DegensAgainstDecency reference repo

### Platform Separation

The web arena and Discord bot are **separate platforms** for playing the same games:

- **Web Arena** (this service): Browser-based gameplay at `/arena`
- **Discord Bot** (`/apps/dad-bot`): Discord slash commands gameplay

Both platforms:
- Use the same game modules (`@tiltcheck/dad`, `@tiltcheck/poker`)
- Track stats to the same Discord user ID
- Emit events through event-router for unified leaderboards
- Support the same game types and rules

### Event-Router Integration

User stats are tracked via event-router events:

```typescript
// Game completed event
eventRouter.publish('game.completed', 'game-arena', {
  gameId,
  type: 'dad' | 'poker',
  platform: 'web',
  winnerId: discordUserId,
  playerIds: [discordUserId, ...],
});

// Stats consumer can listen and update database
eventRouter.subscribe('game.completed', async (event) => {
  await updateUserStats(event.data);
}, 'stats-tracker');
```

## Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Discord Application with OAuth2 configured

### Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or use existing
3. Go to OAuth2 settings
4. Add redirect URIs:
   - **Development**: `http://localhost:3010/auth/discord/callback`
   - **Production**: `https://arena.tiltcheck.me/auth/discord/callback`
5. Copy Client ID and Client Secret

### Installation

```bash
# From monorepo root
pnpm install

# Or from this directory
cd services/game-arena
pnpm install
```

### Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
# Development:
DISCORD_CALLBACK_URL=http://localhost:3010/auth/discord/callback
# Production:
# DISCORD_CALLBACK_URL=https://arena.tiltcheck.me/auth/discord/callback
SESSION_SECRET=generate_random_secret

# Supabase (Required for stats tracking)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database schema**:
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `/packages/database/schema.sql`
   - Run the SQL to create tables, indexes, and policies

3. **Get your credentials**:
   - Project URL: Settings → API → Project URL
   - Anon key: Settings → API → anon/public key

4. **Configure environment variables**:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. **Verify connection**:
   ```bash
   curl http://localhost:3010/health
   # Should show { connected: true }
   ```

The database will automatically track:
- User stats across web and Discord bot
- Game history
- Leaderboards (global, DA&D, Poker)

### Development

```bash
# Run dev server with hot reload
pnpm dev

# Or from monorepo root
pnpm --filter @tiltcheck/game-arena dev
```

Visit `http://localhost:3010`

### Production

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
services/game-arena/
├── src/
│   ├── server.ts           # Main Express + Socket.IO server
│   ├── config.ts           # Configuration management
│   ├── types.ts            # TypeScript type definitions
│   └── game-manager.ts     # Game lifecycle management
├── public/
│   ├── index.html          # Landing page with Discord login
│   ├── arena.html          # Game lobby
│   ├── game.html           # Game room
│   ├── styles/
│   │   ├── main.css        # Main styles (from DegensAgainstDecency)
│   │   └── game.css        # Game-specific styles
│   └── scripts/
│       ├── auth.js         # Authentication handling
│       ├── arena.js        # Lobby functionality
│       └── game.js         # Game client logic
├── tests/                  # Unit and integration tests
├── package.json
├── tsconfig.json
├── .env.example
├── TECH_STACK.md          # Tech stack recommendations
└── README.md
```

## API Endpoints

### HTTP Routes

- `GET /` - Landing page
- `GET /arena` - Game lobby (auth required)
- `GET /game/:gameId` - Game room (auth required)
- `GET /health` - Health check

### Auth Routes

- `GET /auth/discord` - Initiate Discord OAuth
- `GET /auth/discord/callback` - OAuth callback
- `GET /auth/logout` - Logout

### API Routes

- `GET /api/user` - Get current user info
- `GET /api/games` - List active games
- `POST /api/games` - Create new game
- `GET /api/games/:gameId` - Get game details
- `GET /api/stats/:discordId` - Get user stats
- `GET /api/leaderboard?type=dad|poker&limit=100` - Get leaderboard
- `GET /api/history/:discordId?limit=50` - Get user game history

### WebSocket Events

**Client → Server:**
- `join-lobby` - Join game lobby
- `leave-lobby` - Leave lobby
- `join-game` - Join specific game
- `leave-game` - Leave current game
- `game-action` - Send game action
- `chat-message` - Send chat message

**Server → Client:**
- `lobby-update` - Lobby games list updated
- `game-update` - Game state updated
- `game-error` - Game error occurred
- `chat-message` - New chat message
- `player-joined` - Player joined game
- `player-left` - Player left game

## Game Types

### Degens Against Decency (DA&D)

Card game similar to Cards Against Humanity, built for casino degenerates.

**Flow:**
1. Create game with max players and rounds
2. Players join and receive hand of white cards
3. Each round: black card (prompt) is drawn
4. Players submit white card(s) to fill the blank
5. Card Czar picks funniest answer
6. Winner gets point, first to target wins

**Actions:**
- `submit-cards`: Submit answer cards
- `vote`: Vote for funniest answer (as Czar)

### Texas Hold'em Poker

Classic poker with tilt detection and bad beat tracking.

**Flow:**
1. Create game with buy-in and blinds
2. Players join with chips
3. Deal hole cards, betting rounds
4. Community cards: flop, turn, river
5. Showdown and winner determination
6. Tilt events emitted on bad beats

**Actions:**
- `fold`: Fold hand
- `check`: Check (no bet)
- `call`: Match current bet
- `raise`: Raise bet (with amount)
- `allin`: Go all-in

## Stats Tracking

User stats are stored in Supabase (when configured) and updated via event-router events:

```sql
-- Example stats structure
{
  discord_id: "123456789",
  username: "degen#1337",
  total_games: 42,
  total_wins: 15,
  dad_games: 30,
  dad_wins: 12,
  dad_score: 156,
  poker_games: 12,
  poker_wins: 3,
  poker_chips_won: 450,
  last_played_at: "2025-11-23T15:00:00Z"
}
```

## Deployment

See `TECH_STACK.md` for detailed deployment recommendations.

**Quick Deploy Options:**
- **Railway**: Best for WebSocket support, generous free tier
- **Render**: Good free tier with auto-scaling
- **Heroku**: Classic PaaS with add-on ecosystem

**Environment Variables (Production):**
```env
NODE_ENV=production
PORT=3010
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback
SESSION_SECRET=...
SUPABASE_URL=...  # Optional
SUPABASE_ANON_KEY=...  # Optional
REDIS_URL=...  # Optional for scaling
```

## Development Roadmap

### Phase 1: MVP ✅
- [x] Basic Express + Socket.IO server
- [x] Discord OAuth authentication
- [x] Game lobby with list of active games
- [x] DA&D and Poker integration
- [x] Real-time gameplay with WebSocket
- [x] Event-router integration
- [x] Styling from DegensAgainstDecency

### Phase 2: Production Ready
- [ ] Supabase integration for stats storage
- [ ] User stats tracking and leaderboards
- [ ] Redis for session storage
- [ ] Error handling and monitoring (Sentry)
- [ ] Unit and integration tests
- [ ] CI/CD pipeline

### Phase 3: Enhanced Features
- [ ] Spectator mode
- [ ] Game replay/history
- [ ] Tournaments and brackets
- [ ] Custom card packs for DA&D
- [ ] Voice chat integration
- [ ] Mobile app (React Native)

## Contributing

This service is part of the TiltCheck monorepo. See the main repository's CONTRIBUTING.md for guidelines.

## License

Part of the TiltCheck Ecosystem. See main repository for license information.

---

## Admin (Control-Room) API

This service exposes a small set of admin endpoints used by the Control Room. All endpoints are protected by the existing game-arena admin token (X-Admin-Token header) and should only be invoked from trusted operator tooling.

- POST /admin/game/:gameId/force-end
  - Force-end a lobby game immediately. Marks the lobby as completed and attempts a best-effort completion of underlying module state (DA&D).
  - Headers: X-Admin-Token: <admin-token>
  - Response: { success: true, message }

- POST /admin/replay-snapshot
  - Replay a persisted snapshot object into memory. Body must be the snapshot JSON (version 1 format).
  - Headers: X-Admin-Token: <admin-token>
  - Response: { success: true }

- GET /admin/export-audit?limit=100
  - Export recent event-router audit history as JSON. Optional `limit` query parameter.
  - Headers: X-Admin-Token: <admin-token>
  - Response: { success: true, events: [...] }

- POST /admin/payout-reconcile
  - Request a payout reconciliation workflow. This publishes a `payout.reconcile` event for downstream consumers to act on.
  - Headers: X-Admin-Token: <admin-token>
  - Response: { success: true }

Security notes:
- Configure GAME_ARENA_ADMIN_TOKEN in the environment for a token-based gate. When unset, the admin middleware currently bypasses enforcement (development only).
- Do not expose admin tokens in public repos or UI.

---

Made for Degens. By Degens.
