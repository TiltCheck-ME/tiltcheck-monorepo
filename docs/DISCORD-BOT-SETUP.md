# TiltCheck Bot - Discord Developer Portal Setup

This document provides all the information needed to configure the TiltCheck bot in the Discord Developer Portal.

---

## Application Information

### Basic Info
- **Application Name:** TiltCheck
- **Application ID:** *(Your application ID from Discord Developer Portal)*
- **Public Key:** *(Your public key from Discord Developer Portal)*

### Description (Short)
```
The Degen Transparency Layer - Real-time tilt detection, fairness checks, and responsible gaming tools for gambling communities.
```

### Description (Full/About Me)
```
🎰 TiltCheck Bot - The Degen Transparency Layer

TiltCheck is a behavioral safety system for gamblers. It helps detect tilt behavior, provides fairness checks, and supports responsible play.

✨ Features:
• Real-time tilt detection in chat
• Casino fairness checks (/trust, /check)
• Cooldown reminders and nudges
• Moderator tools for responsible gaming
• Scam link detection (SusLink integration)
• Bonus tracking alerts

🛡️ Privacy-First:
• Never reads DMs
• Only active in servers where installed
• No personal data storage
• Non-custodial (never touches your funds)

📚 Commands:
/trust <casino> - Check casino trust score
/check <link> - Scan a link for scams
/cooldown - Set a personal cooldown reminder
/fairness - View fairness analysis
/help - Show all commands

🔗 Links:
Website: https://tiltcheck.me
Discord: https://discord.gg/s6NNfPHxMS
GitHub: https://github.com/jmenichole/tiltcheck-monorepo

Made for degens by degens ❤️
© 2024-2025 TiltCheck Ecosystem
```

---

## Bot Settings

### Bot Tab Configuration

| Setting | Value |
|---------|-------|
| **Username** | TiltCheck |
| **Icon** | *(Upload TiltCheck logo)* |
| **Banner** | *(Optional - Upload banner image)* |
| **Public Bot** | ✅ Enabled |
| **Require OAuth2 Code Grant** | ❌ Disabled |

### Privileged Gateway Intents

| Intent | Status | Reason |
|--------|--------|--------|
| **Presence Intent** | ❌ Disabled | Not needed |
| **Server Members Intent** | ❌ Disabled | Not needed |
| **Message Content Intent** | ✅ Enabled | Required for tilt detection in chat messages |

> ⚠️ **Note:** Message Content Intent requires verification for bots in 100+ servers.

---

## OAuth2 Settings

### Redirect URLs
```
https://tiltcheck.me/auth/discord/callback
https://tiltcheck.me/dashboard
http://localhost:3000/auth/discord/callback (development)
```

### Default Authorization Link

**Authorization URL Format:**
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878024768&scope=bot%20applications.commands
```

### Bot Permissions (Integer: 274878024768)

| Permission | Included | Reason |
|------------|----------|--------|
| Read Messages/View Channels | ✅ | View messages for tilt detection |
| Send Messages | ✅ | Respond to commands and send alerts |
| Send Messages in Threads | ✅ | Reply in thread discussions |
| Embed Links | ✅ | Send rich embeds for trust scores |
| Attach Files | ✅ | Share reports and charts |
| Read Message History | ✅ | Analyze conversation context |
| Add Reactions | ✅ | React to acknowledge messages |
| Use External Emojis | ✅ | Use custom status emojis |
| Use Slash Commands | ✅ | Register and respond to slash commands |

### Scopes Required
- `bot` - Add bot to servers
- `applications.commands` - Register slash commands

---

## Slash Commands

Register these commands in the Discord Developer Portal or via API:

### /trust
```json
{
  "name": "trust",
  "description": "Check the trust score for a casino",
  "options": [
    {
      "name": "casino",
      "description": "Casino name or domain to check",
      "type": 3,
      "required": true
    }
  ]
}
```

### /check
```json
{
  "name": "check",
  "description": "Scan a link for scams or suspicious content",
  "options": [
    {
      "name": "url",
      "description": "The URL to scan",
      "type": 3,
      "required": true
    }
  ]
}
```

### /cooldown
```json
{
  "name": "cooldown",
  "description": "Set a personal cooldown reminder",
  "options": [
    {
      "name": "duration",
      "description": "Cooldown duration (e.g., 30m, 1h, 2h)",
      "type": 3,
      "required": true
    },
    {
      "name": "reason",
      "description": "Optional reason for the cooldown",
      "type": 3,
      "required": false
    }
  ]
}
```

### /fairness
```json
{
  "name": "fairness",
  "description": "View fairness analysis for a casino or game",
  "options": [
    {
      "name": "target",
      "description": "Casino or game to analyze",
      "type": 3,
      "required": false
    }
  ]
}
```

### /help
```json
{
  "name": "help",
  "description": "Show all TiltCheck commands and features"
}
```

### /settings
```json
{
  "name": "settings",
  "description": "Configure TiltCheck for this server (Admin only)",
  "default_member_permissions": "32"
}
```

---

## Installation Links

### Invite Bot to Server
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878024768&scope=bot%20applications.commands
```

### Support Server
```
https://discord.gg/s6NNfPHxMS
```

### Website
```
https://tiltcheck.me
```

---

## Webhook Configuration (Optional)

If using webhooks for event notifications:

### Interactions Endpoint URL
```
https://api.tiltcheck.me/discord/interactions
```

> Configure this in the "General Information" tab if using HTTP-based interactions.

---

## Verification Requirements

For bots in 75+ servers, Discord requires verification:

### Required Information
1. **Bot Description** - Provided above
2. **Privacy Policy URL** - `https://tiltcheck.me/privacy`
3. **Terms of Service URL** - `https://tiltcheck.me/terms`
4. **Team/Developer Verification** - Complete ID verification

### Data Handling Declaration
- ✅ Bot does NOT store personal user data
- ✅ Bot does NOT share data with third parties
- ✅ Bot only processes messages in opted-in servers
- ✅ Bot complies with Discord ToS and Developer Policy

---

## Environment Variables

Required environment variables for the bot:

```env
# Discord API
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_PUBLIC_KEY=your_public_key_here

# OAuth2
DISCORD_REDIRECT_URI=https://tiltcheck.me/auth/discord/callback

# API Endpoints
TILTCHECK_API_URL=https://api.tiltcheck.me
```

---

## Brand Assets

### Bot Avatar
- Size: 1024x1024 px minimum
- Format: PNG or JPG
- Style: TiltCheck logo on dark background

### Server Banner (Optional)
- Size: 960x540 px
- Format: PNG or JPG

### Embed Color
- Primary: `#00FFC6` (TiltCheck cyan/green)
- Error: `#FF5252` (Red)
- Warning: `#FFB74D` (Orange)
- Success: `#4CAF50` (Green)

---

## Support & Links

| Resource | URL |
|----------|-----|
| Website | https://tiltcheck.me |
| Discord Server | https://discord.gg/s6NNfPHxMS |
| GitHub | https://github.com/jmenichole/tiltcheck-monorepo |
| Twitter/X | https://x.com/tilt_check |
| Ko-fi | https://ko-fi.com/jmenichole0 |
| LinkedIn | https://linkedin.com/in/jmenichole0 |

---

*© 2024-2025 TiltCheck Ecosystem. All Rights Reserved.*
*Created by jmenichole (https://github.com/jmenichole)*
