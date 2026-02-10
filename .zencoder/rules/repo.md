---
description: Repository Information Overview
alwaysApply: true
---

# TiltCheck Monorepo Information

## Repository Summary
TiltCheck is a modular, AI-assisted ecosystem designed to enhance safety and transparency in Discord-based casino communities. It provides a suite of interoperable tools for scam detection (**SusLink**), bonus tracking (**CollectClock**), tilt detection (**TiltCheck Core**), and casino/user trust scoring. The system is built with a Discord-first philosophy, utilizing a non-custodial and serverless-optimized architecture.

## Repository Structure
The project is organized as a **pnpm monorepo** with the following directory structure:

### Main Repository Components
- **apps/**: User-facing applications, including the primary `discord-bot` and the `web` frontend.
- **services/**: Infrastructure and backend services such as `event-router`, `ai-gateway`, `dashboard`, `landing`, and `trust-rollup`.
- **modules/**: Independent business logic modules (e.g., `suslink`, `justthetip`, `tiltcheck-core`, `freespinscan`).
- **packages/**: Shared libraries for `types`, `config`, `utils`, `validator`, and `database` interactions.
- **bot/**, **backend/**, **frontend/**: Top-level entry points for the bot, game arena backend, and main frontend.

## Projects

### Core Ecosystem (Monorepo Root)
**Configuration File**: [./package.json](./package.json)

#### Language & Runtime
**Language**: TypeScript  
**Version**: Node.js >=18.0.0, pnpm >=9.0.0  
**Build System**: Custom ordered build script ([./scripts/ordered-build.sh](./scripts/ordered-build.sh))  
**Package Manager**: pnpm

#### Dependencies
**Main Dependencies**:
- `discord.js`: Bot framework
- `express`: Web server framework
- `openai`: AI integration (via AI Gateway)
- `react`: Frontend UI (for web apps)
- `vitest`: Testing framework
- `supabase`: Database and auth services

#### Build & Installation
```bash
# Install dependencies
pnpm install

# Build all projects in order
pnpm build

# Run development mode for all
pnpm dev
```

#### Docker
**Dockerfile**: Multiple, e.g., [./apps/discord-bot/Dockerfile](./apps/discord-bot/Dockerfile), [./services/dashboard/Dockerfile](./services/dashboard/Dockerfile)  
**Configuration**: Centralized [./docker-compose.yml](./docker-compose.yml) for multi-service deployment.  
**Services**: `reverse-proxy`, `landing`, `dashboard`, `discord-bot`, `trust-rollup`.

#### Testing
**Framework**: Vitest  
**Test Location**: Distributed across subprojects (e.g., `src/**/*.test.ts`)  
**Configuration**: [./vitest.config.ts](./vitest.config.ts) (if present) or per-package config.  
**Run Command**:
```bash
# Run all tests
pnpm test:all

# Run root level tests
pnpm test
```

### Discord Bot
**Configuration File**: [./apps/discord-bot/package.json](./apps/discord-bot/package.json)

#### Language & Runtime
**Language**: TypeScript  
**Build System**: tsc  
**Entry Point**: `src/index.ts`

#### Build & Installation
```bash
# Deploy slash commands
pnpm --filter @tiltcheck/discord-bot deploy:commands

# Start in dev mode
pnpm --filter @tiltcheck/discord-bot dev
```

### AI Gateway
**Configuration File**: [./services/ai-gateway/package.json](./services/ai-gateway/package.json)

#### Key Resources
- **Main Files**: `server.js`, `src/index.js`
- **Functionality**: Handles survey matching, card generation, moderation, and tilt detection via OpenAI.

#### Usage & Operations
```bash
# Start AI Gateway
pnpm --filter @tiltcheck/ai-gateway start
```

### Shared Packages
**Location**: `packages/*`
**Main Modules**:
- `@tiltcheck/types`: Common TypeScript definitions.
- `@tiltcheck/event-router`: Centralized event communication.
- `@tiltcheck/config`: Shared configuration management.
- `@tiltcheck/utils`: Common utility functions.
