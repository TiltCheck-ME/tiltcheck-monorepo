# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
# Cloudflare Tunnel daemon — routes public *.tiltcheck.me traffic to backend services.
# Token is injected via TUNNEL_TOKEN environment variable — never hardcode it.
# Backend may be Railway (*.railway.internal) or Docker Compose (service names).

FROM cloudflare/cloudflared:latest

# Run as non-root (cloudflared image supports this)
USER nonroot

# TUNNEL_TOKEN must be set in Railway environment variables
CMD ["tunnel", "--no-autoupdate", "run"]
