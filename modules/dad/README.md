# DA&D (Degens Against Decency)

**AI-powered card game for Discord communities in the TiltCheck ecosystem.**

## Purpose

DA&D is a Cards Against Humanity-style game built specifically for degen casino communities. It provides fun, social entertainment between gambling sessions while maintaining the irreverent humor that degens love.

## Features

- **White Cards & Black Cards**: Answer cards and prompt cards
- **AI-Generated Packs**: Dynamically create themed card packs
- **Player Voting**: Anonymous voting for the funniest combinations
- **Score Tracking**: Points system and leaderboards
- **Seasonal Themes**: Rotating card packs based on events
- **Discord-First**: Designed for Discord communities

## API

### Creating a Game

```typescript
import { dad } from '@tiltcheck/dad';

// Create a new game in a Discord channel
const game = await dad.createGame(
  'channel-id-123', 
  ['degen-starter'], // Card pack IDs
  {
    maxRounds: 10,
    maxPlayers: 10,
  }
);
```

### Players Joining

```typescript
// Players join the game
const player1 = await dad.joinGame(game.id, 'user123', 'DegenKing');
const player2 = await dad.joinGame(game.id, 'user456', 'TiltQueen');

console.log(`Player hand: ${player1.hand.length} cards`); // 7 cards
```

### Starting a Game

```typescript
// Start the game (requires at least 2 players)
const startedGame = await dad.startGame(game.id);

console.log(`Round ${startedGame.currentRound} started!`);
console.log(`Black Card: ${startedGame.rounds[0].blackCard.text}`);
```

### Playing Cards

```typescript
// Players submit white cards to fill the black card blanks
const player = game.players.get('user123');
const cardToPlay = player.hand[0];

await dad.submitCards(game.id, 'user123', [cardToPlay.id]);
```

### Voting

```typescript
// Players vote for the funniest combination
// (Can't vote for yourself)
await dad.vote(game.id, 'user123', 'user456');

// When all players vote, the round ends automatically
// Winner gets a point
// New round starts with fresh cards
```

### Querying Games

```typescript
// Get game state
const game = dad.getGame('game-id-123');

console.log(`Status: ${game.status}`); // 'waiting' | 'active' | 'completed'
console.log(`Players: ${game.players.size}`);
console.log(`Round: ${game.currentRound} / ${game.maxRounds}`);

// Get active games in a channel
const channelGames = dad.getChannelGames('channel-id-123');
```

### Managing Card Packs

```typescript
// Get all available card packs
const packs = dad.getCardPacks();

for (const pack of packs) {
  console.log(`${pack.name} - ${pack.theme}`);
  console.log(`White cards: ${pack.whiteCards.length}`);
  console.log(`Black cards: ${pack.blackCards.length}`);
}

// Create a custom pack
const customPack = await dad.createCardPack({
  name: 'Crypto Degens Pack',
  description: 'Cards about crypto and NFTs',
  theme: 'crypto',
  isOfficial: false,
  whiteCards: [
    { id: '1', text: 'Buying the top', packId: 'crypto' },
    { id: '2', text: 'Getting rugged', packId: 'crypto' },
  ],
  blackCards: [
    { id: '3', text: 'My portfolio went to zero because of _____', blanks: 1, packId: 'crypto' },
  ],
});
```

## Default Card Packs

### Degen Starter Pack

The default pack that ships with DA&D, featuring:

**White Cards:**
- Rage spinning at 3 AM
- Losing your entire bankroll
- A sketchy Discord promo link
- Hitting max win on a $0.10 spin
- Getting bonus nerfed mid-session
- Watching someone else hit the jackpot
- Chasing losses until sunrise
- A mysterious wallet address
- Blaming RTP for everything
- One more spin before bed

**Black Cards:**
- What destroyed my bankroll this week? _____
- I knew I was tilting when _____
- The secret to responsible gambling is _____
- After _____, I decided to take a break from slots.
- My biggest regret as a degen? _____

## Events

DA&D publishes the following events to the Event Router:

### `game.started`
Emitted when a game begins.

```typescript
{
  gameId: string;
  channelId: string;
  playerCount: number;
}
```

### `game.card.played`
Emitted when a player submits cards.

```typescript
{
  gameId: string;
  userId: string;
  roundNumber: number;
}
```

### `game.round.ended`
Emitted when a round completes.

```typescript
{
  gameId: string;
  roundNumber: number;
  winnerId: string;
}
```

### `game.completed`
Emitted when a game ends.

```typescript
{
  gameId: string;
  winnerId: string;
  finalScores: Array<{
    userId: string;
    username: string;
    score: number;
  }>;
}
```

## Discord Integration

DA&D can be integrated with Discord bot commands:

- `/play` - Start a new game
- `/join` - Join an active game
- `/hand` - View your cards
- `/submit [card]` - Play a card
- `/vote [player]` - Vote for the funniest answer
- `/scores` - View current scores
- `/packs` - View available card packs

## Game Flow

1. **Setup**: A game is created in a channel with selected card packs
2. **Join**: Players join the game (2-10 players)
3. **Start**: Game starts when enough players have joined
4. **Round Start**: A black card is revealed
5. **Submit**: Players anonymously submit white cards to fill the blanks
6. **Vote**: All players vote for the funniest combination
7. **Score**: Winner gets a point, new cards are dealt
8. **Repeat**: Steps 4-7 repeat for configured number of rounds
9. **End**: Game ends, overall winner is announced

## AI Card Generation

Future versions will include:

- AI-generated card suggestions
- Custom pack creation from prompts
- Seasonal/event-based themes
- Community-voted pack curation
- NSFW filter controls

## Best Practices

1. **Keep it Fun**: The game is meant to be lighthearted and funny
2. **Community Appropriate**: Use official packs or curate custom ones carefully
3. **Moderate**: Review custom packs before making them public
4. **Respect Limits**: Players can request card removal if uncomfortable
5. **Fair Play**: No coordinating votes or sharing cards outside the game

## Future Enhancements

- Leaderboards across all games
- Achievement system
- Custom avatar integration
- Tournament mode
- Spectator support
- NFT card collectibles
- Pack marketplace

---

**Part of the TiltCheck Ecosystem**  
Built for degens, by degens. 🃏
