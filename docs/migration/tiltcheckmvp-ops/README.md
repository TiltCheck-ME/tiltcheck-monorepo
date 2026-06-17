<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# MVP repo — not inside the monorepo

`tiltcheckmvp` is a **separate GitHub repo**, not a folder in `tiltcheck-monorepo`.

| Repo | GitHub | Purpose |
|------|--------|---------|
| v1 monorepo | `TiltCheck-ME/tiltcheck-monorepo` | Production ops, crawler, this checklist |
| MVP | `jmenichole/tiltcheckmvp` | Forward build — web, API, extension |

## Clone layout (recommended)

Use **two sibling folders** on your machine:

```text
~/projects/
  tiltcheck-monorepo/    ← you likely already have this
  tiltcheckmvp/          ← clone separately (see below)
```

```bash
cd ~/projects   # or wherever you keep repos
git clone https://github.com/jmenichole/tiltcheckmvp.git
```

There is **no** `tiltcheckmvp/` directory inside the monorepo unless you create it yourself with `git clone`.

## Docs in this monorepo (offline copies)

Mirrors of MVP ops docs for reading without a second clone:

| File | Use |
|------|-----|
| [manual-tasks.md](./manual-tasks.md) | Supabase, Railway, Discord, DNS |
| [cutover-checklist.md](./cutover-checklist.md) | Smoke tests + enforcement definition |
| [v1-ops.md](./v1-ops.md) | Crawler + archive steps |
| [phases.md](./phases.md) | Phase 1–5 backlog |

Canonical source: https://github.com/jmenichole/tiltcheckmvp/tree/main/docs

## Apply patches (two-repo paths)

Patches live in **monorepo** `docs/migration/tiltcheckmvp-patches/`. Run `git am` from **inside** the MVP clone using a path to the monorepo:

```bash
cd ~/projects/tiltcheckmvp
git am ~/projects/tiltcheck-monorepo/docs/migration/tiltcheckmvp-patches/daily-bonus-feed/*.patch
```

Replace `~/projects/` with your actual paths.

Made for Degens. By Degens.
