<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 -->

# OAuth Playbook — Discord Callback Consolidation

Single reference for Discord OAuth redirect URIs across TiltCheck surfaces.

## Canonical production callbacks

| Surface | Redirect URI |
|---------|----------------|
| Web login | `https://api.tiltcheck.me/auth/discord/callback` |
| User dashboard | `https://api.tiltcheck.me/auth/discord/callback` (shared gateway) |
| Chrome extension | `https://api.tiltcheck.me/auth/discord/callback` with extension handoff cookie |

## Staging

| Surface | Redirect URI |
|---------|----------------|
| MVP staging API | `https://tiltcheck-api-production.up.railway.app/auth/discord/callback` |

## Rules

1. Register only gateway API callbacks in the Discord developer portal — never per-app localhost URLs in production apps.
2. Web and dashboard pass `redirect` query param; API validates against allowlist before setting cookie.
3. Extension uses web login bridge; do not add a third Discord application for extension-only OAuth.
4. Local dev: set `SKIP_DISCORD_LOGIN=true` or use `http://localhost:8080/auth/discord/callback` on a single dev Discord app.

## Verification

```bash
pnpm --filter @tiltcheck/api exec vitest run tests/routes/auth-oauth-state.test.ts
```

Closes operational scope for issue #470.
