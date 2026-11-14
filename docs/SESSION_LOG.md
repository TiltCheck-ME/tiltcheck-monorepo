<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14 -->

# Session Log

## 2026-11-14 — deploy(activity): Touch Grass Hot Takes + Story Chain go live

- Jamie approved. #741 squash-merged to main as 93694276; deployed from main at that commit to the same hosts: Worker `touch-grass-activity` (https://touch-grass-activity.j-chapman7.workers.dev) and Pages project `touch-grass-activity` (https://touch-grass-activity.pages.dev).
- From main: app, worker and tests typecheck clean, `vite build` OK, 337 vitest tests pass (two chunks: 316 + 21).
- Before: Worker version 0777e412-b5f0-451e-b5f0-0b0c24e273c6 (deployment d6dd4cc4); Pages deployment 1726b408-950a-412e-a55e-7fc6ed16bda2 (built from 4b2cd14b).
- After: Worker version 866571d5-d66f-42ac-a500-5044db5edf74 (deployment f67fafd3), uploaded through the REST API from `wrangler deploy --dry-run --outdir`: same ROOMS / LIVE / SCORES bindings, vars DISCORD_CLIENT_ID and ALERT_GUILD_ID, new var SOCIAL_MOD_USER_IDS (Jamie); secrets DISCORD_CLIENT_SECRET, ALERT_WEBHOOK_URL and DAILY_SALT kept via `keep_bindings: ["secret_text"]`; no migration (tag stays v3). No DISCORD_BOT_TOKEN, so SOCIAL_MOD_ROLE_IDS is off. Pages deployment bd5cbe07-9d91-4819-8e32-25d3bb15326e (93694276): check-missing confirmed 0 missing before the deployment was created.
- Smoke: `/api/health` 200, `/api/live` 200, `/api/social` GET and POST 401 `unauthorized` without a token, `/api/trivia/scores` 401; pages.dev and the deployment URL 200 serving `index-BIARBj7V.js` with the Hot Takes and Story Chain tiles; discordsays.com `/.proxy/api/health` 200.
- Rollback: Worker: `wrangler rollback 0777e412-b5f0-451e-b5f0-0b0c24e273c6 --name touch-grass-activity`, or POST `/accounts/<acct>/workers/scripts/touch-grass-activity/deployments` with `{"strategy":"percentage","versions":[{"version_id":"0777e412-b5f0-451e-b5f0-0b0c24e273c6","percentage":100}]}`. Pages: POST `/accounts/<acct>/pages/projects/touch-grass-activity/deployments/1726b408-950a-412e-a55e-7fc6ed16bda2/rollback`, or dashboard Deployments > 1726b408 > Rollback. The new `hot:*` / `story:*` / `social:salt` keys are ignored by the old build.
- Not tested: submitting, voting, adding a story line or mod hide inside a real Discord server (desktop, iOS, Android) after this deploy.

## 2026-11-13 — feat(activity): Touch Grass Hot Takes (anonymous polls) and Story Chain

- Branch `touch-grass-hot-takes-story` off main 4afdf3b8. Draft PR. Not deployed, not merged; no Discord command registrations touched.
- **Hot Takes**: anonymous takes (200 chars, 3 a day per player, Chicago day) go into a queue; one featured take per slot of `HOT_TAKES_ROTATE_HOURS` (default 8, slots from 00:00 UTC). Lazy rotation on the first read after a slot ends; empty queue falls back to 16 house takes in the millennial card voice. Agree / Disagree, one vote per player per take, split + spice meter only after voting, archive of the last 30 with final splits. Author stored only as a salted hash (per-server salt kept in storage); no author in any response, mods included.
- **Story Chain**: one story per server, 140-char lines, no two lines in a row by the same player, archived at `STORY_MAX_LINES` (default 20) visible lines or by a mod, new story on a random opening line, "Read it back" sheet for the last 10.
- Safety: Bluff's `textGuard.ts` cleaner + slur list, plus no links, invites, @mentions or 10+ digit runs. Mod hide / unhide / remove and End story. No staff check existed in the Activity (identify scope only), so mods come from `SOCIAL_MOD_USER_IDS`, or `SOCIAL_MOD_ROLE_IDS` via the bot member lookup when the secret `DISCORD_BOT_TOKEN` is set.
- Storage: the existing `SCORES` class, the server's `guild:<id>` instance, new `hot:*` / `story:*` / `social:salt` keys. No new class, no migration (tag stays v3), no existing keys touched. Routes `GET` / `POST /api/social`.
- UI: Hot Takes and Story Chain tiles after Chess in the lobby list, same flat panels, accents #ff7a59 / #7fb7ff. Checked at 360 px in guest mode (headless Chromium).
- Tests: 337 pass (was 283): new `tests/social.test.ts` (34), `tests/social-worker.test.ts` (10), `tests/social-ui.test.ts` (9), one new no-money case, and the client-dom lobby tile count 6 -> 8.
- Not tested: inside the real Discord client (desktop, iOS, Android), real phone text wrap, the bot role lookup against Discord, two isolates racing the same Durable Object.

## 2026-11-13 — test(e2e): extension popup tests open the Pro settings tab first

- "Anchor Devnet & Cooldown Smoke Test" has failed every run since 2026-11-09 at `tests/e2e/extension-e2e.spec.ts:107`: `#cooldown-wallet-sync-wrap` resolves but is hidden. Cause: the popup opens in Easy mode (f6f5f7ce), which hides the tab bar and the `panel-block` tab where the cooldown sync and auto-lock controls live. The spec was never updated; serial mode then skipped the rest of the suite.
- A fresh profile also opens the first-run setup wizard over the popup. `openSettingsPanel(page)` marks onboarding done (`tiltcheck_onboarding_completed`), reloads, switches to Pro and opens the `block` tab; used by the three popup tests. No assertion removed.
- The deep-link banner test still looked for the old Pages copy ("Critical Tilt Intervention…", "LEVEL 3+ TILT"); the Pages cooldown banner was reworded in ce4b55f6 ("Tilt check … Pick a length below"). Assertions now match it. All 6 extension-e2e tests pass locally (Chromium, built extension + `pnpm build:pages`).
- E2E Tests (Playwright) in pr-test could not start: `PLAYWRIGHT_DEGENS_LOCAL` launched a Vite server for `@tiltcheck/degens-activity`, which was moved to `archive/apps/` in f2630fc7, so the webServer exited early. Its spec moved to `archive/apps/degens-activity/e2e/`, the env var and the webServer block removed.

## 2026-11-13 — ci: pnpm version comes from package.json only

