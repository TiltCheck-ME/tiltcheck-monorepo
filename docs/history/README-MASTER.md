# TiltCheck Monorepo - Master README

**Built by a degen, for degens** 🎰

A comprehensive gambling harm reduction platform featuring Discord bot integration, browser extension, trust scoring, and responsible gaming tools.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Services & Apps](#services--apps)
5. [Development](#development)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Security Model](#security-model)
9. [Monitoring](#monitoring)
10. [Missing Features](#missing-features)
11. [Documentation](#documentation)
12. [Contributing](#contributing)

---

## Overview

TiltCheck is a monorepo containing multiple interconnected services designed to promote responsible gambling through:

- **Trust Scoring** - Evaluate casino trustworthiness based on multiple data sources
- **Tilt Detection** - Monitor and alert users when gambling patterns indicate tilt
- **Link Scanning** - Identify and warn about scam/phishing casino sites
- **Tip System** - Non-custodial SOL tipping via Discord (JustTheTip)
- **Browser Extension** - Real-time casino link analysis and trust indicators

### Key Features

✅ **Non-custodial** - No private key storage, users maintain full control  
✅ **Privacy-focused** - Minimal data collection, no bet tracking  
✅ **Open source** - Transparent operations and algorithms  
✅ **Multi-platform** - Discord bot, web API, browser extension  
✅ **Real-time monitoring** - Live dashboard and health checks  

---

## Architecture

### High-Level Structure

```
tiltcheck-monorepo/
├── apps/                    # Standalone applications
│   ├── discord-bot/        # Main Discord bot (slash commands)
│   ├── api/                # API Gateway (auth, tips, webhooks)
│   ├── chrome-extension/   # Browser extension for link scanning
│   └── dad-bot/            # DA&D (Degen Apologies & Donations) bot
├── services/               # Microservices
│   ├── dashboard/          # Real-time monitoring dashboard
│   ├── control-room/       # Admin panel
│   ├── trust-engines/      # Trust score calculation
│   ├── trust-rollup/       # Trust data aggregation
│   ├── event-router/       # Event distribution
│   ├── gameplay-analyzer/  # Tilt detection engine
│   ├── ai-gateway/         # OpenAI integration (with mocks)
│   ├── landing/            # Marketing landing page
│   └── [more services]/    
├── packages/               # Shared libraries
│   ├── types/              # TypeScript type definitions
│   ├── database/           # Supabase client wrapper
│   ├── discord-utils/      # Discord.js utilities
│   ├── monitoring/         # Sentry, metrics, logging
│   └── [more packages]/    
├── modules/                # Feature modules
│   ├── justthetip/         # SOL tipping system
│   ├── suslink/            # Link scanner
│   ├── collectclock/       # Casino bonus tracker
│   ├── tiltcheck-core/     # Tilt detection core
│   └── [more modules]/     
└── tests/                  # Integration tests
```

### Technology Stack

- **Runtime:** Node.js 18+
- **Package Manager:** pnpm 9+
- **Framework:** Discord.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL)
- **Blockchain:** Solana (via @solana/web3.js)
- **Testing:** Vitest
- **CI/CD:** GitHub Actions
- **Deployment:** Railway, Vercel, Docker

---

## Quick Start

### Prerequisites

- Node.js ≥18.0.0
- pnpm ≥9.0.0
- Git

### Installation

```bash
# 1. Clone repository
git clone https://github.com/jmenichole/tiltcheck-monorepo.git
cd tiltcheck-monorepo

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp .env.template .env
# Edit .env with your credentials

# 4. Verify setup
bash scripts/verify-setup.sh

# 5. Build all packages
pnpm build

# 6. Run all services (choose one)
pnpm dev                    # All services in parallel
pm2 start ecosystem.config.js  # Production-like with PM2
docker-compose up           # Docker containers
```

### Required Environment Variables

```bash
# Discord Bots
# Main TiltCheck Bot
TILT_DISCORD_TOKEN=         # Bot token
TILT_DISCORD_CLIENT_ID=     # OAuth client ID

# JustTheTip Bot
TIP_DISCORD_TOKEN=          # Bot token
TIP_DISCORD_CLIENT_ID=      # OAuth client ID

DISCORD_CLIENT_SECRET=      # OAuth client secret

# Database
SUPABASE_URL=               # Supabase project URL
SUPABASE_ANON_KEY=          # Public key
SUPABASE_SERVICE_ROLE_KEY=  # Admin key

# Security
JWT_SECRET=                 # Min 32 chars
SESSION_SECRET=             # Min 32 chars

# Blockchain
SOLANA_RPC_URL=             # Solana RPC endpoint
```

See [TILTCHECK-FULL-SCOPE-AUDIT.md](./TILTCHECK-FULL-SCOPE-AUDIT.md) for complete environment variable reference (93 total variables documented).

---

## Services & Apps

### Discord Bot (`apps/discord-bot`)

Main user interface via Discord slash commands.

**Commands:**
- `/ping` - Health check
- `/tip @user amount` - Tip SOL to another user
- `/trust casino <name>` - Get casino trust score
- `/trust user @user` - Get user trust metrics
- `/scan <url>` - Scan a casino link for threats
- `/tiltcheck` - Analyze your gambling patterns
- `/airdrop` - Distribute tokens (admin only)
- And more...

**Tech:** Discord.js 14.x, TypeScript  
**Health:** `http://localhost:8081/health`

### API Gateway (`apps/api`)

RESTful API for authentication and cross-service communication.

**Endpoints:**
- `POST /auth/discord` - Initiate Discord OAuth
- `GET /auth/discord/callback` - OAuth callback
- `POST /auth/refresh` - Refresh JWT
- `POST /tip` - Create tip transaction
- `GET /health` - Health check

**Tech:** Express, JWT, Supabase Auth  
**Port:** 3001

### Chrome Extension (`apps/chrome-extension`)

Browser extension for real-time casino link analysis.

**Features:**
- Auto-scan casino links on page load
- Color-coded trust indicators (green/yellow/red)
- Hover tooltips with scan details
- Manual scan requests
- Scam/phishing detection

**Tech:** Manifest V3, Content Scripts  
**Install:** Load unpacked from `apps/chrome-extension/dist/`

### Dashboard (`services/dashboard`)

Real-time monitoring dashboard for bot health and trust metrics.

**Features:**
- Bot status indicators
- Trust metric gauges
- Event log rotation (configurable retention)
- Evidence package management
- Anomaly detection alerts

**Port:** 5055  
**Tech:** Express, Server-Sent Events

### Trust Engines (`services/trust-engines`)

Calculate trust scores for casinos and users.

**Data Sources:**
- CasinoGuru API (or mocks)
- AskGamblers API (or mocks)
- Historical data
- User reports

**Scoring:** 0-100 scale with weighted factors

### JustTheTip Module (`modules/justthetip`)

Non-custodial SOL tipping system.

**Features:**
- Direct wallet-to-wallet transfers
- Optional fee: 0.0007 SOL
- No escrow or custody

**Tech:** @solana/web3.js, TypeScript

---

## Development

### Running Services Individually

```bash
# Discord Bot
pnpm --filter discord-bot dev

# API Gateway
pnpm --filter @tiltcheck/api dev

# Dashboard
pnpm --filter @tiltcheck/dashboard dev

# Landing Page
cd services/landing && pnpm dev
```

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm coverage

# Specific workspace
pnpm --filter discord-bot test
```

### Linting & Formatting

```bash
# Lint
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

### Building

```bash
# Build all packages
pnpm build

# Build specific workspace
pnpm --filter @tiltcheck/types build
```

---

## Testing

### Test Coverage

**Current:** 59 test files across services, packages, and modules  
**Goal:** 80% coverage for production

### Test Categories

1. **Unit Tests** - Individual functions and classes
2. **Integration Tests** - Cross-service interactions
3. **E2E Tests** - Complete workflows (planned)

### Running Specific Tests

```bash
# Discord bot commands
pnpm --filter discord-bot test

# API routes
pnpm --filter @tiltcheck/api test

# Trust engines
pnpm --filter @tiltcheck/trust-engines test
```

See [Test Stubs](#) for newly generated test scaffolds.

---

## Deployment

### Railway (Recommended for Bots/APIs)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy Discord bot
railway up --service discord-bot

# Deploy API
railway up --service api-gateway
```

### Docker

```bash
# Build images
docker-compose build

# Start all services
docker-compose up

# Start specific service
docker-compose up discord-bot
```

### Vercel (For Landing Page)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd services/landing
vercel --prod
```

---

## Security Model

### Non-Custodial Architecture

✅ **No private keys stored** - Users maintain full control  
✅ **No wallet custody** - Direct peer-to-peer transfers  
✅ **Transparent fees** - 0.0007 SOL clearly disclosed  
✅ **Open source** - All code publicly auditable  

### Data Minimization

- Minimal user data collection (Discord ID, wallet address only)
- No gambling transaction logging
- No bet amount tracking
- 7-day event log retention (configurable)

### Permissions & Intents

**Discord Bot Permissions:**
- Send Messages (required)
- Embed Links (required)
- Use Application Commands (required)
- Manage Messages (optional - for SusLink auto-delete)

**Discord Intents:**
- GUILDS (required)
- GUILD_MESSAGES (required)
- MESSAGE_CONTENT (optional - for SusLink auto-scan)

### Security Best Practices

- Environment variables never committed
- Secrets rotation policy
- Rate limiting on all endpoints
- HTTPS/TLS enforced in production
- Input validation and sanitization
- CSRF protection on web routes
- CodeQL security scanning

See [SECURITY.md](./SECURITY.md) for detailed security policies.

---

## Monitoring

### Error Tracking

**Tool:** Sentry (optional)

```typescript
import { initSentry, captureException } from '@tiltcheck/monitoring';

initSentry('my-service');

try {
  // ... code
} catch (error) {
  captureException(error, { context });
}
```

### Metrics Collection

```typescript
import { MetricsCollector } from '@tiltcheck/monitoring/metrics';

const metrics = new MetricsCollector('my-service');
metrics.increment('commands.executed');
metrics.gauge('memory.usage', process.memoryUsage().heapUsed);
await metrics.flush();
```

### Health Checks

All services expose `/health` endpoints:

```bash
# Discord Bot
curl http://localhost:8081/health

# API Gateway
curl http://localhost:3001/health

# Dashboard
curl http://localhost:5055/health
```

### Log Aggregation

**Tool:** Logflare (optional)

```typescript
import { sendToLogflare } from '@tiltcheck/monitoring/logflare';

sendToLogflare({
  level: 'error',
  message: 'Something went wrong',
  service: 'discord-bot',
});
```

See [packages/monitoring/README.md](./packages/monitoring/README.md) for full monitoring guide.

---

## Missing Features

The following features are documented but not yet implemented:

### High Priority

- [ ] Supabase schema setup documentation
- [ ] Discord OAuth redirect URI configuration guide
- [ ] Database migration scripts
- [ ] Full test coverage for Discord bot commands (stubs exist)
- [ ] Input validation on all bot commands
- [ ] Rate limiting on API routes

### Medium Priority

- [ ] Admin user management UI in control room
- [ ] Audit logging for sensitive operations
- [ ] Event log viewer in control room
- [ ] E2E workflow tests
- [ ] Performance/load tests
- [ ] Stripe webhook setup guide

### Low Priority

- [ ] API reference documentation
- [ ] Architecture diagrams
- [ ] Video tutorials
- [ ] Advanced alerting rules
- [ ] Custom metrics dashboard

See [TILTCHECK-FULL-SCOPE-AUDIT.md](./TILTCHECK-FULL-SCOPE-AUDIT.md) for complete gap analysis.

---

## Documentation

### Main Docs

- [TILTCHECK-FULL-SCOPE-AUDIT.md](./TILTCHECK-FULL-SCOPE-AUDIT.md) - **Comprehensive audit** (93 env vars, testing gaps, security review)
- [QUICKSTART.md](./QUICKSTART.md) - Quick setup guide
- [SETUP.md](./SETUP.md) - Detailed setup instructions
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](./SECURITY.md) - Security policies
- [CHANGELOG.md](./CHANGELOG.md) - Version history

### Service-Specific Docs

- [Discord Bot Setup](./apps/discord-bot/README.md)
- [API Documentation](./apps/api/README.md)
- [Extension Development](./apps/chrome-extension/README.md)
- [Monitoring Guide](./packages/monitoring/README.md)

### Operational Docs

- [Deployment Guide](./DEPLOYMENT.md)
- [Docker Guide](./DOCKER.md)
- [Railway Deployment](./RAILWAY_DEPLOY.md)
- [Environment Setup](./ENV-SETUP.md)

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Run linter (`pnpm lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- TypeScript for all new code
- ESLint + Prettier for formatting
- Vitest for testing
- Conventional Commits for commit messages

---

## License

UNLICENSED - Internal use only

---

## Support

- **Issues:** [GitHub Issues](https://github.com/jmenichole/tiltcheck-monorepo/issues)
- **Discord:** [TiltCheck Community](#) (coming soon)
- **Email:** support@tiltcheck.me

---

## Acknowledgments

Built with:
- Discord.js
- Solana Web3.js
- Supabase
- Express
- TypeScript
- Vitest
- And many other amazing open-source projects

**Responsible Gaming Reminder:** TiltCheck is a harm reduction tool. If you or someone you know has a gambling problem, please seek help:
- **National Council on Problem Gambling:** 1-800-522-4700
- **Gamblers Anonymous:** https://www.gamblersanonymous.org/

---

**Last Updated:** December 7, 2025  
**Version:** 0.1.0  
**Status:** Active Development
