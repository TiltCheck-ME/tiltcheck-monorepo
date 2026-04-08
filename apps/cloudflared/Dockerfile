# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
# Cloudflare Tunnel daemon — routes public *.tiltcheck.me traffic to Railway internal services
# Token is injected via TUNNEL_TOKEN environment variable in Railway — never hardcode it.

FROM cloudflare/cloudflared:latest

# Run as non-root (cloudflared image supports this)
USER nonroot

# TUNNEL_TOKEN must be set in Railway environment variables
CMD ["tunnel", "--no-autoupdate", "run"]
