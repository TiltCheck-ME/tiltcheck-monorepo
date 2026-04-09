[//]: # (© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09)

# CollectClock Discord Activity

The CollectClock hub as a Discord Embedded App Activity.

## What it does

- Shows daily sweepstakes/social casino bonus links (data from CollectClock)
- Social claim tracking — see who in the voice channel has claimed each bonus
- Stake Instagram drop prediction based on historical patterns
- Runs inside Discord voice channels via the Embedded App SDK

## Architecture

Activity front-end (this directory) <-> TiltCheck API (/api/bonuses) <-> CollectClock JSON data

API calls are proxied through the Discord proxy sandbox via patchUrlMappings:
  /api -> https://api.tiltcheck.me

If the API returns a non-200, the activity falls back to the CollectClock GitHub raw JSON:
  https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json

## Setup

1. Register a Discord application at https://discord.com/developers/applications
2. Enable the Activity feature for the application
3. Set the DISCORD_CLIENT_ID environment variable
4. Build with Vite: `vite build apps/discord-bot/src/activity/`
5. Host the built files at a public HTTPS URL
6. Set the Activity URL proxy target in the Discord developer portal

## Development

The activity uses @discord/embedded-app-sdk for OAuth and channel context.
All API calls route through the Discord proxy (patchUrlMappings /api -> https://api.tiltcheck.me).

Claim state is stored in localStorage keyed by userId + brand + date.
The MARK CLAIMED button fires POST /api/bonuses/claim (fire-and-forget, no backend required yet).

## Build Note

This activity requires a bundler (Vite recommended). No bundler is included in the
discord-bot package.json — add Vite as a devDependency in a dedicated activity package
or run the build separately before deploying to the Discord developer portal.

Made for Degens. By Degens.
