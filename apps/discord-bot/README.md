# @tiltcheck/discord-bot

Discord bot for the TiltCheck ecosystem.

## Features

- **Slash Commands** - Modern Discord slash command interface
- **Auto Link Scanning** - Automatically scans URLs in messages
- **Event-Driven** - Integrates with modules via Event Router
- **Modular Design** - Easy to add new commands and features

## Available Commands

- `/ping` - Check bot status
- `/help` - Show available commands
- `/scan <url>` - Scan a URL for suspicious patterns

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "TiltCheck")
4. Go to "Bot" section and create a bot
5. Copy the bot token
6. Enable these intents:
   - Server Members Intent
   - Message Content Intent

### 2. Configure Environment

```bash
cd apps/discord-bot
cp .env.example .env
```

Edit `.env` and add your Discord credentials:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_test_guild_id_here  # Optional, for faster dev testing
```

### 3. Install Dependencies

```bash
# From monorepo root
npx pnpm install
```

### 4. Deploy Commands

```bash
# Deploy slash commands to Discord
npx tsx apps/discord-bot/src/deploy-commands.ts
```

### 5. Run the Bot

```bash
# Development mode (auto-reload)
npx pnpm --filter @tiltcheck/discord-bot dev

# Production mode
npx pnpm --filter @tiltcheck/discord-bot build
npx pnpm --filter @tiltcheck/discord-bot start
```

## Invite the Bot

Generate an invite link with these scopes:
- `bot`
- `applications.commands`

And these permissions:
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands

Example URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025508352&scope=bot%20applications.commands
```

## Project Structure

```
apps/discord-bot/
├── src/
│   ├── commands/          # Slash commands
│   │   ├── ping.ts
│   │   ├── help.ts
│   │   ├── scan.ts
│   │   └── index.ts
│   ├── handlers/          # Event and command handlers
│   │   ├── commands.ts
│   │   ├── events.ts
│   │   └── index.ts
│   ├── config.ts          # Configuration management
│   ├── types.ts           # TypeScript types
│   ├── deploy-commands.ts # Command deployment script
│   └── index.ts           # Main entry point
├── .env.example
├── package.json
└── README.md
```

## Creating New Commands

Create a new file in `src/commands/`:

```typescript
// src/commands/mycommand.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { successEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../types';

export const mycommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('My command description')
    .addStringOption(option =>
      option
        .setName('input')
        .setDescription('Some input')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const input = interaction.options.getString('input', true);
    
    const embed = successEmbed('Success!', `You said: ${input}`);
    await interaction.reply({ embeds: [embed] });
  },
};
```

Export it in `src/commands/index.ts`:

```typescript
export { mycommand } from './mycommand';
```

Redeploy commands:

```bash
npx tsx apps/discord-bot/src/deploy-commands.ts
```

## Integration with Modules

The bot automatically integrates with TiltCheck modules:

```typescript
// Example: Using SusLink
import { suslink } from '@tiltcheck/suslink';

const result = await suslink.scanUrl(url, userId);
```

## Event Router Integration

Subscribe to events from modules:

```typescript
import { eventRouter } from '@tiltcheck/event-router';

eventRouter.subscribe(
  'link.flagged',
  async (event) => {
    // Handle high-risk link
    console.log('Flagged:', event.data);
  },
  'discord-bot'
);
```

## Configuration Options

`.env` variables:

- `DISCORD_TOKEN` - Bot token (required)
- `DISCORD_CLIENT_ID` - Application client ID (required)
- `DISCORD_GUILD_ID` - Test guild ID (optional, for faster dev)
- `NODE_ENV` - Environment (development/production)
- `COMMAND_PREFIX` - Prefix for text commands (default: !)
- `OWNER_ID` - Bot owner Discord user ID
- `SUSLINK_AUTO_SCAN` - Auto-scan URLs in messages (default: true)
- `TRUST_THRESHOLD` - Trust score threshold (default: 60)

## Troubleshooting

**Commands not showing up:**
- Make sure you ran `deploy-commands.ts`
- For guild commands, it's instant
- For global commands, can take up to 1 hour

**Bot not responding:**
- Check the bot token is correct
- Verify intents are enabled in Discord Developer Portal
- Check bot has proper permissions in your server

**Module not found errors:**
- Run `npx pnpm build` from monorepo root
- Make sure all workspace dependencies are built
