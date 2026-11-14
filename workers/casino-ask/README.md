<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 -->

# casino-ask (draft, not deployed)

Answers questions like "How long does Acebet take to redeem?" for the Ask box on tiltcheck.me/casinos/ and the Discord `/ask` command.

## Where answers come from

Only these, and every answer links the page it came from:

1. The casino's own published pages (terms, rules, help), listed in `src/sources.js` `OFFICIAL_PAGES`. Fetched live, text cached 6 hours.
2. TiltCheck's audit data, `apps/web/src/data/casinos.json` (the cards on tiltcheck.me/casinos/).
3. CollectClock player reports, `GET /casino-reports/summary` on collectclock-api (only shown once 3+ players report the same thing).

When none of them say, the answer is "I don't know", with the pages that were checked.

## How an answer is made

1. Find the casino named in the question (`findCasinos`). No casino, no answer.
2. Read its sources, cut them into passages, keep the 6 that best match the question (`selectExcerpts`).
3. If a word in the question appears in none of the sources (for example "freeze" for Acebet), the answer is "I don't know". The model can't override this.
4. Otherwise Groq (`llama-3.3-70b-versatile`, temperature 0, JSON out) answers from those passages only.
5. The reply is checked before anyone sees it: it has to cite passages it was given, and every number in it has to appear in those passages. A reply that fails either check becomes "I don't know".

Settled answers are cached 10 minutes per question. Rate limit: 6 questions a minute per IP on the web, per user on Discord.

## Endpoints

| Route | Use |
| --- | --- |
| `POST /ask` `{"question": "..."}` | The Casinos page. CORS for tiltcheck.me, www.tiltcheck.me, tiltcheck-me.github.io, localhost. |
| `POST /discord/interactions` | Discord `/ask`. Requests must carry Discord's Ed25519 signature. Defers, then edits the reply with the answer. |
| `GET /health` | `{ ok, ready }`, where `ready` means the Groq key is set. Never returns the key. |

Response: `{ status: answered | unknown | no_casino | offline | error | limited | invalid, answer, nearest, sources: [{title, url}], checked: [{title, url}], cached }`.

## Add a casino

Add an entry to `OFFICIAL_PAGES` with pages on the casino's own domain that a plain fetch can read. Check a page first:

```bash
curl -sL -A "Mozilla/5.0" https://acebet.cc/redemptions | node workers/casino-ask/scripts/page-text.mjs
```

The terms pages tried on 2026-11-13 for Chumba, Pulsz, WOW Vegas, McLuck, Stake.us and Crown Coins came back as an empty app shell, a 404 or a 403 to a plain fetch, so they are not listed yet (their help centers may work; not checked). Questions about them still use TiltCheck's audit data and player reports.

## Checks

```bash
pnpm --filter @tiltcheck/casino-ask test    # node --test, no network
pnpm --filter @tiltcheck/casino-ask build   # syntax check
```

## Going live (needs Jamie's OK, nothing below has been run)

1. Worker: from `workers/casino-ask`, `npx wrangler@4 secret put GROQ_API_KEY` (the existing Groq key), set `DISCORD_PUBLIC_KEY` in `wrangler.toml` (TiltCheck app, General Information), then `npx wrangler@4 deploy`. The URL it gets, `https://tiltcheck-casino-ask.j-chapman7.workers.dev`, is what the Casinos page calls (`CASINO_ASK.endpoint` in `scripts/pages-product-data.mjs`).
2. Casinos page: ships with the next Pages build from main.
3. Discord: set the TiltCheck app's Interactions Endpoint URL to `https://tiltcheck-casino-ask.j-chapman7.workers.dev/discord/interactions`. Every slash command of that app then comes here, so check first that nothing else (an Activity entry point set to "app handles it", an old gateway bot) still needs them.
4. Register `/ask` in a test server first: `DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/register-command.mjs --guild <server id>`. Global registration needs `--global --confirm-production`.
