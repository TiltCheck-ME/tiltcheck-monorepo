© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-14

# Reverse Proxy Dead Code Cleanup

## Summary

The reverse proxy was **deleted in Wave 3 cleanup (March 11, 2026)** but references remained in docker-compose files, making them invalid.

**Status:** ✓ Fixed — Cleaned up broken references.

---

## What Was the Reverse Proxy?

An Nginx-based reverse proxy that handled:
- SSL/TLS termination
- Subdomain routing (dashboard, api, bot, etc.)
- Rate limiting per endpoint
- Security headers
- WebSocket upgrade for real-time services

**Created:** February 2025  
**Deleted:** March 11, 2026 (commit 4c62c74)  
**Reason for deletion:** Replaced by GCP Cloud Run's native ingress and Cloud Load Balancer

---

## Why It Was Removed

1. **GCP Cloud Run** provides native:
   - SSL/TLS termination
   - Host-based routing
   - Load balancing
   - Health checks

2. **Cloud Load Balancer** handles:
   - Rate limiting
   - Traffic distribution
   - DDoS protection (via Cloudflare)

3. **No need for VPS-based proxy** in modern containerized architecture

---

## Files Cleaned Up

### ✓ docker-compose.yml (lines 140-162)
- **Removed:** reverse-proxy service definition
- **Why:** Directory `apps/reverse-proxy/` doesn't exist (deleted in Wave 3)
- **Was breaking:** `docker-compose build` would fail with "Dockerfile not found"

### ✓ vps-docker-compose.yml (lines 117-135)
- **Removed:** reverse-proxy service definition
- **Why:** Same as above; references non-existent Dockerfile

### ✓ Validated syntax
```bash
docker-compose config --quiet    # ✓ Valid
docker-compose -f vps-docker-compose.yml config --quiet  # ✓ Valid
```

---

## Related Files Still Referencing Old Architecture

These should eventually be cleaned or updated:

1. **`Fixing Reverse Proxy.md`** — Historical troubleshooting guide for local Nginx setup. Can be archived.

2. **`DNS-ROUTING-GUIDE.md`** — Mentions Nginx reverse proxy. Should clarify that production routing is now via GCP Cloud Load Balancer + Cloudflare.

3. **`all_services_gcp.yaml`** — Correctly defines Cloud Run services with no reverse-proxy reference. ✓ Good to go.

---

## Current Routing Architecture

### Production (tiltcheck.me)
```
User Browser
    ↓
Cloudflare DNS (*.tiltcheck.me)
    ↓
GCP Cloud Load Balancer
    ↓
Cloud Run Services (api, web, bot, etc.)
```

### Local Dev (docker-compose)
```
localhost
    ↓
Docker network bridge
    ↓
Services (landing:8080, api:3001, etc.)
```
**Note:** No reverse proxy needed for local dev. Use individual service ports or add Nginx if needed, but don't reference the deleted `apps/reverse-proxy/`.

---

## Bottom Line

✓ **Dead code removed**  
✓ **Docker-compose files now valid**  
✓ **Cleaner monorepo structure**

The reverse proxy era is over. GCP Cloud Run handles all routing in production.
