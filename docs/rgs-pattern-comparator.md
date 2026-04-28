<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25 -->

# RGS Pattern Comparator

Generic scraper and comparison tooling for public game-page RGS pattern analysis.

## What it does

- Scrapes a public game page with Playwright.
- Captures script URLs plus observed fetch/XHR request routes.
- Extracts request body keys and JSON response keys when they are visible client-side.
- Normalizes route signatures so dynamic IDs do not break comparisons.
- Compares the scraped profile against a baseline fingerprint and prints a weighted similarity report.

## Built-in baseline

The built-in `tarot` baseline is a metadata-driven profile intended for Tarot Flip / public Tarot Original pattern checks when the original `rgsService.cjs` artifact is not present in-repo.

Known baseline hints:

- Artifact hint: `rgsService.cjs`
- Math file size hint: `7.96 KB`
- Frontend file size hint: `225 KB`
- Concept hints: tarot/card/flip/deck/difficulty

Route and payload expectations are generic RGS heuristics. They are not provider fairness claims and should be treated as similarity signals, not proof.

## Usage

```bash
pnpm exec tsx scripts/rgs-pattern-compare.ts --url https://example.com/tarot-original
pnpm exec tsx scripts/rgs-pattern-compare.ts --url https://example.com/tarot-original --json
pnpm exec tsx scripts/rgs-pattern-compare.ts --url https://example.com/tarot-original --baseline-file .\baseline.json
```

## Output

The CLI prints:

- overall similarity score
- confidence level
- matched patterns
- missing baseline patterns
- observed-only target patterns

Use the JSON mode when another tool needs to consume the comparison result.
