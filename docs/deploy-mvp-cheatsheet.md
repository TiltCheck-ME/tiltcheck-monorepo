# MVP Deploy Cheat Sheet

```bash
# 1) Local gates
pnpm --filter @tiltcheck/lockvault test && pnpm --filter @tiltcheck/api test && pnpm --filter @tiltcheck/discord-bot build && pnpm --filter @tiltcheck/core build && pnpm --filter @tiltcheck/landing-page build

# 2) Deploy to VPS
bash deploy-vps.sh

# 3) Quick VPS checks
ssh jme@85.209.95.175 "cd /home/jme/tiltcheck-monorepo && docker compose ps && docker compose logs --tail=120 api discord-bot landing reverse-proxy"

# 4) API health
ssh jme@85.209.95.175 "curl -fsS http://localhost:3001/health"

# 5) Live logs (optional)
ssh jme@85.209.95.175 "cd /home/jme/tiltcheck-monorepo && docker compose logs -f"
```

## Manual Smoke (5 minutes)

- Extension popup opens and toggles sidebar.
- Lock funds -> timer counts down -> release works.
- Vault timeline shows created/extended/auto-unlocked events.
- Discord `/vault status` and `/vault unlock` respond correctly.
- Web home/getting-started/extension pages load and reflect MVP.

## Emergency Rollback

```bash
ssh jme@85.209.95.175
cd /home/jme/tiltcheck-monorepo
git log --oneline -n 20
git checkout <known_good_commit>
docker compose up -d --build
```
