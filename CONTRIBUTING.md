© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03

# Contributing to TiltCheck

Thank you for contributing to TiltCheck.

## Core contribution rules

1. Keep modules independent and use shared interfaces/event routing.
2. Follow the architecture docs in `docs/tiltcheck/`.
3. Never introduce custodial behavior or hidden fund custody paths.
4. Keep changes focused, testable, and well-scoped.

## Product focus rules

TiltCheck is currently refocusing around one product loop:

- **Web** proves trust and drives installs.
- **Chrome extension** protects live sessions.
- **Dashboard** owns durable controls, history, exclusions, vault settings, and accountability setup.
- **Discord** handles alerts, summaries, and nudges.
- **API** handles auth, scoring, routing, and enforcement.

Contributors should default to this filter:

1. Prefer work that improves trust proof, extension activation, durable protections, or retained protected usage.
2. Deprioritize side quests, novelty surfaces, and off-core experiments until the main loop is cleaner.
3. Do not put internal or admin functionality into the public user journey.

## Brand voice

TiltCheck has a defined voice. All copy, UI text, error messages, comments, and documentation must follow it.

**The voice:** A sharp friend who genuinely gives a damn. Honest about bad decisions, funny about it, never cruel, always in your corner.

- **Humor and wit** — dry, deadpan, never try-hard. Funny because it's true.
- **Sarcasm** — pointed but not mean. "Oh cool, another loss. Very normal behavior."
- **Millennial slang** — use naturally, not forced. "no cap" (= facts/truth; "cap" = a lie, "no cap" = no lie), "lowkey", "big yikes", "it's giving", "cooked", "locked in", "the math is mathing", "touch grass", "we see you"
- **Degen gambling vocabulary** — domain-specific terms to use in copy and UI:
  - `degen` — noun ("you're a degen") AND verb ("to degen" = to gamble recklessly/impulsively, e.g. "stop degening your bankroll"). Both forms are valid.
  - `im due` — gambler's fallacy; what someone says after a losing streak implying the universe owes them a win. Correct gently.
  - `rinsed` — lost the entire balance
  - `wen` — when; used waiting on bonuses/codes/airdrops/anything ("wen win", "wen drop")
  - `skem` — a scam you walked yourself into, self-inflicted
  - `sus` — suspicious (aligns with SusLink branding)
  - `soon` / `soon™` — a fake increment of time, almost always longer than advertised; use "soon™" when mocking vague casino timelines
  - `heater` — a winning streak; the rare thing TiltCheck exists to help you protect
- **Supportive tough love** — call out bad decisions clearly, offer the path forward, never shame or condescend
- **Peer energy** — not a lecture. TiltCheck is a tool used by degens, built by degens.

**What gets rejected:**
- Apologies, fluff, or corporate softening ("Sorry, but...", "We regret...", "Please be mindful...")
- Emojis in code, comments, or UI text
- Bland copy that could belong to any app

**Good examples:**
- "No cap, your session PnL is cooked. Lock in what's left."
- "Big yikes — three losses in a row. We see you. Step back."
- "Lowkey you should have cashed out 20 minutes ago. Still can, though."
- "It's giving tilt energy. Use the vault before your brain talks you out of it."

## Open source + private runtime boundary

TiltCheck code is open source. Production runtime internals are private.

- Allowed in PRs:
  - source code
  - docs
  - infra templates
  - `.env.example` placeholders
- Never commit:
  - real credentials/tokens
  - production secret values
  - private key material

See `docs/governance/OSS-RUNTIME-BOUNDARY.md` for policy details.

## Pull request expectations

- Explain the problem and why the approach was chosen.
- Note any architecture or deployment impact.
- Document test coverage and manual verification steps.
- Use the PR template security checklist.

## Running tests

Root `pnpm test` is the default CI-style test command. It does two things:

1. builds `@tiltcheck/database`, because other tests depend on its generated output
2. runs the root Vitest config, which discovers unit and integration tests under:
   - `tests/`
   - `apps/`
   - `packages/`
   - `modules/`

Root `pnpm test` excludes generated output like `node_modules`, `dist`, `.turbo`, `apps/web/.next`, and Playwright e2e tests under `tests/e2e/`.

Useful commands:

- Run the main repo test suite: `pnpm test`
- Run every workspace package's own `test` script: `pnpm test:all`
- Run one package/app/module test command: `pnpm --filter @tiltcheck/auth test`
- Run one file in the root Vitest project: `pnpm test -- packages/auth/src/__tests__/jwt.test.ts`
- Run Playwright e2e separately: `pnpm test:e2e`

Do not add `--passWithNoTests` to workspace test scripts. CI now fails if that loophole comes back.

## Security and disclosure

If your change touches auth, payments, trust scoring, or external APIs, include:

- threat/risk notes
- validation/sanitization notes
- rollback notes if behavior regresses

For vulnerability disclosure, follow `SECURITY.md` and avoid public disclosure before coordinated fix.

## Community standards

- No harassment, slurs, doxxing, or targeted abuse.
- Keep communication direct, respectful, and practical.

## License

Project licensing is defined by repository license files and notices.
