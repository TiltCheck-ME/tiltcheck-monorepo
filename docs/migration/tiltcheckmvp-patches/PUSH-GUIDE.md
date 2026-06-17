<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# Push to jmenichole/tiltcheckmvp — troubleshooting

Cloud agents and `cursor[bot]` **cannot push** to this repo (403). You must push from **your** GitHub account (`jmenichole` or a collaborator with write access).

---

## "no such file tiltcheckmvp"

**`tiltcheckmvp` is not inside the monorepo.** It is a separate GitHub repo. Clone it as a **sibling folder**:

```text
~/projects/
  tiltcheck-monorepo/   ← this repo (patches live here)
  tiltcheckmvp/         ← clone this separately
```

```bash
cd ~/projects
git clone https://github.com/jmenichole/tiltcheckmvp.git
```

If you only cloned `tiltcheck-monorepo`, `cd tiltcheckmvp` will fail until you run `git clone` above.

Patches are in the **monorepo** at `docs/migration/tiltcheckmvp-patches/`. Apply them from **inside** the MVP clone:

```bash
export MONOREPO=~/projects/tiltcheck-monorepo
export MVP=~/projects/tiltcheckmvp
cd "$MVP"
git am "$MONOREPO"/docs/migration/tiltcheckmvp-patches/daily-bonus-feed/*.patch
```

---

## Current branch status (2026-06-17)

| Branch | Remote | What's missing |
|--------|--------|----------------|
| `cursor/daily-bonus-feed-port-ec58` | Exists at `06ac641` | **1 commit** — bonus feed port patch |
| `cursor/web-sitemap-ec58` | **Not on remote** | **2 commits** — web-sitemap patches |

---

## Option A — HTTPS + Personal Access Token (recommended if SSH fails)

### 1. Create a PAT

GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained**

- Resource owner: **jmenichole**
- Repository: **tiltcheckmvp**
- Permissions: **Contents** → Read and write

### 2. Clone both repos

```bash
cd ~/projects
git clone https://github.com/TiltCheck-ME/tiltcheck-monorepo.git
git clone https://github.com/jmenichole/tiltcheckmvp.git
export MONOREPO=~/projects/tiltcheck-monorepo
export MVP=~/projects/tiltcheckmvp
```

### 3. Daily bonus branch

```bash
cd "$MVP"
git fetch origin cursor/daily-bonus-feed-port-ec58
git checkout cursor/daily-bonus-feed-port-ec58
git pull origin cursor/daily-bonus-feed-port-ec58
git am "$MONOREPO"/docs/migration/tiltcheckmvp-patches/daily-bonus-feed/*.patch
git push origin cursor/daily-bonus-feed-port-ec58
```

### 4. Web sitemap branch

```bash
cd "$MVP"
git checkout main && git pull origin main
git checkout -b cursor/web-sitemap-ec58
git am "$MONOREPO"/docs/migration/tiltcheckmvp-patches/web-sitemap/*.patch
git push -u origin cursor/web-sitemap-ec58
```

Password at push prompt = **PAT**, not GitHub account password.

---

## Option B — Fix SSH

```bash
ssh -T git@github.com
```

| Error | Fix |
|-------|-----|
| `Permission denied (publickey)` | Add SSH key to GitHub → Settings → SSH keys |
| `Repository not found` | Wrong account or no access |

```bash
cd "$MVP"
git remote set-url origin git@github.com:jmenichole/tiltcheckmvp.git
git push -u origin cursor/web-sitemap-ec58
```

---

## Verify

```bash
cd "$MVP"
git ls-remote origin 'cursor/*'
```

PRs: https://github.com/jmenichole/tiltcheckmvp/pulls

---

## MVP docs without second clone

Read mirrors in monorepo: [docs/migration/tiltcheckmvp-ops/README.md](../tiltcheckmvp-ops/README.md)

Made for Degens. By Degens.
