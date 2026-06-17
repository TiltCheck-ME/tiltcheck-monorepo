<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# Push to jmenichole/tiltcheckmvp — troubleshooting

Cloud agents and `cursor[bot]` **cannot push** to this repo (403). You must push from **your** GitHub account (`jmenichole` or a collaborator with write access).

---

## Current branch status (2026-06-17)

| Branch | Remote | What's missing |
|--------|--------|----------------|
| `cursor/daily-bonus-feed-port-ec58` | Exists at `06ac641` | **1 commit** — bonus feed port (`140337e`) |
| `cursor/web-sitemap-ec58` | **Not on remote** | **2 commits** — sitemap/robots + styled site-map/404/launch docs |

---

## Option A — HTTPS + Personal Access Token (recommended if SSH fails)

SSH (`git@github.com:...`) fails when no SSH key is loaded or the key is not added to GitHub.

### 1. Create a PAT

GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained** (or classic with `repo` scope).

- Resource owner: **jmenichole**
- Repository access: **tiltcheckmvp** only
- Permissions: **Contents** → Read and write

### 2. Clone with HTTPS (not SSH)

```bash
git clone https://github.com/jmenichole/tiltcheckmvp.git
cd tiltcheckmvp
```

Also clone or open v1 monorepo for patch files under `docs/migration/tiltcheckmvp-patches/`.

### 3. Apply patches and push

**Daily bonus** (1 commit ahead of remote branch):

```bash
git fetch origin cursor/daily-bonus-feed-port-ec58
git checkout cursor/daily-bonus-feed-port-ec58
git pull origin cursor/daily-bonus-feed-port-ec58
git am /path/to/tiltcheck-monorepo/docs/migration/tiltcheckmvp-patches/daily-bonus-feed/*.patch
git push origin cursor/daily-bonus-feed-port-ec58
```

**Web sitemap** (new branch):

```bash
git checkout main
git pull origin main
git checkout -b cursor/web-sitemap-ec58
git am /path/to/tiltcheck-monorepo/docs/migration/tiltcheckmvp-patches/web-sitemap/*.patch
git push -u origin cursor/web-sitemap-ec58
```

When `git push` prompts for password, paste the **PAT** (not your GitHub password).

### 4. GitHub CLI alternative

```bash
gh auth login
gh repo clone jmenichole/tiltcheckmvp
# then apply patches and push as above
```

---

## Option B — Fix SSH

```bash
ssh -T git@github.com
```

Expected: `Hi jmenichole! You've successfully authenticated...`

| Error | Fix |
|-------|-----|
| `Permission denied (publickey)` | `ssh-keygen -t ed25519 -C "your@email"` → add pubkey to GitHub **Settings → SSH keys** |
| `Repository not found` | Wrong GitHub account on SSH key, or no repo access |
| `Permission denied to X` | SSH key belongs to another user — use HTTPS+PAT |

```bash
cd tiltcheckmvp
git remote set-url origin git@github.com:jmenichole/tiltcheckmvp.git
git push -u origin cursor/web-sitemap-ec58
```

---

## Option C — GitHub web UI

1. Create branch on https://github.com/jmenichole/tiltcheckmvp
2. Upload files from `docs/migration/tiltcheckmvp-web-seo/` (v1 monorepo)
3. Open PR manually

---

## Verify after push

```bash
git ls-remote origin 'cursor/*'
```

Open PRs: https://github.com/jmenichole/tiltcheckmvp/pulls

---

## Still stuck?

Paste the **exact error line** — `publickey`, `403`, and `Repository not found` each need different fixes.

Made for Degens. By Degens.