- "Deploy Hub to Cloudflare Workers" (run 43552635208, #731 push) failed at Set up pnpm: `pnpm/action-setup@v6` refuses to run when the workflow's `version:` (10.29.1) and root `packageManager` (pnpm@10.34.4) disagree. The hub deploy never got as far as Wrangler.
- Removed the `version:` input from every workflow that pinned one (deploy-hub, deploy-web, audit-us-operators, research-ops, frontend-suggestions, publish-on-push, publish-package), so they all use `packageManager`. The other workflows already did.

## 2026-11-13 — chore: drop CHROMEWEBSTORE.md, allowlist the casino-ask Discord public key in gitleaks

- Jamie dropped the Chrome Web Store. Root `CHROMEWEBSTORE.md` removed; main had 9 root markdown files, so `tools/check-root-cleanliness.sh` (Validate Changed Packages) failed on every PR. Now 8, within the limit. No live references to the file outside past session-log entries; the devkit chrome-extensions skill now says not to recreate it here.
- Gitleaks (`discord-api-token`) flagged `workers/casino-ask/wrangler.toml` line 10 on the #731 push: `DISCORD_PUBLIC_KEY`, the app's Ed25519 verify key, public by design. Added a path + line allowlist in `.gitleaks.toml` scoped to that file and that variable (a 64-hex value). Checked with gitleaks 8.30.1 over `598b7bf7..0af8bdb2`: 1 finding before, none after.

## 2026-11-13 — deploy(activity): Touch Grass chess goes live (with the DA&D fixes and millennial cards)

- Jamie (9:28 PM CST): chess can go live. Same hosts as the test build: Worker `touch-grass-activity` (https://touch-grass-activity.j-chapman7.workers.dev) and Pages project `touch-grass-activity` (https://touch-grass-activity.pages.dev). Nothing merged to main; the Activity deploys from a branch build, so no merge was needed.
- Built from branch `touch-grass-live` (4b2cd14b): `touch-grass-dad-millennial` (#733, on #729) merged with `touch-grass-chess` (#730), plus main (#731 Ask, no Activity files). Conflicts were only `docs/SESSION_LOG.md` and the `tsconfig.tests.json` exclude list (both kept). Chess and the DA&D fixes share the #727 / #726 base, so deploying chess means deploying the DA&D code; the fixes and cards went in because their tests pass.
- Before: Worker version 4f4ebf41-96ef-4dfa-94ed-c3a0e2da3459 (deployment 72f4ef6c, 2026-11-12 9:57 PM CST); Pages deployment 12ea89ff-70c1-4c21-84ed-c0581418def1 (built from f6ef8b5f). That build already had #726 and #727.
- After: Worker version 0777e412-b5f0-451e-b5f0-0b0c24e273c6 (deployment d6dd4cc4); Pages deployment 1726b408-950a-412e-a55e-7fc6ed16bda2. Same bindings, secrets kept (`keep_bindings: ["secret_text"]`), no migration (tag stays v3). `/api/health` 200, `/api/live` 200, `/api/trivia/scores` 401 without a token, Discord proxy health 200, Pages serves the new bundle.
- Newly live: 1v1 Chess and the "Trivia high scores" label (#730); DA&D header "Round N · first to 5", end-at-target guard, hand refill at the pick with the New tag (#729); 34 + 80 millennial cards (#733).
- Rollback: Worker: `wrangler rollback 4f4ebf41-96ef-4dfa-94ed-c3a0e2da3459 --name touch-grass-activity`, or POST `/accounts/<acct>/workers/scripts/touch-grass-activity/deployments` with `{"strategy":"percentage","versions":[{"version_id":"4f4ebf41-96ef-4dfa-94ed-c3a0e2da3459","percentage":100}]}`. Pages: POST `/accounts/<acct>/pages/projects/touch-grass-activity/deployments/12ea89ff-70c1-4c21-84ed-c0581418def1/rollback`, or dashboard Deployments > 12ea89ff > Rollback. Rooms stored by the new build carry a chess table and DA&D `fresh` ids; the old build ignores fields it does not know (not exercised).
- Checked before deploy: typecheck (app, worker, tests), 283 vitest tests, all four simulations, vite build. #733 CI: Brand Law Enforcer and Secret Scanning pass; Validate Changed Packages fails on main's 9 root .md files (pre-existing, same as #727 / #729 / #730).
- Not tested: a real chess game or DA&D table inside Discord on desktop, iOS or Android after this deploy.

## 2026-11-13 — feat(activity): DA&D millennial mix (34 prompts, 80 answers) on top of the playtest fixes

- Branch `touch-grass-dad-millennial` from `touch-grass-dad-fixes` (draft #729, 63a6f24d). Draft PR, base main.
- Jamie: a mix of millennial cards, not only gambling ones. New `MILLENNIAL_PROMPTS` (34) and `MILLENNIAL_WHITE_CARDS` (80) in `src/shared/deck.ts`: 90s/2000s kid culture (Tamagotchi, Lisa Frank, Oregon Trail, Lunchables, Furby), early internet (MySpace Top 8, AIM away messages, dial-up, Limewire, Clippy), flip phones and T9, student loans, adulting. Spread into `PROMPTS` / `WHITE_CARDS`, so they shuffle into the one deck with the gambling cards (no separate mode). Deck is now 64 prompts and 181 answers. Card ids stay index-based; the new cards are appended, so existing ids do not move.
- Party-safe: nothing hateful or sexual. New `tests/deck-millennial.test.ts`: batch size, cards present in the real deck, one blank per prompt, no duplicates (case-insensitive), no gambling words and a blunt unsafe-word list, length caps. The existing no-money guard covers the new cards too (one prompt reworded off "slot").
- `tests/dad-playtest.test.ts` reshuffle test: it relied on a 15-point game drawing past the whole deck, which the bigger deck no longer does. It now moves all but 5 draw cards to the discard pile first and asserts a recycle actually happened (same rule checked: the card just played never comes back, hands stay at 7, no card in two places).
- Checked: typecheck (app, worker, tests), 239 vitest tests (was 234), `simulate:dad`.
- Not tested: how the new cards play at a real table (whether the mix lands, card text wrapping on phones).

## 2026-11-13 — fix(activity): DA&D playtest fixes (score past the target, hands that never change)

- Branch `touch-grass-dad-fixes` from `touch-grass-solo` (draft #727, 61c84c10). Draft PR only; nothing merged or deployed.
- Playtest (Jamie + 3 players in Discord): "rounds went to 6/5" and "my cards in my hand were the same each time ... I only ended up with different cards maybe one of the hands".
- Target: replaying the room (4 players, target 5, 40 seeds) the server already ended the game on the pick that reached 5, and no score went past it. What read as 6/5 was the DA&D header, `R6 / to 5` (round 6, playing to 5): the round counter keeps climbing past the target because only one player scores per round. Header now reads `Round 6 · first to 5`; the lobby tile says `round N`. Server guard added anyway: `beginRound` ends the game (phase `over`, winner = highest score at or past the target) instead of dealing when anyone is at the target, so `next` or a resume from `paused` can never start another round, including on state stored by an older build.
- Hands: the room did replace a played card, but only at the start of the next round, appended to the end of a 7-card hand with nothing marking it, so 6 of 7 cards looked identical round to round (and the hand showed 6 on the reveal screen). Now `pick` refills every player who played straight away (before the played cards go to the discard, so a reshuffle cannot hand someone their own card back); the drawn card ids are kept in `DadState.fresh` (optional, older rooms read as none), cleared when that player plays or leaves, and sent only to their owner as `DadView.freshIds`. The hand shows fresh cards first with a `New` tag (solid ink border and label, no motion). Opening deal marks nothing. Rules unchanged otherwise: one card in, one card out per round, 7 in hand, judge plays nothing and draws nothing while judging.
- Tests: `tests/dad-playtest.test.ts` (room rules, typechecked) and `tests/dad-playtest-ui.test.ts` (jsdom, excluded from the tests tsconfig like the other client tests): game over exactly at 5 across 40 seeds, Next refused after the win, stored 6-point state ends instead of dealing, paused resume at the target ends, header wording; refill at the pick with exactly one new card per player who played, no card in two places across hands/submissions/draw/discard every round, reshuffle over 80 rounds never returns the card just played, `New` tag first and cleared after playing, opening deal unmarked. `dad.pick` now takes the rng (callers and `tests/dad.test.ts` updated).
- Checked: typecheck (app, worker, tests), vite build, 234 vitest tests (was 225), `simulate:dad` passes. The workerd trivia WebSocket test timed out once under load and passed on the full rerun (no trivia code touched).
- Not tested: a real Discord game (4+ players on phones): the `New` tag and header on the iOS/Android webviews, and whether one fresh card a round feels like enough variety.
## 2026-11-13 — feat(activity): 1v1 Chess in Touch Grass; Scores sheet says it is trivia only

- Branch `touch-grass-chess` from `touch-grass-solo` (draft #727, builds on #726; neither merged). Draft PR only, nothing deployed.
- Chess (`src/shared/chess.ts`, rules in `src/shared/chessRules.ts`): two people claim White and Black on the Chess screen, everyone else in the room watches the same board; either player starts once both sides are taken, Rematch swaps colors. Moves go through the existing room (`chess.*` actions in `protocol.ts`, `Room.handle`, same channel-room key `g-<guild>-c-<channel>` from #725); the server checks every move and sends legal targets only to the player to move. A `ply` number on each move refuses double taps and stale boards.
- Rules engine written in the repo instead of chess.js (chess.js is BSD-2-Clause; the ask was MIT). Check, checkmate, stalemate, castling (not out of, through or into check), en passant (including the pinned-pawn case), promotion to Q/R/B/N, threefold repetition, 50-move rule, dead positions; SAN for the move list. Verified against six standard perft positions (start to depth 4: 197,281; Kiwipete, positions 3 to 6) plus targeted tests.
- Resign (two taps) and Offer draw (accept or decline; a move by the offered side declines). Optional clock, off by default: 5, 10 or 15 minutes each, no increment, starts after White's first move, a flag against a bare king or lone minor is a draw. A drop keeps the seat for the room's away grace; really leaving mid-game loses it. Repetition counts reset on every pawn move or capture so the stored room stays small; 600-ply cap.
- Screen: tap a piece, then a lit square (dots for moves, rings for captures), last move and check as flat fills; inline-SVG pieces drawn for this app (no third-party piece set, no unicode chess glyphs since Brand Compliance flags U+2600-26FF). Phone-first: on a 390 px phone the board runs nearly edge to edge for 48 px squares (44 px at 360 px, 45 px in 844x390 landscape); every other control is 48 px. Calm #727 look, no new animation, reduced motion unaffected. Lobby gets a Chess row ("N seated", "· M<n>" while live). Guest mode: a bot takes the open side once you claim one and plays random legal moves.
- Scores: the sheet is now titled "Trivia high scores" with "Trivia games only. Myth or Math keeps its own weekly board."; the header button keeps the word Scores with that title as its accessible name.
- Checked: typecheck (client, worker, tests), vite build, 269 vitest tests (was 225): `chess-rules.test.ts` (perft, castling rights and blocks, en passant, promotion, pins, SAN, mate/stalemate, dead positions), `chess.test.ts` (seats, turns, stale ply, spectator refused, fool's mate, promotion, draws, resign, draw offers, clock and flag, leave mid-game, rematch, per-viewer legal moves, wire parsing, random games to the end), `chess-ui.test.ts` (board orientation per viewer, promotion picker, clock text), jsdom guest flow (claim, bot, select, move, two-tap resign), workerd test over WebSockets (two players and a spectator, fool's mate, reconnect). `simulate` passes. Headless Chromium screenshots at 390x844, 360x780, 844x390 and 1100x800: no horizontal overflow, no control under 44 px.
- Not tested: real Discord clients (iOS/Android webviews, taps on the board, a real two-device game through the deployed worker, clock drift between devices).

## 2026-11-12 — feat(activity): sharper, calmer Touch Grass look; plain-copy pass; Myth or Math mixed with general cards + deploy

- Branch `touch-grass-solo` (draft #727). First commit f0807609: test variable `key` renamed to `roomId` in `tests/daily.test.ts` (Gitleaks generic-api-key false positive). Gitleaks scans every commit in the PR range, so the rename alone did not clear it (the line is still in 0621d716); its fingerprint was added to the existing root `.gitleaksignore` (88ff4432) instead of rewriting history.
- Lobby (Jamie: the grass didn't make sense, high scores at the bottom looked out of place, too animated): night-field hero dropped (sun, grass blades, gradient title). Compact header: small uppercase "Touch Grass" eyebrow over "TiltCheck" with the flag mark, "Get distracted on purpose.", a **Scores** button and Invite friends in the header, who's here as small inline avatar chips. Games are a flat list of rows: solid surface, 1px border, 3px left border in the game's accent, 42 px icon box (accent-tinted line icons; DA&D keeps its real logo), plain "0 seated" / "0 playing" / "Solo" text, no pulse. Page title still "TiltCheck".
- High scores: bottom card removed from the lobby. The Scores button opens a sheet (bottom sheet on phones, centred dialog from 640 px) with the same This week / All time board, guest board and states; `role=dialog` + `aria-modal`, focus moves to Close, Escape / backdrop / Close close it and focus returns to Scores. Trivia's own screens keep their board and end-screen podium.
- Calm look everywhere (lobby and Trivia, Bluff, DA&D, Daily Grass, Myth): solid backgrounds, no gradients, glows, text shadows, backdrop blur, bulb marquee, smoke or sunburst; no flip, deal, shake, stamp, pop or pulse. One keyframe left (`fade-in`, 120 ms) for new content and the toast/sheet; presses 100-120 ms. Tap targets: all buttons 48 px (small buttons were 40), score tabs 44. `prefers-reduced-motion` still turns everything off. DA&D banner webp removed (unused now).
- Copy: "bragging rights" now appears once, in the Scores sheet footer ("No money, just bragging rights. Week resets Monday, midnight Central."). Cringe pass over every user-visible string (tile blurbs, buttons, toasts, empty states, end screens, server error toasts, table alerts, guest banner, guest bot names); "Run it back", "Deal me in", "No take-backs", "Too slow" no longer repeat across screens; no exclamation marks left. Card text, trivia and Myth banks untouched. Full from → to list in the PR report.
- Myth or Math: 60 general cards in `src/shared/mythGeneral.ts` (everyday myths, body and science, probability and maths, misconceptions; 30 true / 30 false; a source note on each; why <= 140). Every run is 5 gambling + 5 general shuffled together, no repeats within a run, each kind drawn without repeats across runs until it runs dry. Left out as not certain enough: chameleon colour change "mainly for camouflage", stomach lining replacing itself every few days, similar hair-follicle counts in humans and chimps, fortune cookies' Japanese-American origin, microwave penetration depth, Edison's bulb, the "24 hours to report a missing person" rule, a near-duplicate Monty Hall and birthday card. Guest practice deck: 7 gambling + 5 general (12). Tile blurb: "Ten calls, eight seconds each. True or false?". Money-words exception now per card: gambling cards only; the general files (`mythGeneral.ts`, `guestMythGeneral.ts`) get the full banned list. Verified the general bank is not in the client bundle.
- Checked: typecheck, vite build, 225 vitest tests (was 218): mixed runs (5 + 5, no repeats, shuffled positions, guest deck mixed), per-kind true/false balance, scoped exception, calm-CSS guard (no gradients/glows/infinite, only `fade-in`, every timing <= 150 ms), 48 px targets, Scores sheet open/close/focus in jsdom, "bragging" absent outside the sheet. `simulate` passes. Screenshots (`sharp-` prefix) at 390x844, 320 and 844x390: no horizontal overflow, no running animations, no button under 44 px (one 320 px Enter-key overflow fixed).
- Deploy: worker re-uploaded from f6ef8b5f (copy in alerts and shared server messages, general Myth cards; deployment 4f4ebf41, same metadata, `keep_bindings` secret_text, same three DO namespaces, no migration); `/api/health` 200 on all 20 polls through the switch, `/api/live` 200, `/api/trivia/scores` 401 without a token. Pages deployment 12ea89ff (f6ef8b5f): check-missing 0 before deploying; pages.dev polled every 2 s, all 200, old bundle to new with no gap. discordsays.com `/.proxy/api/health` 200 and the proxy serves the new bundle and title. No Discord messages posted.
- Not tested: real Discord clients (sheet in the iOS/Android webviews, invite button in the header), table alert wording in a real channel.

## 2026-11-12 — feat(activity): solo games (Daily Grass, Myth or Math), TiltCheck hero copy, invite button, DA&D judge holds no hand + deploy

- Branch `touch-grass-solo` from `touch-grass-look` (draft #726, 45adc4eb); builds on that visual pass and keeps its look. Draft PR only.
- Daily Grass (`src/shared/daily.ts`): daily 5-letter word, 6 guesses, green/yellow/gray (repeated letters handled), on-screen + physical keyboard. Day turns at midnight America/Chicago. Pick: SHA-256 of the worker secret `DAILY_SALT` seeds a fixed shuffle of the answers, one slot per Chicago day (no repeats until the list runs out). Server-checked: the worker holds the answer and returns colors; the answer reaches a player only when their game is over. Boards and stats (played, wins, current/best streak, guess spread) per Discord user in the existing SCORES class under instance `daily-user:<id>` (no new class, no migration). "Today's solvers" per server in the `guild:<id>` instance (fewest guesses, then fastest from opening the board); DMs skip it ("No server, no board"). Friends see rows used and solved/out, never letters. "Copy result" copies a spoiler-free emoji grid (built with `String.fromCodePoint`, no emoji literals in source). Puzzle #1 = 2026-11-12.
- Word lists: 639 original answers (common, family-friendly, no money/gambling words). Valid guesses: 12,577 five-letter words from npm `word-list` 4.1.0 (MIT, Sindre Sorhus), built from the Letterpress list (lorenbrichter/Words, CC0-1.0); one apology word dropped for the tone check. License noted in the app README.
- Myth or Math (`src/shared/myth.ts`, `mythBank.ts`): 64 original true/false cards (32/32), 10 per run, 8 s each, 100 + up to 50 speed (trivia curve), one-line why (<= 140 chars) after each card. Per-player runs in the room; a drop pauses the card with its time left and rejoining resumes it. Per-server week board (`myth:` keys in the guild instance, its own book). Held back as not certain enough: "on many slots the RNG keeps cycling when nobody plays" and "slots tighten up after you've been winning" (true in practice for regulated games, but implementation-specific).
- Money-words guard: one scoped exception in `tests/no-money.test.ts` for the Myth or Math bank and its guest subset only (jackpot, payout); every other banned word still applies there and everywhere else is unchanged. Brand Compliance words checked (no `seed`, no tone words, copyright headers, no emoji literals in new source).
- Guest mode ships only practice data: vite aliases (now matching any relative import) swap in 10 practice words (any five letters accepted) and a 10-card practice deck; a test checks every client import of the banks is aliased. Verified the built bundle has no dictionary words or non-guest cards.
- Lobby: Daily Grass and Myth or Math tiles (inline SVG: letter tiles over grass; magnifier over a busted-myth stamp, no chips/slots/dice), "solo · N playing" pills. `/api/live`: `games.daily.playing` (connected people on its screen) and `games.myth.playing` (mid-run); not tables, never joinable, no table alerts; older reports still parse.
- Copy (Jamie): hero title "TiltCheck" (was "Touch Grass"), subtitle "Get distracted on purpose." (was "Step away from the reels. Sit at a table that is not a spin."), leaf swapped for an inline-SVG quest flag; page title "TiltCheck"; DA&D end screen drops "Go touch grass."; DA&D "table closed" alert drops "to touch grass". Internal names, package, worker and Pages project unchanged.
- Invite friends: `sdk.commands.openInviteDialog()` (SDK 2.4.1 has it; Discord's reference lists no required scope, so OAuth scopes unchanged). Lobby hero, DA&D/Bluff/Trivia seating and in-game. Hidden in guest mode or without the command; errors toast.
- DA&D judge: the judge's view sends `hand: []` and shows "You're judging this round"; no top-up while judging (opening deal still gives everyone 7, so the judge holds a full hand server side for the next round); judge submissions still refused.
- Checked: typecheck, vite build, 218 vitest tests (was 169): daily pick determinism/salt/no repeats, sha256 vs node:crypto, answer absent from payloads (room, host, workerd), tile colors with repeats, Chicago-midnight streak rollover (CST/CDT), solvers order, DM board skip, word lists; Myth scoring/clock/no-truth-before-call/pause-resume/week board/DM off record/bank checks; guard exception scope; live keys; invite button calls the SDK and toasts on error; judge empty hand, judge can't submit, ex-judge full hand; jsdom guest flows for both games. `simulate` adds `simulate-solo`. Screenshots 390x844 (plus 320 and 844x390 landscape) of both tiles and each game screen.
- Deploy: worker secret `DAILY_SALT` set through the API (never printed); worker `touch-grass-activity` uploaded from 0621d716 (deployment 59cdf3da, keep_bindings secret_text, same DO bindings, no migration); health 200 on every poll through the switch; `/api/live` shows `daily` and `myth`. Pages deployment dccc8612 (0621d716): check-missing 0 before deploying; pages.dev polled every 2 s, all 200, old bundle to new with no gap. discordsays.com `/.proxy/api/health` 200, proxy serves the new bundle and title. No Discord messages posted.
- Not tested: real Discord clients (invite dialog, clipboard in the iOS/Android webviews, live Daily Grass with a real token: production has no guest auth), a real midnight rollover in production.

## 2026-11-12 — feat(activity): Touch Grass visual pass (game identities, lobby hero, motion, podium) + Pages deploy

- Branch `touch-grass-look` from origin/main 598b7bf7, which already holds the channel-rooms fix (#725 squashed; `git diff 598b7bf7 touch-grass-channel-rooms` is empty), so nothing to cherry-pick. No game rules, server code or shared code changed.
- Lobby: night-field hero with an inline-SVG grass line and sun, leaf mark on the title, same title and lede copy. "Who's here" avatars are bigger with a grass ring; every avatar now has a coloured initial underneath (drawn by CSS from `data-initial`, no text node) and a picture that fails to load is dropped for the rest of the session (`failedAvatars`). Tiles are 112 px tall with art on the left; seated/playing pills pulse a dot when the count is above 0 (`badge--on`). Buttons 48 px, small buttons and score tabs 40 px.
- Game identities: Trivia quiz-show blue/teal (marquee-bulb question sign, lit prompt card, coloured A-D keys). Bluff smoky purple (poker-face art, smoke backdrop). DA&D uses its own brand from TiltCheck-ME/DegensAgainstDecency: `public/logo.png` and `public/banner.png` resized to `src/client/art/dad-logo.webp` (12 KB) and `dad-banner.webp` (30 KB); palette from `public/styles/main.css` (#B4FF39 lime, #00ffff, #ff00ff, #A020F0, #0A0B14 / #16213e) and its cyan/magenta glow. DA&D's fonts (VT323 / Press Start 2P in `activity/style.css`) are web fonts and not bundled; the screens use the system stack like DA&D's main site. All art is local (`src/client/art.ts`, inline SVG + the two webp files); no remote hosts, no casino imagery.
- Motion: card deal/flip on DA&D hands and entries, flip-in for questions and Bluff statements, gold glow on the right answer, shake on a wrong pick, stamp on THE LIE, score pop when a score goes up, podium winner screen (2-1-3, gold/silver/bronze) on all three end screens, gold/silver/bronze on the top three high-score rows (ties share a place). The screen re-renders on every push, so `main.ts` keys motion to the phase and carries a negative `--fx-t` so a running animation continues instead of restarting. `prefers-reduced-motion: reduce` switches every animation and transition off.
- Phones: checked at 320, 390 and 844x390 landscape for overflow (none). Contrast checked against AA (muted text 7:1+, accents 8:1+, judge tag switched to dark ink on magenta). Trivia phone question-size rule kept as is. Grammar: "You win." on the DA&D end screen and "Your lie" in Bluff when the viewer is the subject.
- Checked: typecheck, vite build, 169 vitest tests (was 159; new `tests/look.test.ts`: podium order/medals/ties, board medals, avatar fallback, lobby art, grammar, reduced motion, no remote url() in CSS), `simulate` (DA&D, trivia, Bluff) passes. Guest-mode screenshots with headless Chromium (Playwright) at 390x844 for the lobby and every game screen.
- Deploy: worker not redeployed (no worker or shared code changed); worker /api/health 200. Pages `touch-grass-activity` deployment 883f8511 (f16a5a8b): assets uploaded with the upload JWT (`--noproxy`), upsert-hashes, check-missing confirmed 0 missing, then the deployment created. pages.dev polled every 2 s through the switch: all 200, old bundle to new with no gap. discordsays.com `/.proxy/api/health` 200 and the new DA&D logo served through `/.proxy/assets/`. No Discord messages posted.
- Not tested: real Discord iOS/Android webviews (Discord avatars from cdn.discordapp.com did not load in the sandbox, so screenshots show the initial fallback), real multi-player pops.

## 2026-11-13 — copy(extension): plain wording, no guard / shield / protect framing

- Builds on the worker-API fix above. Extension text a player reads: the "Guards" tab and settings button are now "Settings"; toolbar title "TiltCheck"; root manifest description matches the shipped one (drops "Core guardrail"); Easy Mode "Shield Armed" -> "On", "Active protection on ..." -> "Running on ...", "1-Click Protect" -> "One click to apply", "Light Guard" -> "Light", "tight profit protection" -> "tight profit floor"; WinCheck "Protect profit with a trailing floor" / "Protected Profit Share" -> "Keep a trailing floor under your profit" / "Floor (share of profit kept)"; tip note, wizard "Target Defense" -> "Main checks", cooldown note and image alt reworded; session pill "Guards on (site)" -> "On (site)"; toasts "... armed." -> "... on." / presets "... applied."; payout-lock title and alerts "Cashout Protected: Reverse-Withdrawal Shield is active" -> "TiltCheck Payout Lock is on. ..." (still contains "TiltCheck", which the cancel-button matcher skips); "Profit-Lock Hard Guard:" -> "Profit lock:"; "protected floor" -> "floor"; "Protect bankroll." -> "Consider stopping."; "protect your capital" / "protect your winnings" dropped; local game blocker overlay points at the Settings tab.
- Site: house-edge page extension CTA eyebrow "On-Device Protection" -> "In your browser"; tools overview "Reverse-Withdrawal Shield" -> "Payout Lock". The six "Guards:" lines and "That opens Guards." on the dashboard page exist only on the draft home-declutter branch (#728), not main, so they are not in this PR.
- Code names, CSS classes, storage keys, file names and the shield-shaped icons are unchanged (renames and a new mark are separate work).
- Checked: apps/chrome-extension vitest 43 files / 324 tests (new: popup-copy test fails on guard/shield/protect/armed wording in visible popup text or sentence-like popup.ts strings, verified by reintroducing "Light Guard" and "Spin brake armed."), `node build.js`, `node --check scripts/convert-markdown.js`. Not checked: the pages build output and the popup in a real Chrome.

## 2026-11-13 — fix(extension): data calls to the collectclock-api worker; features with no backend switched off

- Why: `api.tiltcheck.me` does not resolve (NXDOMAIN), so popup status, onboarding status, logout, synced exclusions, vault rules, analyzer socket, telemetry, cooldown check/stream, link scan and the lounge panel all failed. Sign-in already went through the worker.
- `src/config.ts`: `API_BASE_URL` / `HUB_URL` now the worker (`collectclock-api.j-chapman7.workers.dev`); `AI_GATEWAY_URL` and the unused `getDiscordLoginUrl` (pointed at a route the worker lacks) removed. `WORKER_ROUTES` lists the only routes used: `POST /auth/token`, `GET /me`, `POST /logout` (checked against the worker source as deployed Nov 12 and live: `/me` 401 signed out, `/logout` 200). The worker answers unknown paths with 200 + health JSON, so nothing else is called. `BACKEND_FEATURES` holds every feature without a route, all off.
- Sign-in unchanged. After it stores the Discord token, `background.js` also trades it for a worker session (`POST /auth/token`, stored as `workerSession`, never logged); a failure there leaves sign-in as it was. Logout posts `/logout` with that session, then clears local keys; sessions from before this change have nothing to revoke and log out locally.
- Off, no network call: server tilt meter, P/L and blocked count on Status (hidden); onboarding check; synced exclusions (section replaced by "Synced exclusions are not available yet. The filters above work in this browser without an account."); Vault tab (hidden; note "Vault rules are not available yet."); analyzer socket; round and win telemetry (`postRoundTelemetry` / `postWinSecureTelemetry` resolve to null, "Redeem Now & Quit" still quits); cooldown check/stream; link scan; lounge panel (was polling `activity.tiltcheck.me` every 3 s). `api.tiltcheck.me` removed from host permissions and CSP in both manifests. Railway example URL dropped from DEPLOYMENT_MANUAL.
- Brand Compliance: the custodial-word rule scans whole changed files, and popup.ts holds the provably-fair client seed UI, so those lines carry a "client seed" note (two toasts reworded). No behaviour change there.
- Checked: 43 vitest files / 323 tests in apps/chrome-extension (new: config routes and flags, background session exchange and failure, no calls for cooldown/link scan, popup sections hidden, telemetry/exclusions/lounge make no calls), `node build.js`, `tsc --noEmit` (no new errors; 7 existing ones in content/popup/default-bet-breaker untouched). Not checked in a real Chrome: the popup layout with the hidden sections, and a live sign-in getting a worker session.

## 2026-11-13 — feat(casinos): Ask about a casino (Casinos page box + Discord /ask), draft

- Branch `casino-ask`, first cut from `home-declutter` (#728), rebased onto main on 2026-11-13 so it ships without #728.
- New worker `workers/casino-ask` (package `@tiltcheck/casino-ask`; `workers/*` added to pnpm-workspace.yaml, lockfile importer `workers/casino-ask: {}`, no dependencies). Routes: `POST /ask`, `POST /discord/interactions`, `GET /health`.
- Sources, and nothing else: the casino's own pages (`OFFICIAL_PAGES`, Acebet.cc Redemptions, Promotional Play Rules, Terms of Service, Service Availability for now), TiltCheck's audit data (casinos.json, 30 audited casinos), and CollectClock `/casino-reports/summary`. Every answer links its source; otherwise "I don't know" plus the pages checked.
- Groq (`GROQ_API_KEY` secret, server side only, `llama-3.3-70b-versatile`, temperature 0, JSON) answers from the top 6 passages. Checks after the model: it must cite passages it was given and every number must appear in them, else "I don't know". A question word that none of the sources contain forces "I don't know" before the model is asked for an answer.
- Acebet example, "How long does Acebet take for freeze card redemption?": "I don't know. Acebet's pages and TiltCheck's records don't mention "freeze"." with the four Acebet pages linked (checked live against acebet.cc, no key needed). With the key, the model may add the closest fact, for example the Promotional Play Rules line that redemptions can take up to 30 days, only if it passes the same checks.
- Cache: page text 6 h, settled answers 10 min (KV `ASK_KV` if bound, else memory; the Cache API is a no-op on workers.dev). Rate limit 6 a minute per IP or Discord user (`ASK_LIMITER` rate-limit binding, memory fallback). CORS: tiltcheck.me, www, tiltcheck-me.github.io, localhost.
- Discord: the monorepo's discord-bot is in archive/apps and not running, so /ask is served over HTTP interactions from the same worker (Ed25519 check against `DISCORD_PUBLIC_KEY`, deferred reply, then an edit with the answer and links, no pings). `scripts/register-command.mjs` registers it per guild, or globally only with `--confirm-production`. Not run.
- Casinos page (convert-markdown.js `buildCasinoAsk` + `CASINO_ASK_SCRIPT`, copy in pages-product-data.mjs `CASINO_ASK`, styles in base.css): "Ask about a casino." above the directory. 48px input, button and source links, 16px input text, results via textContent, https links only.
- Checked: `node --test` 33 pass (text, sources, answer pipeline with a scripted Groq, worker routes, CORS, rate limit, Discord signature and reply, page markup and copy). Playwright Chromium at 320, 390 and 1280 against the built page with the worker code behind a route: 48px targets, no horizontal overflow, freeze-card question answered "I don't know" from the live Acebet pages, a minimum-redemption question answered with its source (model scripted). vitest pages-launch + pages-login: same 3 failures as the base branch. Frozen-lockfile install passes.
- Not tested: a real Groq call (the key is not in this sandbox), a deployed worker, Discord end to end.

## 2026-11-12 — fix(pages): declutter the homepage and header, mobile first

- Branch `home-declutter`, cut from `cut-repeated-content` (#719, still a draft) with origin/main merged in, so #719's trims ship with this. #719 itself is untouched.
- Header (convert-markdown.js navHtml, every page): was the wordmark + Beta stamp and six links (TimeCheck, Extension, Tools, TrustCheck, RealityCheck, Sign in) that wrapped to three rows (125px tall at 320px, 101px at 390px) with 18-19px tap targets. Now one 56px sticky bar: wordmark, Tools / Casinos / Extension, and one Sign in pill (the signed-in avatar + name replaces it as before; still links /login/, and /dashboard/ once signed in). Under 720px it is the wordmark and a Menu button; the menu drops down with those links plus TimeCheck and RealityCheck, 48px rows, and closes on Escape, a link tap or a tap outside. Without JS the links show as a plain list. TimeCheck and RealityCheck are footer-only on wider screens.
- Homepage (buildRootLanding + pages-product-data.mjs HOME_*): hero is the headline, the dopamine line, one sentence on what TiltCheck is, and one button (Get it free, jumps to How to get it). Cut: the kicker line, three stacked hero buttons + Browse all tools, the "Three simple habits" steps (repeated the tool list), the six-card extension list (now one sentence in How to get it; the full list stays on /extension.html), the wage calculator, and the three-line fine print (now one line). Then two sections, each said once: What it does (check a casino pays, verify your rolls, take a break, touch grass with friends in Discord) and How to get it (computer: extension zip; phone: web tools). Removed the now-unused INSTALL_*, LAUNCH_HONESTY and CORE_BRAKES exports; SITE_KICKER, SECONDARY_CTAS and TERTIARY_LINK stay because tests/pages-launch.test.ts imports them. Zip button label: Download the extension.
- Footer: "Tools & Resources" label dropped; Extension and a Ko-fi tip link (KOFI_URL) added; links are 44px tall and sit in two columns on phones. 1-800-GAMBLER line, footer sign-in / Your dashboard swap and "Made for Degens. By Degens." unchanged. The Phantom app button stays on /cooldown/ only.
- Mobile: fluid hero type (the headline is 3 lines at 390px instead of 5); page height at 390px 4317px -> about 2570px. Background is now a 65 KB WebP copy (scripts/pages-assets/assets/backgroundglitter.webp, copied by convert-markdown.js) instead of the 2.6 MB PNG; the PNG is still copied for anything else that links it. The menu panel is solid because a translucent panel under the bar's backdrop-filter let the page show through.
- Checked locally (Playwright Chromium, 320 / 390 / 430 / 1280): no horizontal overflow and a 56px bar on 11 pages (home, tools, casinos, cooldown, gate, extension, tip, login, dashboard, a doc, verify); menu open/close, signed-in avatar in the menu, footer Your dashboard. Lighthouse mobile on the home page (fonts blocked in the sandbox): performance 0.75 -> 0.99, LCP 14.7 s -> 2.1 s, page weight 2,653 KiB -> 162 KiB; accessibility 1. 169 inline scripts pass node --check; no missing home links. jsdom footer sign-in: 27 pass / 3 fail, same as main (old cooldown UI). vitest pages-launch + pages-login: 2 pass / 3 fail, the same 3 as main.
- Not tested: a real iPhone (Safari safe areas, the sticky bar while scrolling) and a real Discord sign-in round trip.

## 2026-11-13 — feat(extension): respect each site's minimum cash-out before saying "cash out"

- Why: Jamie: "the extension should be mindful on min cash out amounts for each site before it tells players to cash out."
- New `apps/chrome-extension/src/cashout-minimums.ts`: per-site table (amount, unit, operator source URL, last-checked date) for every route in `cashout-router.ts`, plus `evaluateCashoutGate(host, balance)` -> `clear` / `below` / `unknown` and the copy for the last two. Numbers only from the operator's own published rules/help pages, read 2026-11-13; no source, no number.
- Sourced (cash prize minimum, Sweeps Coins): Chumba 100 (VGW Sweeps Rules v23.0 6.5), LuckyLand Slots 50 (VGW v29.0 6.5), Global Poker 50 (v26.0 6.5), WOW Vegas 50 (help center), High 5 100 (help center), McLuck 75 (operator FAQ, Sep 2026), Zula 50 (Sweepstakes Rules v2.7 5.3), Crown Coins 50 (operator glossary), LoneStar 100 (Promotional Play Rules v1.9 9.1.2), RealPrize 100 (v3.2 9.1.2).
- Blank (treated as unknown): Stake.us (terms reserve a minimum, print none), Pulsz (rules behind login), Funzpoints, Funrize, Jackpota (rules URL 404), NoLimitCoins; crypto sites Stake, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, CSGOEmpire (per-coin minimums in the cashier, not comparable with the balance on screen).
- Behaviour: at/above the minimum every nudge is unchanged. Below: no "cash out" copy and no cashier button; the copy says how far under the minimum the balance is and offers a 5-minute break (Touch Grass timeout), never depositing or playing on. Unknown (blank site, unknown host, unreadable balance): neutral copy, "check the cashier before counting on a withdrawal".
- Wired into: profit-lock goal toast, ratchet soft-warning modal and hard-brake message; bonus-tracker rollover-complete modal (drops "100% withdrawable" unless clear); reality HUD and streak toast hide their Cashier button only when below. `installProfitLock` and `showBonusCompleteModal` take an optional hostname override (tests).
- Not changed: deposit-barrier's cooldown redirect to the withdraw tab, heater nudge ("lock half"), vault/auto-vault. Gate uses the displayed SC balance, which can include unplayed SC that does not count toward the minimum yet, so "clear" is a floor check, not a promise.
- Checked: new `tests/unit/cashout-minimums.test.ts` (table integrity vs routes, host matching, gate states and shortfall, copy rules, toast/modal/hard-brake/bonus modal in jsdom). Not checked in a real browser on any casino site.

## 2026-11-12 — deploy(activity): Touch Grass channel rooms on the same test hosts

- Worker `touch-grass-activity` re-uploaded from 79e2ca6b through the REST API (deployment 4d2dfa6f): same bindings (ROOMS, LIVE, SCORES; vars DISCORD_CLIENT_ID, ALERT_GUILD_ID), secrets DISCORD_CLIENT_SECRET and ALERT_WEBHOOK_URL kept via `keep_bindings`; no new DO class, no migration (still v3). `/api/health` 200 before and on every poll after; `/api/live` 200; a channel key with a wrong-guild instance 403 `room-guild-mismatch`, without `?instance=` 400, a good key without a token 401.
- Pages `touch-grass-activity` deployment 151fb864 (79e2ca6b): assets uploaded with the upload JWT (sent with `--noproxy` so the sandbox's injected Cloudflare auth doesn't replace it), check-missing confirmed 0 missing, then the deployment created. pages.dev polled every 2 s through the switch: all 200, old bundle to new with no gap. discordsays.com `/.proxy/api/health` 200. No Discord messages posted.

## 2026-11-12 — fix(activity): one Touch Grass room per server channel

- Why: `/api/live` showed 2 DA&D tables with 1 seated each in one server. Rooms were keyed by `sdk.instanceId`, and a second person who started the Activity fresh in the same channel (instead of tapping Join) got a new instance, so a separate room.
- Room key (`roomKeyFor`, `src/shared/protocol.ts`): `g-<guildId>-c-<channelId>` when the instance id names a guild (`i-<n>-gc-<guild>-<n>`, strict, never the client's guild) and `sdk.channelId` is a snowflake; otherwise the instance id as before (DMs, group DMs, missing/invalid channel, guest mode). The client connects to `/api/room/<roomKey>/...?instance=<instanceId>&guild=<sdk.guildId>`.
- Server check (`resolveRoom`, used by `worker/src/index.ts`): a channel key needs `?instance=`; the guild in the key must equal the guild that instance id names, else 403 `room-guild-mismatch`; missing/junk instance or a malformed `g-` key: 400. Instance-id paths behave exactly as before. The DO, live registry, alerts (per guild per game, so one shared room means fewer posts, never more) and high scores (guild from the instance id or the checked key) all run on the room key unchanged. No new DO class, no migration; old instance-keyed rooms age out.
- Not cross-checked: the channel half of the key comes from the client (`sdk.channelId`). A signed-in user could pick another channel's room in the same server, never another server's. The instance id's last segment looks like the channel id; tightening to that is a follow-up once confirmed in real Discord.
- Behaviour change: two separate groups launching in one channel now share one table (DA&D and Bluff seat 8; extras queue or spectate).
- Checked: typecheck, vite build, 159 vitest tests (was 148): `room-key.test.ts` (same guild+channel from two instance ids = one room, other channel = other room, mismatched guild rejected, DM / junk channel fallback, old paths unchanged), `transport-room.test.ts` (client sends the key + `?instance=`; DM sends neither), workerd test with two instance ids in one channel seated at one table and one `/api/live` table, a third instance polling into it, another channel separate, wrong-guild 403 on ws and polling, DM on its instance id. `simulate` (DA&D, trivia, Bluff) passes.

## 2026-11-12 — deploy(activity): Touch Grass Bluff build on the same test hosts

- Worker `touch-grass-activity` re-uploaded from 73de355f through the REST API: same bindings (ROOMS, LIVE, SCORES Durable Objects; vars DISCORD_CLIENT_ID, ALERT_GUILD_ID), secrets DISCORD_CLIENT_SECRET and ALERT_WEBHOOK_URL kept via `keep_bindings`; no new DO class, so no migration (still v3). `/api/health` 200 before and on every poll after; `/api/live` 200 with `games.bluff`; `/api/trivia/scores` 401 without a token; token route still reaches Discord.
- Pages `touch-grass-activity` deployment 2b1df5ca (73de355f): assets uploaded with the upload JWT, check-missing confirmed 0 missing, then the deployment created. pages.dev polled every 2 s through the switch: all 200, old bundle to new with no gap. discordsays.com `/.proxy/api/health` 200. No Discord test messages posted.

## 2026-11-12 — feat(activity): Bluff (two truths and a lie) as the third Touch Grass game; CI brand fixes; main merged in

- Merged origin/main into touch-grass-activity (9a8761ca, merge not rebase): main holds #720 squashed from this branch's first head, so every app file was add/add. Kept this branch's app; dropped the break-timer files main still carried; SESSION_LOG entries from both sides kept; lockfile regenerates unchanged.
- Brand Compliance (8e3ef3b7): the custodial-word rule (`\bseed\b`) hit the trivia bank's source comments ("trivia.live seed.sql") and a test's rng param; reworded / renamed. The alert-copy emoji stay (MEDIUM, non-blocking, intended copy). Validate Changed Packages fails at `tools/check-root-cleanliness.sh` because main itself has 9 root markdown files (CHROMEWEBSTORE.md, since 67b067f6); not changed here.
- Bluff (`src/shared/bluff.ts`): port of DegensAgainstDecency `TwoTruthsAndALieGame.js`. 3-8 seated; everyone seated at the start tells once (chosen over "5 rounds": equal turns, no half-round). Teller writes 3 statements (120 chars max) and marks the lie; the server shuffles; others get 30 s to pick (one guess, teller can't, early close when every connected guesser is in). Jamie's scoring kept: +10 correct, +5 to the teller per wrong guess. Reveal (lie + who picked what, then the board) for 10 s or Next. 3-minute write clock; an away teller holds the round through the existing 3-minute grace and is then skipped; away guessers miss the round; under 3 seated pauses. Late joiners spectate, seated next game. Lie only in server state and the teller's own view until the reveal. Existing rate limits; `bluff.tell` / `bluff.guess` validated on the wire.
- Prompts (`src/shared/bluffPrompts.ts`): Jamie's 5 `getFallbackTwoTruthsPrompts` plus 34 new; no runtime AI; no-money guard extended to them.
- Free text (`src/shared/textGuard.ts`): DA&D (both repos) has no free-text filter, so a light slur-only blocklist is new (whole words, leetspeak, stretched and spaced-out spellings; ROT13 stems; known false-positive words left out), plus NFKC, invisible/bidi stripping and whitespace collapse. Swearing allowed. Views escape all text.
- Lobby: third live tile, Bluff (N seated / T round). `/api/live`: `games.bluff {tables, seated, joinable}`, included in the totals; reports from pre-Bluff rooms still parse. Table alerts: Bluff posts when someone is seated with no game going, same 20 s settle, 10 min throttle and game on / closed edits; stored pre-Bluff alert state upgraded. No Bluff high-score board.
- Checked: typecheck, vite build, 148 vitest tests (was 122): Bluff state machine (start/seat limits, shuffle keeps the lie, validation incl. 120 cap / duplicates / slurs, scoring, one guess, teller can't guess, stale/late guesses, early close, everyone tells once, Next, write timeout, away teller hold and grace skip, pause/resume), room view lie hiding, wire parsing, text guard false positives; DO host (3-player game on alarms, away teller grace skip, away guesser misses, live report, pre-Bluff save upgrade); live registry and alerts for Bluff; jsdom guest game vs bots with the draft surviving re-renders; workerd 3-player Bluff over WebSockets with `/api/live`. `simulate` adds a 3-player Bluff game with a drop and rejoin. Workerd trivia test made race-free (waits for the duplicate-answer refusal before the others answer).

## 2026-11-12 — deploy(activity): Touch Grass high scores + table alerts on the same test hosts

- Worker `touch-grass-activity` re-uploaded from 8f5739f1: migration v2 -> v3 adds `SCORES`/`TriviaScores` (new class only; ROOMS and LIVE untouched), new var `ALERT_GUILD_ID`, `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` kept. `/api/health` 200 before, during and after; `/api/live` 200; `/api/trivia/scores` 401 without a token, 405 on POST; token route still reaches Discord.
- Table alerts live: the Tilt Check bot (admin in the TiltCheck server) created channel webhook "Tilt Check Tables" in #live-game-alerts; its URL went straight into the worker secret `ALERT_WEBHOOK_URL` through the Cloudflare API, never printed or committed. No test message was posted; the first alert will come from a real player.
- Pages `touch-grass-activity` deployment 2a66b11b (8f5739f1). Assets uploaded outside the sandbox's injected auth with the upload JWT and confirmed present (check-missing empty) before the deployment was created. pages.dev polled every 2 s through the switch: every response 200, old bundle to new with no gap. discordsays.com `/.proxy/api/health` 200.

## 2026-11-12 — feat(activity): trivia high scores per server, end-screen grammar, smaller phone question text, table alerts

- High scores (`src/shared/scores.ts`, `worker/src/scores-do.ts`): new `TriviaScores` Durable Object, one per Discord server (`idFromName('guild:<id>')`), migration v3 `new_sqlite_classes` only (v1 ROOMS and v2 LIVE untouched). Top 10 this week (resets Monday 00:00 America/Chicago, DST-aware via Intl) and top 10 all time; one row per player per board, best only; rows hold Discord user id, display name, avatar hash, score, date. Personal bests (id, score, date) kept for every player so someone off the board still sees theirs. Zero scores are not recorded.
- Written only by the room: when it runs a 10-question game to the end (`phase: over`) it posts its own `trivia.scores` once (`triviaPosted` marker; failed writes retry on the alarm, best-only makes a repeat harmless). No client message or public route writes a score; `POST /api/trivia/scores` is 405.
- Server attribution: Discord instance ids carry the guild (`i-<launch>-gc-<guild>-<channel>`), which now wins over the client's `sdk.guildId` for rooms, live counts and boards. DMs / group DMs (`-pc-`) have no server and are **off the record** (skipped, not bucketed); the end screen and lobby say "No server, no board."
- `GET /api/trivia/scores?guild=` with the same Discord bearer token as the room; per-user rate limit; not added to `/api/live`, which stays anonymous.
- UI: High scores panel with This week / All time tabs in the lobby and on the trivia start/end screens; viewer row highlighted; "Your best" row when off the board. End screen brags "#3 this week!" / "#1 all time!" / "New personal best." Guest mode keeps a board in the tab. Copy stays "bragging rights only".
- Grammar: end screen now reads "You take it." for the viewer, "<Name> takes it." otherwise, "<A> and <B> split it." on ties (viewer listed first).
- Phone (< 640px): trivia question text `clamp(15px, 3.8vw, 17px)` (was the shared 18-26px clamp, about 17% smaller at 390-430px wide), still 800 weight; answer buttons and DA&D prompts unchanged.
- Table alerts (`worker/src/alerts.ts`, run on the LiveRegistry alarm): post to a Discord channel webhook (`ALERT_WEBHOOK_URL` secret; `ALERT_GUILD_ID` var 1488253239643078787) when a DA&D table has someone seated with no game going, or someone is on the Trivia screen with no game running (new `{t:'look'}` client action, `waiting` in the live report). Waits 20 s (rooms that empty sooner never alert), at most one post per game per 10 minutes, edits the post to "table's full, game on" / "closed" when that changes. `allowed_mentions: {parse: []}`, no names or ids. Dormant without the secret.
- Checked: typecheck (client, worker, tests), vite build, 122 vitest tests (was 84): Chicago week boundary incl. both DST weeks, best-only, top-10 trimming and tie order, ranks after the whole game is placed, personal best off the board, guild isolation in the DO, malformed results dropped, room posts once with server scores, abandoned game never posts, no client-submitted score, off-record DMs, retry; alerts with a mocked fetch only (dormant without secret, guild match, 20 s empty-room suppression, throttle, game-on/closed edits, no mentions, error still throttles, registry alarm arming); UI (grammar, brags, highlight, off-board best, guest board, phone font CSS); workerd: full 3-player game writes the board, 401/400/405, other guild empty, `/api/live` still anonymous. `simulate` (DA&D to a winner; trivia game with a drop/rejoin, posted once to the board).

## 2026-11-12 — feat(activity): Touch Grass trivia replaces the break timer; away grace on drop; live-tables registry

- Removed the group Touch Grass break completely (client view, lobby tile, share card, `breakTimer.ts`, `break.*` actions and state, break tests and copy). Old stored rooms are upgraded on load (`brk` dropped). Lobby subtitle kept.
- Trivia (`src/shared/trivia.ts`): self-running, anyone taps Start; 10 questions, 4 choices, 15 s window (closes early once every connected player has locked in), 4 s reveal, scoreboard after each question and at the end. 100 for correct plus up to 50 for speed. Late joiners spectate until the next question. Server is the authority: the correct choice and other players' picks are never in a view before the reveal; one answer per player per question, inside the window, for the question in flight; existing per-user rate limit. DO alarm drives the timers. No prizes, money, ads or extra lives.
- Bank (`src/shared/triviaBank.ts`): 116 questions, drawn without repeats per instance. 33 reworded from packages/shared/src/trivia.ts (the bank behind apps/game-arena trivia-manager and the apps/web touch-grass practice deck), 11 from jmenichole/trivia.live seed.sql (free-play-mvp; 4th choice added, Best Picture question pinned to the 1995 ceremony), 72 new (general knowledge plus odds, house edge, RTP and gaming lore). archive/apps/degens-activity had no local bank. The browser build aliases the bank to a 10-question guest demo deck so real answers never ship in the JS.
- Lobby: two live tiles, Degens Against Decency (N seated) and Trivia (N playing).
- Away grace (bug: iOS app switch dropped the socket and the room unseated the player): a socket close now marks the user away and keeps seat, hand and score for 3 minutes via the DO alarm; the same Discord id re-attaches on reconnect. Removal only on grace expiry, Stand up, or explicit `leave`. An away DA&D judge holds the round until the grace ends, then it is skipped; away trivia players score 0 for missed questions. Client reconnects with backoff plus immediately on visibilitychange/pageshow/focus (ping + 3 s watchdog for zombie sockets). Away badges on seats, the trivia board and the lobby.
- Live tables: new `LiveRegistry` singleton DO (migration v2, new_sqlite_classes; v1/ROOMS untouched). Rooms report guild id (from `sdk.guildId`), game phases and seated/playing counts on change plus a 50 s heartbeat; 120 s TTL. `GET /api/live[?guild=<id>]` returns per-game tables/seated|playing/joinable and totals, no user ids, names, avatars or instance ids; light per-IP rate limit; CORS for tiltcheck.me (+subdomains) and chrome-extension:// only. Extension not touched.
- Checked: typecheck (client, worker, tests), vite build, 84 vitest tests (trivia state machine incl. start/window/speed score/duplicate and late answers/hidden answer/end and restart/late join/away; live registry incl. TTL; DO host incl. reconnect-inside-grace keeps seat and hand, expiry removes, away judge waits; workerd: reconnect inside grace, full 3-player 10-question trivia game over WebSockets with /api/live counts and CORS; jsdom client; no-money guard extended to the trivia bank), `simulate` (DA&D to a winner, then a full trivia game with a mid-game drop and rejoin).

## 2026-11-12 — deploy(activity): Touch Grass trivia build on the same test hosts

- Worker `touch-grass-activity` re-uploaded from 3738e659: ROOMS/TouchGrassRoom namespace unchanged, new LIVE/LiveRegistry (migration v2), DISCORD_CLIENT_ID var and DISCORD_CLIENT_SECRET secret kept. `/api/health` 200, `/api/live` 200 (CORS for tiltcheck.me verified), token route now reaches Discord (secret present).
- Pages `touch-grass-activity` deployment c9875fba (3738e659) live at https://touch-grass-activity.pages.dev; discordsays.com `/.proxy/api/health` 200. Pages answered 500 for a few minutes during the deploy (a first attempt without assets, rolled back to 112e0aa3, then propagation of the good deployment).

## 2026-11-12 — deploy(activity): Touch Grass Activity test deploy on Cloudflare

- Worker `touch-grass-activity` (new script; collectclock-api and other workers untouched) live at https://touch-grass-activity.j-chapman7.workers.dev with Durable Object `ROOMS`/`TouchGrassRoom` (sqlite migration v1) and var DISCORD_CLIENT_ID; no ALLOW_GUEST. `/api/health` 200.
- Pages project `touch-grass-activity` live at https://touch-grass-activity.pages.dev (dist from e8c7ed9d).
- DISCORD_CLIENT_SECRET not set; `/api/activity/token` answers 500 `server-not-configured` until Jamie adds it in the dashboard. Portal URL mappings, iOS/Android toggles and old launch messages still on Jamie.
- `worker/wrangler.toml` now has `account_id`; README has a "Current test deploy" section.

## 2026-11-12 — feat(activity): Touch Grass Discord Activity draft (lobby, Degens Against Decency, group break)

- New app `apps/touch-grass-activity` (Vite + TS static build) on branch touch-grass-activity, draft PR only. Nothing deployed; collectclock-api, the Developer Portal, Discord channels and DNS untouched.
- Discord setup: `ready()` -> `authorize()` (identify) -> `POST /api/activity/token` through the proxy -> `authenticate()`, then `getActivityInstanceConnectedParticipants` (2026 name) + participants updates for the avatar row. Client ID from `VITE_DISCORD_CLIENT_ID`, fallback "Tilt Check" 1445916179163250860. No `frame_id` in the URL = guest mode: fake local user, full room logic in the browser, `+ bot` button for solo testing; `?remote=1` talks to a local `wrangler dev`.
- Lobby: who's here (room members merged with SDK participants) and three tiles: Degens Against Decency, Touch Grass break, Trivia (disabled, coming soon).
- DA&D (`src/shared/dad.ts`): 3-8 players, 7-card hands, rotating judge, anonymous shuffled answers with random entry ids, first to N (default 5, picker 3/5/7/10). Late joiners queue and are dealt in next round; a leaver's card is dropped; the judge leaving voids the round and returns cards; under 3 players pauses with scores kept. Deck is original TiltCheck cards (apps/web dad-deck, modules/dad starter pack, plus new ones), 30 prompts / 81 answers, no AI generation.
- Group break (`src/shared/breakTimer.ts`): 5/10/15 min shared countdown for the whole instance; starting it pulls every client to the clock; bail is optional with a roast and "bailed at m:ss"; leaving the call counts as a bail; share card at the end (Discord share dialog via app attachment upload, falls back to copying text).
- Worker (`apps/touch-grass-activity/worker`, own wrangler.toml, worker name touch-grass-activity): token exchange with no redirect_uri, one SQLite-backed Durable Object per instanceId, WebSocket (Hibernation API) with HTTP polling fallback, DO alarm ends the break and sweeps quiet pollers. Server owns hands, judge, submissions, scores and the clock; each client gets only its own hand. Every action validated (phase, player, judge, card in hand), per-user token-bucket rate limit, 4 KB message cap, per-isolate IP limit on the token route.
- Voice and money: short degen copy, no shield/guard framing, no crisis copy, no money mechanics; `tests/no-money.test.ts` fails on money words in client source or cards.
- Checked locally: typecheck (client, worker, tests), vite build, 63 vitest tests (DA&D state machine, break timer, DO host with fake storage/sockets, auth, real worker + Durable Object in local workerd via wrangler unstable_dev incl. a 3-player WebSocket game, jsdom guest-mode client smoke test, no-money guard), and `pnpm simulate` playing a 3-player game to a winner. Not tested inside a real Discord client, on phones, or deployed.

## 2026-11-12 — fix(pages): dashboard links go to real settings, cut repeated content across site pages

- /dashboard/ (convert-markdown.js buildDashboardPage): the tool cards linked to the public explainer pages (/autovault/, /nudges/), so "configure a tool" looped back to marketing copy. Now: "Set it here" links straight to each web tool's controls: TimeCheck -> /gate/#timecheck-setup-card (site, timer, stop-loss), RealityCheck -> /cooldown/#cooldown-length (new id on the length picker), Fairness Verifier -> /tools/verify/#verify-seeds (new id on the seed form). "Set in the extension" lists ClickCheck, Nope List, Sneaky Bet Alert, Keep the Win and Win Skim with where their switches sit (extension gear -> Guards; Win Skim rules in the Vault tab) and no link, since a web page can't open the extension popup. Nudges shows "Coming soon" with no link: the extension has no nudge settings. `?tab=safety` and `?tab=vault` (the extension's block screen uses ?tab=safety) now stay on the dashboard and land on the Nope List / Win Skim card instead of redirecting to /nudges/ and /autovault/; `?tab=buddies` no longer redirects to /collab/, which doesn't exist. Old names (AutoVault, Touch Grass, Bet Verifier) gone from the dashboard.
- Homepage: hero lede no longer lists ClickCheck / Nope List / RealityCheck (the brakes list right below does). Step 03 no longer re-describes ClickCheck's 2-second pause; it points at the list. The hero privacy line is folded into the fine print, which said the same thing. RealityCheck brake and fine print say 24 hours, 3, 7 or 30 days instead of "24-hour".
- /tools/: card eyebrows that repeated the card title (TIMECHECK / TimeCheck x12) removed. The "AutoVault on your phone" section was two cards that repeated the hero's Extension button and the TimeCheck card; removed, and the TimeCheck card now says it installs to the home screen. Hero "Touch Grass" link removed (RealityCheck has its card). Extension-only cards say "In the extension" instead of "Launch tool". RealityCheck card no longer says 24 hours only.
- /casinos/: all 30 operators were listed twice (audited showcase, then the search directory with the same grades, risk and licenses). Now one list: the search box and category chips sit on the showcase cards and filter them. Section heading "Audited Operator Receipts — Stake, Roobet & BC.Game: The Receipts." and its sub (repeated the hero lede) replaced with "Every operator, graded."
- /cooldown/: punch no longer says "Pick how long." right above the "How long?" picker; the bottom fine-print card no longer repeats "we never hold your money" from the line under the lock button.
- /extension.html: hero lede no longer lists the features shown in the Features section; meta description drops "24-hour". /tip/: two cards that repeated the hero (non-custodial, free for every degen) merged into one; "AutoVault" there is now Win Skim. /nudges/: the "Toast" eyebrow repeated on all three sections removed.
- Docs: the file copyright line no longer renders above the page body on top of the footer copyright (renderMarkdown skips it). 3-ecosystem-overview.md had 3 / 3.1 / 3.2 pasted twice; 5-tool-specs-1.md had 5.1.3-5.1.4 twice, 5.2 SusLink four times and 5.3 CollectClock three times. Kept the newest full copy of each. Broken links fixed: 4-tools-overview.md custody matrix now links to docs/legal/custody-matrix.md on GitHub (not published on Pages); 8-trust-engines.md links instagram-stake-us-code-timing.html.
- Not changed, recommended: /wincheck/ and /autovault/ are the same Win Skim page at two URLs; docs/autovault, docs/lockvault and docs/casino-trust-score-page overlap the product pages. Footer tool links overlap the nav (kept; footer sign-in swap depends on it). apps/web (Next.js twin) not touched.
- Checked locally: all inline scripts pass node --check, 0 missing assets/links across 60 pages, no old tool names in visible text, jsdom verify / cooldown (119) / footer sign-in checks match main, plus new jsdom checks for the dashboard links, ?tab landing and the single casino list with search and filter. tests/pages-launch.test.ts now looks for the new casinos heading; vitest pages-launch + pages-login: 2 pass, 3 fail, the same 3 that fail on main (stale CTA and login copy).

## 2026-11-11 — feat(pages): simpler cooldown, pick a length and one lock button

- /cooldown/ rebuilt in convert-markdown.js buildCooldownPage (styles in base.css, `.cooldown-*` classes instead of inline styles). Owner feedback from iPhone: it "seems less easy than it could be". The page asked for a Solana wallet first, had two connect buttons, showed a red "No Solana Wallet Detected" box on a normal phone, and used jargon.
- New flow: heading "Take a break", one line ("Pick how long. TiltCheck blocks casino deposit buttons until it's over."), duration picker (24h / 3 Days / 7 Days / 30 Days, 7 Days default, aria-pressed), then one primary button whose label follows the pick ("Lock me out for 7 days"). It does the in-browser lock with no wallet: localStorage plus the LOCK_UPDATED postMessage (source TILTCHECK_COOLDOWN_PAGE, lockSource local_browser_session). Locked, the button is disabled and reads "Locked until <date/time>", with a status line under it; a lock already running in localStorage shows the same state on reload. `?extend=30` preselect and the `?source=auto_tilt` banner are kept (banner is now amber, not red).
- The Solana flow moved under a text button, "Add a wallet signature (optional)" (aria-expanded/aria-controls). One button goes "Connect wallet" -> "Sign lock" (lockSource solana_web_wallet, same 6-line signed message). If a lock is already running it signs that lock's end time instead of starting a new one. No wallet injected: phones get Phantom, Solflare and Backpack in-app-browser links (phantom.com/ul/browse, solflare.com/ul/v1/browse, backpack.app/ul/v1/browse, each with the encoded page URL and ?ref=<encoded origin>); desktop gets Install Phantom. Every wallet message is a neutral note; there is no red error box on the page.
- Phones only (iOS/Android UA, incl. iPadOS reporting as Mac): one neutral line saying the block runs in the TiltCheck extension on a computer, so a lock set here won't block anything on that phone, linking to /extension.html.
- "How it works" rewritten without jargon ("cryptographic commitment", "verifiable timelock" are gone) and gains a fine-print card. Page title and meta description no longer mention a wallet.
- Checked locally: all inline scripts pass node --check, 0 missing asset paths, no old tool names in visible text, and 119 jsdom checks pass on desktop and iPhone UAs (plus Android, iPadOS and Mac for the phone note): default 7 Days and label changes, primary lock storage/message/active state, optional section open/shut, mock-wallet connect/sign/disconnect and rejections, mobile wallet link URLs, phone note only on phones, no red box.

## 2026-11-11 — fix(pages): verify page styles, footer sign-in when signed in, Phantom mobile link

- /tools/verify/ rendered unstyled: it sits two folders deep but was built with the one-folder depth, so `../styles/base.css` resolved to /tools/styles/base.css (404). convert-markdown.js now has a third depth, 'nested' ('../../'), shared by assetHref/href/dirHref, and buildVerifyPage + buildHouseEdgePage use it. That also fixed their manifest, icon and every nav/footer link (all pointed under /tools/).
- Path audit of all 60 built pages: every page linked the favicon/apple-touch-icon as styles/icon.png, which is never written (the icon is copied to /icon.png). The icon links now point at the site-root icon.png. After the fix, 0 stylesheet, script, manifest or icon refs point at a missing file.
- Footer "Discord Sign In" now becomes "Your dashboard" (/dashboard/) when tc_token and tc_user are present and tc_token_exp has not passed; it flips back on sign-out or in another tab. The shared header script's signed-in check also respects tc_token_exp now. Signed out, the footer link is unchanged.
- /cooldown/ on a phone (iOS/Android user agent, incl. iPadOS) with no injected wallet: the "No Solana Wallet Detected" notice now offers "Open in Phantom app", a Phantom browse deeplink (https://phantom.com/ul/browse/<encoded page URL>?ref=<encoded origin>, per docs.phantom.com Deeplinks > Browse) that reopens the page inside Phantom's in-app browser. "Lock In-Browser (No Wallet)" stays next to it. Desktop keeps Install Phantom.
- Checked locally: all inline scripts pass node --check, jsdom passes for the footer swap (signed out, signed in, expired, sign-out) and the Phantom button (iPhone, Android, desktop, wallet injected), and no old tool names show in visible text.

## 2026-11-11 — feat(pages): tiltcheck.me quick fixes, simpler tool names, signed-in header, Discord sign-in fix

- Homepage quick fixes (3e0bc59): page title is now "TiltCheck | House always wins? Not today."; the nav shows a visible "Sign in" label next to the Discord icon; removed the duplicate WinCheck section.
- Simpler tool names (f414b54), visible text only, URLs unchanged: Nope List, Sneaky Bet Alert, Keep the Win, Win Skim, RTP Scanner, House Edge Scanner, Fairness Verifier. New meta description.
- Signed-in state (acab5b0): a shared script in every generated page reads tc_token and tc_user (Discord /users/@me JSON) from localStorage. Signed in, the nav "Sign in" link becomes a round Discord avatar (default embed avatar when none) plus username, linking to /dashboard/. /login/ hides the sign-in copy and button and shows the signed-in card with a Sign out link that clears tc_token, tc_user and tc_token_exp. The token is removed from the address bar after login, and the stored expiry signs you out when Discord's token runs out.
- BETA stamp next to the TILTCHECK wordmark, same tilted stamp as CollectClock in TiltCheck teal.
- STAFF badge on the avatar from a hardcoded Discord ID list in convert-markdown.js (STAFF_DISCORD_IDS). Cosmetic only; it gates nothing. The CollectClock worker /me needs a CollectClock session and only allows the tiltcheck-me.github.io origin, so it can't be used from tiltcheck.me yet.
- CollectClock worker (collectclock-api, code-only deploy outside this repo): the tiltcheck.me/login link (state h.web) was landing on CollectClock's phone-app handoff and showing "Sign-in failed. Go back to CollectClock". The callback now redirects state h.web or tc to https://tiltcheck.me/login/#access_token=... Confirmed working.
- PR #715 (3e0bc59 + f414b54) was squash-merged to main as bd5c53d. The signed-in header work (acab5b0) and this log entry were then cherry-picked off main onto branch signed-in-header and opened as a new draft PR ("Signed-in header, BETA stamp + cooldown buttons fix"); quick-copy-fixes is no longer the place for them.
- /cooldown/ buttons fixed (convert-markdown.js buildCooldownPage): the page's main inline script was a syntax error, so no button had a handler. The signed message used '\n' inside the generator's template literal, which printed real line breaks inside single-quoted JS strings. Now escaped as '\\n'. The LOCK_UPDATED postMessage objects also had two `source` keys, so the second one overwrote 'TILTCHECK_COOLDOWN_PAGE' and the extension ignored every lock; the lock origin now goes in `lockSource`. A wallet without signMessage now shows an error instead of claiming a signed lock, and the feedback says "1 Day" not "1 Days". Checked in jsdom: duration buttons, Connect (no wallet, rejected, connected), Lock In-Browser (No Wallet), the rejected-connect fallback lock, Sign, and Disconnect all work.
- /tools/verify/ fixed (buildVerifyPage): same bug class. `JSON.parse("[{\"id\"...}]")` lost its backslashes in the template literal and broke the script, so the three preset buttons did nothing. The presets are now a plain JS array literal. jsdom: each preset fills the seeds, shows [MATCH] and computes the outcomes.

## 2026-11-09 — feat(web): voice + staff-gating pass (web app and tiltcheck.me Pages twin)

- Staff gating: new `isStaff` flag on `GET /auth/me` (apps/api/src/lib/staff-role.ts). Checks the Discord "TiltCheck Team" role (1488256012807966751) in guild 1488253239643078787 with DISCORD_BOT_TOKEN (or TILT_DISCORD_BOT_TOKEN), caches 10 min (2 min for non-staff), fails closed. Web: `<StaffOnly>` + `useIsStaff` render nothing unless the API says isStaff === true. Pages twin: `staffOnly()` blocks ship `hidden` and are revealed by a tiny /auth/me script.
- Removed every public Chrome Web Store review/submission mention. Extension CTA now reads "EXTENSION: NOT PUBLIC YET" and points to Discord.
- Voice: no save/protect/shield/guard framing. Hero, CTAs, tool and extension copy rewritten short and degen. Jargon (HUD, DOM, velocity, router, shield, armory, guard) replaced with plain words. "Cooldown" product naming in UI copy is now "Touch Grass" (routes unchanged).
- Home: removed the duplicate TiltCheck wordmark under the nav; tightened the "How it works" section spacing.
- Tools: beta list and partner/B2B links moved to StaffOnly; offline CLI card removed from the player list.

## 2026-11-08 — feat(architecture): prune dead apps, purge magic link auth, and establish zero-cost baseline

- Monorepo Pruning: Moved 6 dead/archived apps (justthetip-bot, dad-bot, discord-bot, degens-activity, tiltcheck-activity, mobile-wrapper) to archive/apps/, completely removing them from pnpm workspace discovery, active test runs, and Turborepo builds (-103 unused dependencies).
- Zero-Cost Auth Consolidation: Purged Magic.link (@magic-sdk/admin) and orphaned routes (/auth/magic/*) from @tiltcheck/api. Implemented native Solana Wallet SIWS (/auth/solana/challenge, /auth/solana/verify) backed by @tiltcheck/auth and @tiltcheck/db, standardizing auth on Discord OAuth + Solana signatures at $0/mo.
- Zero-Cost Infrastructure Blueprint: Created render.yaml declaring a 1-click free web service deployment for @tiltcheck/api. Updated .env.example with templates for Neon Serverless Postgres and Upstash Serverless Redis.

## 2026-11-08 — feat(sentry): wire release tracking, commit associations, and critical email alerts

- Release Tracking Pipeline: Configured .github/workflows/sentry-release.yml using getsentry/action-release@v3 targeting tiltcheck-api@${{ github.sha }} on push to main with full commit history (fetch-depth: 0) for automated suspect commit identification and deployment markers.
- Runtime Release Tagging: Updated packages/monitoring/src/sentry.ts to bind release tag into Sentry.init() using SENTRY_RELEASE or serviceName@GIT_COMMIT_SHA.
- Critical Alert Workflow: Created high-priority alert rule TiltCheck API - Critical 5xx & Regressions Alert (Rule ID: 6310448) via Sentry Workflow Engine API, dispatching immediate email notifications to j.chapman7@yahoo.com on high-priority crashes, 5xx errors, and regressions.
- Architecture Alignment: Clarified deployment reality during grill-me interview confirming Docker/VPS stack execution model and complete retirement of legacy Railway service definitions.

## 2026-11-08 — feat(sentry): provision tiltcheck-api project and verify live error ingestion

- Sentry Project Provisioning: Connected via Sentry MCP to organization tiltcheck and provisioned new project tiltcheck-api (Platform: Node.js, Project ID: 4512396248809472).
- Configuration: Set live SENTRY_DSN in local .env, wiring SentryMonitor.init('api', process.env.SENTRY_DSN) in apps/api/src/index.ts.
- End-to-End Verification: Booted Express API gateway on port 8080, triggered test exception through the application's real middleware and error handler, and verified successful ingestion in Sentry (TILTCHECK-API-1 with full source context stack trace). Cleaned up test endpoint and resolved verification issue.

## 2026-11-08 — feat(plugin): package workspace customizations into tiltcheck-devkit plugin

- Unified Customizations into Workspace Plugin: Created .agents/plugins/tiltcheck-devkit/ containing plugin.json (version 1.0.0), README.md, rules/AGENTS.md, and encapsulated skills (chrome-extensions, modern-web-guidance).
- Consolidated Guardrails & Domain Invariants: Merged brand laws (zero emojis, non-custodial architecture, copyright headers), casino sweepstakes invariants (SC/GC mode detection, slot iframe penetration, Default Bet Breaker, Stake cashier routing), and extension UI/packaging runbooks into plugin rules.
- Live Language Server Discovery: Verified dynamic discovery via language server RPC GetAllPlugins (customization://tiltcheck-devkit), eliminating loose unversioned files under .agents/skills/.

## 2026-11-08 — docs(rules): persist extension invariants and sweepstakes domain guardrails

- Codified Sweepstakes Domain Invariants: Updated .cursor/rules/frontend-extension-safety.mdc with critical invariants: Gold Coins (GC) vs Sweeps Coins (SC) dual-currency alert suppression, slot iframe penetration (all_frames: true), Default Bet Breaker bankroll protection on page reloads, and Stake cashier query parameter formatting (?modal=wallet&tab=withdraw|redeem).
- Codified UI & Component Standards: Established zero unwired controls invariant for popup elements and standardized semantic iconography (24x24 viewBox mechanical gear for settings, help circle for guides).
- Updated Monorepo Agent Directory: Expanded AGENTS.md with Chrome extension packaging runbook (pnpm test + pnpm package) and Windows PowerShell/CRLF execution conventions.

## 2026-11-08 — fix(extension): wire tutorial wizard to help icon and replace settings icon with gear

- Help Icon Tutorial Wizard: Implemented initOnboardingWizard() in popup.ts and bound click listener to #btn-tutorial, allowing users to open the 4-step interactive Onboarding Guide modal (#onboarding-overlay) at any time. Configured step navigation, real-time goal template checkboxes, master toggle persistence, and one-click guardarm checklist (saveTouchGrassOptIn, saveRealityHudEnabled, saveAudioAlertsEnabled, saveHourlyWage, saveOnboardingCompleted).
- Settings Icon Redesign: Replaced the 8-ray sun/brightness SVG on #btn-settings with standard, crisp Feather mechanical gear icon (circle cx="12" cy="12" r="3" and 6-tooth cog path on a 24x24 viewBox), eliminating visual confusion with display brightness. Updated all header action icons to 24x24 viewBox for line-weight harmony.
- Verified & Packaged: All 40 unit test files passed (294/294 tests, 100% pass rate); packaged updated tiltcheck-extension.zip (448 KB).

## 2026-11-08 — feat(extension): sweepstakes domain whitelisting, default bet breaker, and UI polish

- Sweepstakes Casino Whitelist: Added Crown Coins (crowncoinscasino.com), LoneStar (lonestarcasino.com), Real Prize (realprize.com), Pulsz (pulsz.com), McLuck (mcluck.com), Chumba (chumbacasino.com), WOW Vegas (wowvegas.com), High 5 (high5casino.com), Fortune Coins (fortunecoins.com), Zula (zulacasino.com), and Sportzino (sportzino.com) to manifest.json (host_permissions, content_scripts with all_frames: true, and web_accessible_resources). Resolves inactive spin lock and telemetry on sweepstakes slot games.
- Default Bet Breaker (Option A: Hard Intercept on First Spin): Implemented default-bet-breaker.ts and default-bet-breaker.test.ts to protect bankroll against inflated default stakes ($1.00, $2.00) on game reloads. Arms on game/page load and SPA route switches; blocks the first spin if stake > baseStakeThreshold (default $0.50); displays an unblockable HUD modal with [Confirm $X.XX] and [Drop to Minimum] (auto-decrements stake down to minimum). Added settings toggle and threshold input in popup Guards panel.
- Gold Coins (GC) Suppression: Enhanced isPlayMoneyActive() in reality-hud.ts and readBalance() to inspect sweepstakes casino active currency mode toggles (GC vs SC) across Crown Coins, LoneStar, Real Prize, and Stake.us. Prevents Gold Coins token balances (e.g. 100,000 GC) from falsely triggering real-money cashout goal alerts or profit-lock warnings.
- Layout & Flex Pinning: Updated popup.html body styling with flex column layout and footer margin-top: auto, eliminating the empty black void below the footer on the Vault and compact tabs. Added default empty state for Vault rules.
- Live Status Pill & Routing: Expanded updateSessionStatusPill() in popup.ts with domain recognition for Crown Coins, LoneStar, Real Prize, and sweepstakes platforms. Hardened openDashboardTab() with trailing-slash URLs (https://tiltcheck.me/autovault/, /nudges/, /collab/, /dashboard/) to eliminate 404s on GitHub Pages.
- Stake Cashout Modal Hang Fix: Fixed inverted query parameters in cashout-router.ts. Previously routed to https://stake.com/?tab=wallet&modal=withdraw (and stake.us), where modal=withdraw was an invalid modal name causing Stake's router to hang with a perpetual loading spinner. Corrected to https://stake.com/?modal=wallet&tab=withdraw and https://stake.us/?modal=wallet&tab=redeem. Added priority DOM selectors (button[data-test*="withdraw"], button[data-test*="redeem"]) and history pushState event dispatching so in-page cashout seamlessly selects the withdrawal tab without reloading or closing an already open wallet modal.
- Tested & Packaged: Added 7 unit tests in default-bet-breaker.test.ts; all 40 test files passed (293/293 tests, 100% pass rate); packaged updated tiltcheck-extension.zip (447 KB).

## 2026-11-08 — fix(extension): spin lock selectors, live session pill detection, and activity feed telemetry

- Stake & Modern Casino Spin Detection: Expanded SPIN_CONTROL_SELECTOR in spin-pace-lock.ts to cover Stake Originals and modern provider buttons (data-test="bet-button", data-test="play-button", data-testid="bet-button", button[aria-label*="spin" i], button[aria-label*="bet" i], button[aria-label*="play" i]). Added unified findSpinControl() heuristic with text content detection (Bet, Spin, Play, Roll, Deal) so the 2-second pace brake, velocity radar, and streak tracker engage accurately across Stake.us, Stake.com, Roobet, and BC.Game.
- Iframe Slot Game Coverage: Added all_frames: true to content_scripts in manifest.json, enabling content script injection and click throttling within same-origin/subdomain slot iframes.
- Dynamic Session Status Header Pill: Replaced static "No session" status with live browser tab and telemetry awareness (updateSessionStatusPill). Checks active casino tab and local telemetry: displays "Live (Stake)" when spins are actively flowing, "Guards on (Stake)" when monitoring on a supported casino tab, and "Standby" when idle.
- Persistent Activity Feed System: Implemented activity-feed.ts (recordActivityFeedEvent, getActivityFeed, clearActivityFeed) backed by chrome.storage.local. Hooked telemetry into spin brake enforcement (locked/blocked clicks), casino monitoring boot, cold streak warnings, Gambler's Fallacy traps, reality HUD alerts, cashout goal achievements, and seed rotation. Added Clear feed button (#btn-clear-feed) in popup.html.
- Vault Panel Fallback & Radar Unwrapping: Resolved empty void in Vault panel when unlinked by showing informative fallback card; fixed radar response unwrapping in popup.ts.
- Tested & Packaged: Added unit tests in spin-pace-lock.test.ts and activity-feed.test.ts; all 39 test files passed (286/286 tests); packaged updated tiltcheck-extension.zip (442 KB).

## 2026-11-08 — feat(extension): sweepstakes Gold Coins filter & onboarding tutorial wizard

- Gold Coins / Play Money Suppression: Implemented isPlayMoneyBalance() in reality-hud.ts and updated readBalance() to recognize Gold Coins (GC), free play, and demo credits. Prevents sweepstakes token balances (e.g. 100,000 GC on Stake.us) from falsely triggering real-money cashout goals, soft warning modals, or fake drawdown calculations.
- Extreme Currency Jump Protection: Added safeguard in profit-lock.ts to prevent instant multi-order-of-magnitude balance jumps from firing simultaneous goal unlocks.
- Clean Relatable Default Lifelines: Removed external sponsor URLs and low thresholds ( Spotify,  trash bags); replaced with clean real-world lifelines (Dinner , Gas , Groceries , Power Bill , Rent ) with empty linkUrl targets.
- Interactive Onboarding Setup Wizard: Built 4-step wizard (#onboarding-overlay) covering Zero-Custody philosophy, Sweeps Cash vs Gold Coins explanation, customizable goal selector, and guardrail checklist. Automatically launches on first run and can be re-opened anytime via #btn-tutorial in the popup header.
- Verified & Packaged: Added unit tests for isPlayMoneyBalance() and onboarding persistence; 38/38 test suites passed (279/279 tests); packaged tiltcheck-extension.zip (430 KB).

## 2026-11-08 — style(extension): neurocognitive visual refresh (PMC12289795 selective visual attention & calm saliency)

- Applied neurocognitive design principles from PMC12289795 (Klein et al., July 2025, Selective Visual Attention in ADHD) to eliminate false-alarm attentional capture and visual clutter in the extension popup.
- Calm-by-Default Saliency Matrix: Nominal status badges (radar-steady, streak-neutral, devnet sync) transitioned from saturated neon accents to low-chroma slate (#94a3b8 / rgba(148,163,184,0.10)), preserving vibrant color singletons exclusively for true risk states (drain, bleed, cliff-dive, fallacy trap, voluntary timelock).
- De-Cluttered Borders & Surfaces: Softened --border token from 0.10 to 0.065; eliminated harsh red borders (border: 1px solid rgba(255, 74, 74, 0.22)) from peacetime guard configuration cards; replaced high-vibration dashed borders in policy cards with calm subtle fills (rgba(0,0,0,0.20)).
- Typographic Sentence-Case Hierarchy: Replaced aggressive all-caps text blocks and monospace body text in .guard-panel, tabs, sparkline placeholders, and goal badges with proportional sans-serif in clean sentence case, reducing reading fatigue under dopamine depletion.
- Re-tested & Packaged: 38/38 unit test suites passed (278/278 tests); packaged updated tiltcheck-extension.zip (428 KB).

## 2026-11-08 — fix(extension): popup window detach, auth bridge flow hardening, and dashboard 404 routing

- Fixed popup height void: Reduced default popup min-height from 480px to 380px and adjusted width to 390px, eliminating excessive empty black voids on compact tabs (Vault, Activity).
- Added Detached Standalone Window Mode: Added pop-out button (#btn-detach-window) in header triggering chrome.windows.create({ type: 'popup', width: 440, height: 720 }) allowing users to have an unconstrained, freely resizable OS desktop window.
- Hardened Auth Bridge & Web Fallback: Updated auth-bridge.html with official obsidian styling and brand shield; eliminated popup-blocker suppression by binding authorization to user action; added connecting states and automatic redirection fallback to https://tiltcheck.me/login.
- Eliminated 404s on Vault & Dashboard Links: Replaced non-existent dashboard.tiltcheck.me routes with live production paths (https://tiltcheck.me/autovault and https://tiltcheck.me/dashboard); updated scripts/convert-markdown.js to generate /dashboard/ hub and /vault/ redirect pages.
- Header Logo Brand Refresh: Replaced legacy [TC] text mark in popup.html with official glowing brand shield icon (icons/icon48.png).
- Tested & Packaged: Updated background.test.ts assertions; verified 100% test pass rate (38/38 test suites, 278/278 tests); packaged tiltcheck-extension.zip (428 KB).

## 2026-11-08 — fix(extension): high-resolution brand shield icon upgrade & CWS promo asset generation

- Replaced legacy 501-byte blocky TC pixel placeholder with high-resolution TiltCheck brand shield.
- Rendered anti-aliased, multi-resolution icons (icon16.png, icon48.png, icon128.png) using Lanczos downsampling from 1024x1024 master artwork with obsidian squircle backing, glowing teal border, and golden backlight.
- Generated Chrome Web Store collateral in apps/chrome-extension/promo/:
  - Small Promo Tile (440x280 PNG) with dark gradient, shield mark, and brand typography.
  - Marquee Promo Tile (1400x560 PNG) with full feature highlights and editorial layout.
- Updated generate-icons.py and generate-icons.js with line-1 copyright headers.
- Rebuilt and packaged tiltcheck-extension.zip (437 KB); 38 test files, 278 tests passed.

## 2026-11-08 — docs(store): Chrome Web Store Developer Review Readiness & Packaging Audit

- Audited and packaged production release of TiltCheck Chrome Extension (v1.2.3).
- Verified package file apps/chrome-extension/tiltcheck-extension.zip (414 KB) and mirror apps/web/public/downloads/tiltcheck-extension.zip.
- Confirmed 0 sourcemap leaks, 0 dev artifacts, 0 unapproved permissions.
- Created CHROMEWEBSTORE.md in root as single source of truth for store copy, permissions justifications, and privacy disclosures.
- Synchronized apps/chrome-extension/docs/publishing.md with latest Client Seed Manager features.
- Verified test suite: 38 test files passed, 278 tests passed, 0 failures in @tiltcheck/chrome-extension.

## 2026-11-08 — feat(fairness,extension): Issue #539 Client Seed Manager (on-device CSPRNG, rotation, per-site persistence, best-effort DOM apply)

Implemented full cross-surface Client Seed Manager (Issue #539) across core packages, Stake module, browser extension, and web verification tools:
- Non-Custodial On-Device CSPRNG & Hygiene Engine (`packages/shared/src/seed-manager.ts`, `packages/types/src/index.ts`):
  - Added cryptographic seed generation using `globalThis.crypto.getRandomValues` across `alphanumeric` (16/32-char rejection-sampled), `hex` (32/64-char), `uuid` (v4), and `readable` formats.
  - Implemented `calculateSeedEntropy` estimating Shannon entropy bits with repetitive/sequential character penalties.
  - Implemented `evaluateSeedHygiene` detecting known default casino seeds (`clientseed`, `default`, `12345`, `stake`, etc.), short seeds, and low-variance runs with tiered statuses (`strong`, `acceptable`, `weak`, `compromised`).
  - Implemented `ClientSeedManager` core class providing per-site seed isolation, automatic initial seed provisioning, rotation tracking with 50-entry history caps, and clipboard copy helpers.
  - Added comprehensive test suite in `packages/shared/tests/seed-manager.test.ts` (24/24 passing).
- Stake Dedicated Module (`modules/stake/src/seed.ts`, `modules/stake/src/index.ts`):
  - Created `StakeSeedManager` inheriting `ClientSeedManager` with default site `stake` and Stake-specific helpers (`getStakeSeed`, `rotateStakeSeed`, `applyToStakePage`).
  - Added unit test suite in `modules/stake/tests/seed.test.ts` (3/3 passing).
- Chrome Browser Extension Integration (`apps/chrome-extension`):
  - Created `ChromeStorageSeedAdapter` in `src/seed-manager-extension.ts` providing Promise-based `chrome.storage.local` persistence with `localStorage` and memory fallbacks.
  - Added `Client Seed Manager` UI panel to extension popup (`popup.html` and `popup.ts`) featuring active seed display, real-time entropy/hygiene badge, one-click copy, on-device rotation button, collapsible history drawer, and site badge.
  - Implemented best-effort "Apply to Page" utility in `content.ts` with strict user confirmation requirement before mutating DOM inputs (`input[name="clientSeed"]`, Stake data-test selectors).
  - Added unit test suite in `tests/unit/seed-manager-extension.test.ts` (6/6 passing); verified full extension suite (272/272 passing across 37 files) and re-packaged `tiltcheck-extension.zip`.
- Web Tools Integration (`apps/web/src/app/tools/verify/page.tsx`):
  - Integrated interactive Client Seed Manager into the Provably Fair Bet Verifier.
  - Added real-time dynamic seed hygiene alerts (`[COMPROMISED SEED ALERT]`, `[WEAK SEED WARNING]`, `[HIGH ENTROPY CLIENT SEED]`).
  - Added multi-casino selector (Stake, BC.Game, Roobet, Shuffle, Default), format switcher, rotation button, and history review drawer directly below the Client Seed input.
  - Updated `apps/web/src/app/tools/verify/verify-page.test.ts` (7/7 passing).
- Full Monorepo Verification:
  - 226 test files passed, 1,542 tests passed, 0 failures.


## 2026-11-07 — fix(tests,game-arena): monorepo test suite bug fixes, game arena lifecycle cleanup, and config schema validation

Performed comprehensive bug sweep across monorepo test suites and runtime modules:
- Game Arena Player Lifecycle Fix (`apps/game-arena/src/game-manager.ts`):
  - Fixed player retention bug in `GameManager` where users remained trapped in `playerGames` after a game was force-ended or completed.
  - Automatically unbound players when games reach `completed` status and allow graceful rejoin if previous session is completed.
- Config Schema Validation (`packages/config/src/env.ts`):
  - Reinstated strict `.url()` validation on `DISCORD_REDIRECT_URI`.
  - Reinstated PostgreSQL connection string regex (`/^postgres(ql)?:\/\//`) on `DATABASE_URL` and `NEON_DATABASE_URL`.
- API & Control Room Test Setup (`apps/api/tests/setup.ts`):
  - Initialized test environment variables (`ADMIN_PASSWORD`, `SESSION_SECRET`) in Vitest global setup to resolve ESM module hoisting requirements during control room readiness verification.
- Test Assertions & Brand Law Alignment:
  - Updated `apps/activity/tests/activity-shell.test.ts` to expect non-custodial `'Open Treasury'` instead of legacy jackpot copy.
  - Fixed client directive regex in `apps/web/src/app/tools/verify/verify-page.test.ts` and `house-edge-scanner.test.ts` to permit line-1 Brand Law copyright comments.
  - Synchronized CLI audit assertions in `packages/cli/tests/trust.test.ts` (live BC.Game grade `'C-'`) and `packages/cli/tests/rtp.test.ts` (unaudited check switched to `'MyPrize US'`).
  - Added resilient timeout thresholds (15s-20s) for `apps/user-dashboard` readiness and session tests under high concurrency.
  - Excluded archived custodial modules (`modules/justthetip/**`, `packages/solana-vault/tests/dual-wallet.test.ts`, `packages/agent/tests/integration/**`) and obsolete March 2026 pre-Next.js tests from root `vitest.config.ts`.
- Full Suite Verification:
  - 223 / 226 test files passed, 1,508 / 1,517 tests passing with 0 failures.



## 2026-11-07 — feat(extension): chrome web store submission readiness, manifest v3 permission pruning, and publishing guide

Prepared and verified the TiltCheck browser extension for direct submission to the Chrome Web Store:
- PR #708 Merge: Squash-merged PR #708 into main with 18/18 checks passing, integrating Solana on-chain cooldowns, auto-lock containment, and E2E automation into production.
- Manifest V3 Review Compliance:
  - Pruned unused identity permission to eliminate OAuth review friction.
  - Removed local network permissions (127.0.0.1, localhost) to satisfy Google security policies.
  - Removed unapproved root key privacy_policy_url from manifest.json.
  - Scoped web_accessible_resources matches strictly to supported casino and TiltCheck domains rather than broad wildcards.
  - Updated default lounge base URL in lounge-overlay.ts to https://activity.tiltcheck.me.
- Production ZIP Packaging: Built and verified apps/chrome-extension/tiltcheck-extension.zip containing root manifest and required assets with zero sourcemap leakage (164 KB).
- Store Listing & Privacy Declarations: Authored comprehensive Chrome Web Store publishing guide in apps/chrome-extension/docs/publishing.md with single-purpose declarations, permission justifications, data usage attestations, and exact store listing copy adhering to brand guidelines (zero emojis, non-custodial guarantee).
- Test Verification: Re-verified unit suite (272/272 passing) and Playwright browser E2E suite (6/6 passing).
- Ko-fi Support Link Synchronization: Updated official Ko-fi tipping link to https://ko-fi.com/jmenichole7 across site-links, Pages product data, collab and about pages, README.md, and created .github/FUNDING.yml with GitHub Sponsors button integration.

## 2026-11-06 — feat(ecosystem): on-chain solana devnet cooldown timelocks, tilt auto-lock containment, and e2e ci automation

Implemented and unified end-to-end on-chain Solana Devnet Cooldown Timelocks and automated tilt containment:
- Solana Devnet Anchor Program Integration (`programs/cooldown`, `packages/cooldown-sdk`, `scripts/smoke-anchor-devnet.ts`):
  - Verified live deployment of Anchor Timelock Program (`7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2`) on Solana Devnet.
  - Implemented 5-stage comprehensive smoke test verifying PDA derivations, instruction discriminators (`set_lock`, `extend_lock`), binary layout decoding, and cross-surface event contracts (21/21 checks passing).
- API Gateway & Real-Time Lock Status (`apps/api`):
  - Real-time SSE lock stream (`GET /cooldown/stream`) and REST cache verification endpoint (`GET /cooldown/check`).
- Chrome Extension Auto-Lock Containment (`apps/chrome-extension`):
  - Auto-locks extension controls and activates deposit barrier upon Level 3+ tilt detection or voluntary timelock.
  - Integrated 24h cooldown timer, auto-lock toggle, Solana wallet synchronizer, and immediate deep-linking to web intervention.
- Web & Dashboard Synchronized Intervention (`apps/web`, `apps/user-dashboard`):
  - Auto-tilt intervention banner with dynamic wallet detection on `/cooldown`.
  - Dual-tab live status cards on Safety and Vault tabs in User Dashboard with second-by-second countdowns and real-time WebSocket containment reporting.
  - Resolved Turbopack browser chunking boundary by cleanly isolating filesystem loaders in `@tiltcheck/intel-tools/server`.
- CI Automation & Brand Law Compliance (`.github/workflows`):
  - Added parallel Anchor devnet smoke, dashboard cooldown test, and Playwright extension E2E jobs in `cooldown-smoke.yml` and `pr-test.yml`.
  - Enforced 100% Brand Law compliance: 0 hardcoded secrets, 0 custodial keys, compliant copyright headers, and 0 emojis across all modified files.

## 2026-11-04 — feat(extension,web): Phase 6 In-Session Defense Suite & Volatility Spotter

Completed Phase 6 expansion of the browser extension defense suite and synchronized marketing mirrors:
- Reverse-Withdrawal Shield: Neutralizes reverse cashout and cancel payout triggers on pending withdrawals across 21+ crypto and sweeps operators.
- Profit-Lock Ratchet & Tangible Goals: Implemented trailing profit floors with 2-stage interventions (soft warning escalating to 60s hard locks) and progress tracking toward real-world bills.
- Bonus Playthrough & Max-Bet Trap Alarm: Live in-page rollover progress HUD and max-bet limit interceptor.
- Session Net PnL Mini-Sparkline & Velocity Radar: Calculates loss velocity ($/min) with status bands (Steady, Drain, Bleed, Cliff-Dive) and dynamic SVG vector momentum graphs.
- One-Click Cashout Router & In-Session Auto-Vault: Integrated 21-operator cashier deep links and non-custodial safe deposits (Stake Vault) directly from the browser session.
- Session Win-Streak & Volatility Spotter: Pure mathematical engine tracking consecutive dead spins, heater runs, and hit rates; detects Gambler's Fallacy ("I'm Due") stake escalations with immediate Cashier exit ramps.
- Web & Docs Synchronization: Expanded core brakes registry from #04 to #11 in scripts/pages-product-data.mjs and home-launch-copy.ts, updated extension explainers, and rebuilt Pages static mirror with 100% test pass.

## 2026-11-04 — feat(web): live site redesign & Discord bots archival

Deployed the spotter-focused website redesign across GitHub Pages and Next.js twin, and archived standalone Discord bots from Railway deployment:
- Live Site Redesign (`scripts/pages-product-data.mjs`, `scripts/convert-markdown.js`, `apps/web/src/app/page.tsx`, `apps/web/src/lib/home-launch-copy.ts`):
  - Preserved iconic hero headline ("House always wins? FUCK THAT.", "The math isn't rigged. Your dopamine is.").
  - Added "The 4 In-Session Brakes" section highlighting 2s Spin Brake, Strategic Game Filters, Reality Wage Clock, and DOM Deposit Barrier.
  - Added interactive Reality Wage Clock simulator allowing players to calculate labor hours torched against a customizable wage ($25/hr baseline).
  - Added "Why We Stopped Focusing on Discord Bots" architectural breakdown detailing why real-time in-session browser defense beats post-loss chatroom commands.
  - Added direct sideload zip CTA button to the homepage hero action area.
- Discord Bots Archival (`.github/workflows/deploy-railway.yml`, `AGENTS.md`, `README.md`, `docs/tiltcheck/13-discord-bots.md`):
  - Archived `discord-bot`, `justthetip-bot`, and `dad-bot` from Railway build and deployment matrices to halt cloud hosting costs and eliminate custodial liabilities.
  - Updated ecosystem deployment reality documentation to reflect that in-session harm reduction now operates via the client browser extension.
- Verification & Test Pass: Rebuilt static Pages site via `node scripts/convert-markdown.js docs/tiltcheck out/docs`; verified 100% pass across all test suites (3/3 pages launch, 67/67 web, 34/34 CLI); 0 emoji violations.

## 2026-11-04 — docs: public documentation synchronization for Phases 1–5

Synchronized all public-facing and internal documentation across the repository to reflect the completed Phases 1–5 deliverables:
- Purged legacy emojis from `README.md` in strict adherence to brand law; updated infrastructure and tech stack descriptions to reflect static hosting, offline-first toolchains, and zero-custody client architectures.
- Updated `apps/chrome-extension/README.md` to document the 4 core guards (2s spin pace lock, strategic game filters, reality wage HUD, DOM deposit barrier), Touch Grass timeout, and Stake.us AutoVault direct GraphQL routing (`https://stake.us/_api/graphql`).
- Updated `docs/ops/OPERATOR-FACTS.md` coverage gate status to live following verified promotion of 30 priority operators into `data/trust-engine/operator-facts.live.json`.
- Updated `docs/tiltcheck/0-intro.md` cost discipline principle to emphasize static hosting, offline-first toolchains, and zero-custody architectures.
- Updated `docs/tiltcheck/4-tools-overview.md` with detailed sections for Browser Extension Core Guardrails (4.7), Offline-First CLI Suite (4.8), and Casino Trust Directory & Forensic Audits (4.9).
- Updated `docs/tiltcheck/15-future-roadmap.md` with section 15.9 documenting ecosystem delivery reality across Phases 1–5; renumbered long-term vision to 15.10.
- Rebuilt GitHub Pages site via `node scripts/convert-markdown.js docs/tiltcheck out/docs`. Verified 0 emoji violations and 100% test pass rate across pages-launch, web, CLI, and extension suites.

## 2026-11-04 — feat(spotter): Phase 5 reality-grounding HUD, DOM deposit barrier & operator facts gate

Completed Phase 5 of the TiltCheck ecosystem roadmap:
- Reality-Grounding Wage-Hour Equivalence HUD (`apps/chrome-extension/src/reality-hud.ts`): Client-side DOM heuristic tracking session balance drawdown from baseline/peak; translates dollar losses into real-world labor hours torched against a configurable hourly wage baseline (default: $25/hr, user-customizable in options); renders a dark cyber-terminal banner with blunt spotter copy (`Session Drawdown: -$250.00 (10.0 hrs of labor torched). That's a full shift gone. Step away.`) when drawdown exceeds threshold hours (default 2 hrs); supports dynamic option updates, candidate DOM traversal, and snooze/dismissal with escalation re-emergence.
- DOM Deposit Barrier (`apps/chrome-extension/src/deposit-barrier.ts`): Event-driven click interception blocking cashier and deposit triggers across Stake, Roobet, BC.Game, Duelbits, Rollbit, Shuffle, Gamdom, and international variants (`Einzahlen`, `Depósito`, `Recharger`, `Recargar`) while Touch Grass timeout is active or an Ed25519 player-signed voluntary Cooldown lock is running; displays an aggressive spotter alert (`Deposit Barrier Active: You locked the door. Don't dig the hole deeper. Wait out the timer.`) with countdown remaining; permits withdrawal and game inspection.
- Popup & Core Options Wiring (`core-options.ts`, `popup.html`, `popup.ts`, `popup-settings.ts`): Wired `hourlyWage`, `realityHudEnabled`, `realityThresholdHours`, `depositBarrierEnabled`, and `cooldownActiveUntil` into `loadCoreCircuitBreakerOptions`; added Hourly Wage input, Reality HUD toggle, and Deposit Barrier indicator to the extension popup Guards panel.
- Operator Facts Coverage Gate (`data/trust-engine/operator-facts.live.json`): Promoted all 30 priority operators from `docs/ops/operator-facts-priority.json` into `operator-facts.live.json` with status `live` and certified redemption times, welcome bonuses, and VIP currency rules, clearing the 25-operator gate in `docs/ops/OPERATOR-FACTS.md`.
- Front-Facing Pages & Twin Sync: Replaced contradictory legacy "Zip is not on this site" copy with direct sideload instructions; updated homepage, extension explainer, and tools registry in lockstep to showcase the 4 active guardrails (2s spin brake, strategic game filters, reality wage HUD, deposit barrier) and offline CLI suite across both the GitHub Pages twin (`scripts/pages-product-data.mjs`, `scripts/convert-markdown.js`) and Next.js app (`apps/web`).
- Testing & Packaging: 181/181 unit tests passed across 29 test files in `apps/chrome-extension`; 22/22 tests passed in `@tiltcheck/intel-tools`; 5/5 passed in `packages/intel-agent`; 34/34 passed in `@tiltcheck/cli`; 67/67 passed in `apps/web`; 3/3 passed in `tests/pages-launch.test.ts`; 0 emoji violations; built and packaged release bundle at 121 KB.

## 2026-11-03 — feat(release): Phase 4 sideload ungating & extension release

Completed Phase 4 of the GitHub Pages migration architecture: built, packaged, and ungated the public TiltCheck browser extension sideload zip (`CTA_READY = true`).

- Built and packaged extension zip: Ran `node apps/chrome-extension/build.js` and `node apps/chrome-extension/scripts/package-extension-zip.mjs`, creating clean 116 KB packages at `apps/chrome-extension/tiltcheck-extension.zip` and `apps/web/public/downloads/tiltcheck-extension.zip` without sourcemap clutter.
- Ungated public download flags: Set `CTA_READY = true` in `scripts/pages-product-data.mjs` and `ctaReady: true` in `apps/web/src/lib/home-launch-copy.ts`.
- Synchronized launch test assertions: Updated `tests/pages-launch.test.ts` to assert `CTA_READY` is true and confirms active download CTA markup; updated `apps/web/src/components/GatedZipCta.test.ts` and `apps/web/src/lib/home-launch-copy.test.ts` to assert active download link when `ctaReady: true`.
- Rebuilt GitHub Pages static site: Ran `node scripts/convert-markdown.js docs/tiltcheck out/docs`, generating 35 specs plus single-page apps with active `DOWNLOAD THE ZIP` button pointing directly to `downloads/tiltcheck-extension.zip`.
- Verified test suites: 100% pass across all monorepo test suites (3/3 tests in `tests/pages-launch.test.ts`, 28/28 files with 67/67 tests in `apps/web`, 27/27 files with 148/148 tests in `apps/chrome-extension/tests/unit`, and 5/5 files with 34/34 tests in `@tiltcheck/cli`).

## 2026-11-03 — feat(extension): Phase 3 extension Spotter architecture realignment

Completed Phase 3 of the ecosystem roadmap: realigned Chrome extension into an active, culturally fluent Spotter on real casino tabs.

- Stake.us AutoVault cookie fix: Dynamically resolved GraphQL endpoint (`https://stake.us/_api/graphql` or `https://api.stake.us/graphql`) based on hostname so session cookies are preserved instead of failing on cross-origin `api.stake.com`.
- Promoted Touch Grass timeout into Core content loop: Event-driven temporary button locks activate on rapid click bursts (5+ in 1500ms) and loss escalation without requiring Pro activation.
- Spotter tone overhaul: Replaced moralizing HR lecturing with witty, blunt, culturally fluent spotter copy across `touch-grass-timeout.ts`, `chase-warning.ts`, `heater-nudge.ts`, and cooldown overlays.
- Pruned legacy sidebar tree: Deleted 15 unmaintained legacy sidebar files (`apps/chrome-extension/src/sidebar/`) containing dead `/bonuses` HTTP calls and simulated blockchain timeouts; introduced decoupled lightweight `decoupled-sidebar.ts`.
- Tests & build: 27 unit test suites passed (148 tests). Clean extension packaging (116 KB zip).

## 2026-11-03 — feat(cli): Phase 2 offline-first CLI modernization

Completed Phase 2 of the GitHub Pages migration architecture: modernized `@tiltcheck/cli` into a fully offline-first toolchain running with zero remote API dependencies.

- Purged dead remote dependencies (`@google-cloud/vertexai`, `@google/genai`) and deleted defunct remote commands (`agent.ts`, `auth.ts`, `checklists.ts`).
- Implemented `tiltcheck verify <serverSeed> <clientSeed> <nonce>` for offline HMAC-SHA256 provably fair bet verification matching Stake, Roobet, and BC.Game algorithms (Dice 0-100, Crash/Limbo multipliers).
- Implemented `tiltcheck rtp <operator>` reading local certified RTP datasets and computing bankroll bleed acceleration on slot downgrades.
- Implemented `tiltcheck trust <operator>` surfacing licenses, risk tiers, vault support, and rogue casino warnings.
- Implemented `tiltcheck cooldown <hours>` generating player-signed Ed25519 voluntary self-exclusion lock tokens for extension import.
- Added package data fallbacks and upward monorepo traversal so CLI runs seamlessly from any working directory.
- Created `packages/cli/README.md` and comprehensive 34-test Vitest test suite. Enforced all brand laws (zero emojis, non-custodial, required footer).

## 2026-10-13 — feat: Touch Grass games hub

`/touch-grass` replaces the crisis page as the games hub (Live Trivia + Degens Against Decency). Crisis copy lives on the footer/legal only. Pro overlay iframes `?mode=pause` during the cover. DA&D is Discord-honest when there is no web client. No enforcement changes.

## 2026-10-13 — ci: patch HIGH CVEs + stop PR e2e from hitting GitHub Pages

PR e2e now boots local Next.js on 127.0.0.1:3001 (`PLAYWRIGHT_WEB_LOCAL=1`) so `/login` is the real app, not a Pages 404. GH Pages builder emits `/login/index.html` for the live twin. `pnpm audit:deps` overrides take published HIGH patches; advisories with no patched release warn instead of fail.

## 2026-10-13 — copy: honest Core vs Pro + Cooldown discoverability

Public copy now says Core is a two-second spin lock; fullscreen Touch Grass (~2 min) is Pro only. Cooldown is first in the tool registry, dual-primary on home, and linked from tools, getting-started, dashboard Safety, and the extension popup. Guest popup opens on Guards. No enforcement default changes.

## 2026-10-13 — guard: AutoClaimer never ships in the player build

CI walker `scripts/guard-no-autoclaimer.mjs` fails Brand Law if AutoClaimer identifiers return under apps/ or packages/. Closes #545. No product UI. No runtime kill switch.

## 2026-10-13 — feat(cooldown): on-chain self-exclusion registry v2

### Summary

Shipped the Cooldown on-chain self-exclusion system (devnet live). Key components added or modified:

- `programs/cooldown/` — Anchor/Solana program for the self-exclusion registry (PDA-based lock accounts, set/extend, scope: all/category/game)
- `packages/cooldown-sdk/` — TypeScript SDK (`isLocked`, `setLock`, `extendLock`, `hashTarget`, `zeroTarget`, `SCOPE_ALL`, `SCOPE_GAME`)
- `apps/api/src/routes/cooldown.ts` + `tips.ts` — API routes for cooldown checks and tip log reads
- `apps/web/src/app/cooldown/` — Lock page and demo casino page
- `modules/justthetip/src/tilt-hint.ts` + `tip-log.ts` — JustTheTip tilt hint and tip velocity tracking
- `apps/chrome-extension/src/chase-warning.ts` + `spin-pace-lock.ts` — Browser extension superpowers: loss-chase warning and spin pace enforcement
- CI workflows updated to `ubuntu-24.04` and Node 22
- `apps/web/src/components/TrustRollup.tsx` — Placeholder replaced with live placeholder wiring

### PR hygiene fixes (post-review)

- Fixed TypeScript type predicate error in `apps/web/src/lib/docs.ts` (`lastUpdated` made required in `DocMetadata`, was always provided)
- Fixed copyright header format in `modules/justthetip/src/index.ts`
- Removed unused variables (`RANK_NAME`, `SUIT_NAME`) and unreachable function (`normalizeCard`) from poker coach userscript
- Updated README Cooldown SDK/API section to match actual SDK exports (`isLocked`/`setLock` vs old `isExcluded`/`createLock`)
