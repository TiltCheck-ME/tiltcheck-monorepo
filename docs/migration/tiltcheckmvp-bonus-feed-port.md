<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16 -->

# tiltcheckmvp: Daily Bonus Feed Port

Port of v1 unified daily bonus feed (`TiltCheck-ME/tiltcheck-monorepo` PR #590) to `jmenichole/tiltcheckmvp`.

## Source commit

| Field | Value |
|-------|-------|
| Branch | `cursor/daily-bonus-feed-port-ec58` |
| Commit | `37b2256` |
| Message | `feat(bonuses): port unified daily bonus feed to MVP` |

## Files changed

- `apps/api/src/lib/daily-bonus-feed.ts` (new)
- `apps/api/src/routes/bonuses.ts` — `GET /bonuses/daily-feed`
- `apps/web/src/components/DailyBonusFeed.tsx` (new)
- `apps/web/src/lib/daily-bonus-feed.ts` (new)
- `apps/web/src/app/bonuses/page.tsx` — public feed (no dashboard redirect)
- `docs/bonuses.md`

## Option A: Cherry-pick (preferred)

From a clone with write access to `jmenichole/tiltcheckmvp`:

```bash
git clone https://github.com/jmenichole/tiltcheckmvp.git
cd tiltcheckmvp
git checkout -b cursor/daily-bonus-feed-port-ec58
git fetch https://github.com/TiltCheck-ME/tiltcheck-monorepo.git cursor/daily-bonus-feed-ec58
# If cherry-pick source unavailable, use Option B patch instead.
```

If you have the local commit object (e.g. from a cloud agent workspace at `/tmp/tiltcheckmvp`):

```bash
cd tiltcheckmvp
git remote add fleet-local /tmp/tiltcheckmvp   # or path to clone with commit 37b2256
git fetch fleet-local cursor/daily-bonus-feed-port-ec58
git checkout -b cursor/daily-bonus-feed-port-ec58 fleet-local/cursor/daily-bonus-feed-port-ec58
pnpm install
pnpm build
git push -u origin cursor/daily-bonus-feed-port-ec58
```

## Option B: Apply patch

Patch artifact (generated from commit `37b2256`):

- Cloud agent path: `/opt/cursor/artifacts/tiltcheckmvp-daily-bonus-feed-port.patch`
- Regenerate from any clone that has the commit:

```bash
git format-patch -1 37b2256 --stdout > tiltcheckmvp-daily-bonus-feed-port.patch
```

Apply on `tiltcheckmvp` main:

```bash
cd tiltcheckmvp
git checkout -b cursor/daily-bonus-feed-port-ec58
git apply --check /path/to/tiltcheckmvp-daily-bonus-feed-port.patch
git am /path/to/tiltcheckmvp-daily-bonus-feed-port.patch
pnpm install
pnpm build
git push -u origin cursor/daily-bonus-feed-port-ec58
```

If `git am` fails on metadata, use:

```bash
git apply /path/to/tiltcheckmvp-daily-bonus-feed-port.patch
git add -A
git commit -m "feat(bonuses): port unified daily bonus feed to MVP"
```

## Verification

```bash
pnpm build
# API: GET /bonuses/daily-feed?usOnly=true
# Web: open /bonuses — daily feed renders, no redirect to /dashboard
```

## Blocker

`cursor[bot]` received `403 Permission denied` pushing to `jmenichole/tiltcheckmvp`. A human collaborator or PAT with repo write access must push the branch and open the MVP PR.

## Related

- v1 feed PR: https://github.com/TiltCheck-ME/tiltcheck-monorepo/pull/590
- v1 P0 security PR: https://github.com/TiltCheck-ME/tiltcheck-monorepo/pull/591
- Hybrid strategy: `docs/ai/hybrid-v1-mvp-strategy.md`
