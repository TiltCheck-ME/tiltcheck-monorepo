# TiltCheck Bot - User Install Context Setup

## Overview

The TiltCheck Discord bot supports **user installation**, allowing individual users to install the bot in their personal context across all servers, DMs, and group DMs they have access to.

This is ideal for **tilt detection** — the bot can analyze user-typed messages for tilt indicators without requiring server-wide permissions or administrator approval.

---

## What is User Install?

**User Install** (vs. Server Install):
- ✅ User can install without admin approval
- ✅ Bot visible across all servers the user has access to
- ✅ Respects user's permissions (won't violate channel restrictions)
- ✅ No server-wide configuration needed
- ✅ Personal data stays personal

### Discord.js Command Contexts

Commands can target these contexts:

```typescript
// Guild context (traditional server bot)
.setContexts(InteractionContextType.Guild)

// User context (personal bot for DMs/cross-server)
.setContexts(InteractionContextType.BotDM)

// Dual context (works everywhere)
.setContexts(
  InteractionContextType.Guild,
  InteractionContextType.BotDM
)
```

---

## TiltCheck Commands by Context

### Dual-Context Commands (Guild + User Install)

These commands work in both server and user install modes:

| Command | Purpose | Works In | Why |
|---------|---------|----------|-----|
| `/tilt check` | Check personal tilt status | DMs, Server Channels | Personal status, no permissions needed |
| `/tilt cooldown` | Set personal cooldown reminder | DMs, Server Channels | Personal reminder, user-scoped |
| `/terms` | View legal docs | DMs, Server Channels | Read-only informational |
| `/help` | Show available commands | DMs, Server Channels | Read-only informational |
| `/support` | Request help from support | DMs, Server Channels | Can create tickets in user context |

### Guild-Only Commands

These commands require server context:

| Command | Purpose | Why Guild-Only |
|---------|---------|----------------|
| `/submitpromo` | Submit promo for review | Needs audit trail & server context |
| `/approvepromo` | Approve promo (mods) | Mod action requires server permissions |
| `/denypromo` | Deny promo (mods) | Mod action requires server permissions |
| `/scan` | Scan a link | Can work in both, but audit trail in guild |
| `/setpromochannel` | Configure promo channel | Admin command, guild-specific |

---

## Message Content Detection

Your bot already handles this correctly:

```typescript
// In events.ts - MessageCreate handler
if (config.suslinkAutoScan) {
  this.client.on(Events.MessageCreate, async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Track message for tilt detection
    trackMessage(
      message.author.id,
      message.content,
      message.channelId
    );

    // Extract & scan URLs
    const urls = extractUrls(message.content);
    // ... scan logic ...
  });
}
```

### User Install Behavior

When a user installs the bot in their personal context:
- ✅ Bot can read their messages in servers where they can read
- ✅ Bot can read their messages in DMs
- ✅ Bot respects channel permissions (won't read where user can't read)
- ❌ Bot cannot read messages from other users (privacy-enforced)

**This is perfect for tilt detection** — the bot only analyzes the installing user's messages.

---

## Enabling User Install in Discord Developer Portal

### Step 1: Enable Installation Contexts

1. Go to Discord Developer Portal
2. Select your bot application
3. Navigate to **Installation** → **Installation Method**
4. Check: ✅ **Guild Install** (existing)
5. Check: ✅ **User Install** (NEW)

### Step 2: Configure Scopes

For **User Install**, use these scopes:

```
- applications.commands  (to register slash commands)
- bot                     (for guild invites, optional but recommended)
```

For direct user-install link (no guild selection):

```
https://discord.com/oauth2/authorize?
  client_id=YOUR_CLIENT_ID
  &scope=applications.commands
  &integration_type=1
```

### Step 3: Set Default Permissions

User installs should have **minimal permissions**:

- ✅ Read Messages (for tilt detection)
- ✅ Send Messages (for responses)
- ✅ Use Slash Commands
- ❌ Everything else (unnecessary)

---

## Command Configuration Examples

### Personal Tilt Status (Dual-Context)

```typescript
export const tilt: Command = {
  data: new SlashCommandBuilder()
    .setName('tilt')
    .setDescription('Check your personal tilt status')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM
    )
    // ... options ...
};
```

### Approve Promo (Guild-Only)

```typescript
export const approvepromo: Command = {
  data: new SlashCommandBuilder()
    .setName('approvepromo')
    .setDescription('Approve a pending promo (mods only)')
    .setContexts(InteractionContextType.Guild) // Guild only
    // ... options ...
};
```

---

## Message Content Intent (Privileged)

Your bot already requests this. Discord requires:

1. ✅ **MessageContent Intent** enabled in bot settings
2. ✅ **Privileged Intent** approval from Discord (for production)
3. ✅ User consent (for reading their messages)

In your `index.ts`:

```typescript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,  // ← Tilt detection
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});
```

---

## Privacy & Safety

### What the Bot CAN See

- ✅ User's own messages (in channels where they can read)
- ✅ Message timestamps and metadata
- ✅ URLs in messages

### What the Bot CANNOT See

- ❌ Messages from other users
- ❌ Private DMs between other users
- ❌ Deleted messages
- ❌ Messages before bot was installed

### For Users Installing the Bot

Users should understand:

> "TiltCheck analyzes your messages to detect tilt patterns. Your messages are only analyzed if you install the bot. No data is shared with other users."

---

## Deployment Steps

### 1. Update Commands (Add Context Support)

```bash
cd apps/discord-bot
pnpm run deploy
```

This reads all `SlashCommandBuilder` definitions and registers contexts with Discord.

### 2. Test User Install Locally

```bash
# Generate user-install link
https://discord.com/oauth2/authorize?client_id=YOUR_BOT_ID&scope=applications.commands&integration_type=1
```

### 3. Monitor User Install Metrics

Track in logs:

```typescript
// In messageCreate handler
if (interaction.user) {
  console.log('[TiltDetect]', {
    userId: interaction.user.id,
    isUserInstall: !interaction.guild,
    context: interaction.guild ? 'guild' : 'user',
  });
}
```

---

## Troubleshooting

### "Bot doesn't respond in DMs"

**Check:**
- User installed bot in their account (via user-install link)
- `DirectMessages` intent is enabled
- Command has `.setContexts(InteractionContextType.BotDM)`

### "Message content not being detected"

**Check:**
- `MessageContent` intent is enabled
- Bot has privileged intent approval
- `config.suslinkAutoScan` is `true`
- User installed bot or bot is in the server

### "User can't see command in DM"

**Check:**
- Command includes `InteractionContextType.BotDM` in contexts
- Ran `pnpm run deploy` after changes
- Discord cached old command definitions (wait 1 hour or restart bot)

---

## Configuration

Set in `.env.local`:

```env
# Enable user message analysis for tilt detection
SUSLINK_AUTO_SCAN=true

# Bot behavior
TILT_DETECTION_ENABLED=true
TILT_THRESHOLD=0.7

# These still work:
TRUST_ALERTS_CHANNEL_ID=...
SUPPORT_CHANNEL_ID=...
```

---

## Next Steps

1. ✅ Enable **User Install** in Discord Developer Portal
2. ✅ Update commands to include `.setContexts()` (batch update coming)
3. ✅ Run `pnpm run deploy` to register with Discord
4. ✅ Test with user-install link
5. ✅ Monitor tilt detection in logs

See **DISCORD-BOT-INVITE.md** for complete setup guide.
