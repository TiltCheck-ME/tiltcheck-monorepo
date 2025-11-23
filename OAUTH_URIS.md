# TiltCheck Ecosystem - Discord OAuth Redirect URIs

## Domain: tiltcheck.it.com

This document contains all Discord OAuth2 redirect URIs for the TiltCheck ecosystem using the `tiltcheck.it.com` domain.

---

## Game Arena (Degens Against Decency & Poker)

**Subdomain**: `arena.tiltcheck.it.com`

**Discord OAuth Redirect URIs**:
```
https://arena.tiltcheck.it.com/auth/discord/callback
```

**Discord Application Setup**:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select/Create "TiltCheck Game Arena" application
3. OAuth2 → General → Redirects → Add:
   - `https://arena.tiltcheck.it.com/auth/discord/callback`
4. Save changes
5. Copy Client ID and Client Secret for deployment

**Environment Variables**:
```env
DISCORD_CLIENT_ID=<from_discord_app>
DISCORD_CLIENT_SECRET=<from_discord_app>
DISCORD_CALLBACK_URL=https://arena.tiltcheck.it.com/auth/discord/callback
```

---

## JustTheTip (JT)

**Subdomain**: `jt.tiltcheck.it.com`

**Discord OAuth Redirect URIs**:
```
https://jt.tiltcheck.it.com/auth/discord/callback
```

**Discord Application Setup**:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select/Create "JustTheTip" application
3. OAuth2 → General → Redirects → Add:
   - `https://jt.tiltcheck.it.com/auth/discord/callback`
4. Save changes

**Environment Variables**:
```env
DISCORD_CLIENT_ID=<from_discord_app>
DISCORD_CLIENT_SECRET=<from_discord_app>
DISCORD_CALLBACK_URL=https://jt.tiltcheck.it.com/auth/discord/callback
```

---

## QualifyFirst (QF)

**Subdomain**: `qf.tiltcheck.it.com`

**Discord OAuth Redirect URIs**:
```
https://qf.tiltcheck.it.com/auth/discord/callback
```

**Discord Application Setup**:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select/Create "QualifyFirst" application
3. OAuth2 → General → Redirects → Add:
   - `https://qf.tiltcheck.it.com/auth/discord/callback`
4. Save changes

**Environment Variables**:
```env
DISCORD_CLIENT_ID=<from_discord_app>
DISCORD_CLIENT_SECRET=<from_discord_app>
DISCORD_CALLBACK_URL=https://qf.tiltcheck.it.com/auth/discord/callback
```

---

## Degens Against Decency Standalone (DG)

**Subdomain**: `dg.tiltcheck.it.com`

**Discord OAuth Redirect URIs**:
```
https://dg.tiltcheck.it.com/auth/discord/callback
```

**Discord Application Setup**:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select/Create "Degens Against Decency" application
3. OAuth2 → General → Redirects → Add:
   - `https://dg.tiltcheck.it.com/auth/discord/callback`
4. Save changes

**Environment Variables**:
```env
DISCORD_CLIENT_ID=<from_discord_app>
DISCORD_CLIENT_SECRET=<from_discord_app>
DISCORD_CALLBACK_URL=https://dg.tiltcheck.it.com/auth/discord/callback
```

---

## Main Dashboard

**Subdomain**: `dashboard.tiltcheck.it.com` or `www.tiltcheck.it.com`

**Discord OAuth Redirect URIs**:
```
https://dashboard.tiltcheck.it.com/auth/discord/callback
https://www.tiltcheck.it.com/auth/discord/callback
```

**Discord Application Setup**:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select/Create "TiltCheck Dashboard" application
3. OAuth2 → General → Redirects → Add:
   - `https://dashboard.tiltcheck.it.com/auth/discord/callback`
   - `https://www.tiltcheck.it.com/auth/discord/callback`
4. Save changes

**Environment Variables**:
```env
DISCORD_CLIENT_ID=<from_discord_app>
DISCORD_CLIENT_SECRET=<from_discord_app>
DISCORD_CALLBACK_URL=https://dashboard.tiltcheck.it.com/auth/discord/callback
```

---

## Development URIs

For local development, also add these to each Discord application:

```
http://localhost:3000/auth/discord/callback    # General dev
http://localhost:3010/auth/discord/callback    # Game Arena dev
http://localhost:3001/auth/discord/callback    # JustTheTip dev
http://localhost:3002/auth/discord/callback    # QualifyFirst dev
http://localhost:3003/auth/discord/callback    # DG dev
http://localhost:8080/auth/discord/callback    # Alternative port
```

---

## Quick Reference Table

| Service | Subdomain | OAuth Callback URL |
|---------|-----------|-------------------|
| **Game Arena** | `arena.tiltcheck.it.com` | `https://arena.tiltcheck.it.com/auth/discord/callback` |
| **JustTheTip** | `jt.tiltcheck.it.com` | `https://jt.tiltcheck.it.com/auth/discord/callback` |
| **QualifyFirst** | `qf.tiltcheck.it.com` | `https://qf.tiltcheck.it.com/auth/discord/callback` |
| **Degens (Standalone)** | `dg.tiltcheck.it.com` | `https://dg.tiltcheck.it.com/auth/discord/callback` |
| **Dashboard** | `dashboard.tiltcheck.it.com` | `https://dashboard.tiltcheck.it.com/auth/discord/callback` |
| **Main Site** | `www.tiltcheck.it.com` | `https://www.tiltcheck.it.com/auth/discord/callback` |

---

## DNS Configuration

Ensure these subdomains are configured in your DNS provider:

```
A/AAAA Records or CNAME:
- arena.tiltcheck.it.com → [deployment IP/hostname]
- jt.tiltcheck.it.com → [deployment IP/hostname]
- qf.tiltcheck.it.com → [deployment IP/hostname]
- dg.tiltcheck.it.com → [deployment IP/hostname]
- dashboard.tiltcheck.it.com → [deployment IP/hostname]
- www.tiltcheck.it.com → [deployment IP/hostname]
```

---

## SSL/TLS Certificates

All services require HTTPS. Use:
- **Cloudflare** (automatic SSL)
- **Let's Encrypt** (free SSL certificates)
- **Railway/Render/Heroku** (automatic SSL on custom domains)

---

## Deployment Checklist

For each service:

- [ ] Configure DNS subdomain
- [ ] Set up Discord OAuth application
- [ ] Add redirect URI to Discord app
- [ ] Set environment variables in deployment platform
- [ ] Verify SSL certificate is active
- [ ] Test OAuth flow
- [ ] Configure Supabase secrets (if using database)

---

## Security Notes

1. **Never commit** Discord Client Secrets to git
2. Use **Dependabot Secrets** or deployment platform secrets
3. Rotate secrets periodically
4. Use different Discord applications for dev/staging/prod
5. Monitor OAuth usage in Discord Developer Portal

---

## Support

If you encounter OAuth issues:
1. Verify redirect URI exactly matches (including protocol, domain, path)
2. Check Discord application has correct scopes enabled
3. Verify environment variables are set correctly
4. Check SSL certificate is valid
5. Review Discord Developer Portal audit log

---

**Last Updated**: 2025-11-23
**Domain**: tiltcheck.it.com
**Ecosystem**: TiltCheck
