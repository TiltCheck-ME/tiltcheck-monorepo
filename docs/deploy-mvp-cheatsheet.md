<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 -->
# MVP Deploy Cheat Sheet (VPS-Free)

```bash
# 1) Local gates
pnpm --filter @tiltcheck/lockvault test && pnpm --filter @tiltcheck/api test && pnpm --filter @tiltcheck/discord-bot build && pnpm --filter @tiltcheck/core build && pnpm --filter @tiltcheck/landing-page build

# 2) Deploy web (Vercel)
# - Deploy project rooted at apps/web
# - Domain should point to that deployment

# 3) Deploy runtime services (Railway or Render)
# - apps/api
# - apps/discord-bot
# - apps/trust-rollup (if needed)

# 4) API health
curl -fsS https://api.tiltcheck.me/health

# 5) Beta tool smoke checks
bash scripts/mvp-beta-tools-smoke.sh https://tiltcheck.me

# 6) Optional local fallback (single host)
docker compose -f docker-compose.mvp.yml up -d --build
```

## Manual Smoke (5 minutes)

- Extension popup opens and toggles sidebar.
- Lock funds -> timer counts down -> release works.
- Vault timeline shows created/extended/auto-unlocked events.
- Discord `/vault status` and `/vault unlock` respond correctly.
- Web home/getting-started/extension pages load and reflect MVP.
- Beta pages load: `/beta-tester`, `/tools/justthetip`, `/tools/domain-verifier`, `/tools/collectclock`, `/tools/verify`.

## Emergency Rollback

```bash
# Web: rollback in Vercel UI to previous deployment
# Runtime: rollback in Railway/Render to previous deployment
# Optional fallback host only:
docker compose -f docker-compose.mvp.yml down
docker compose -f docker-compose.mvp.yml up -d --build
```
