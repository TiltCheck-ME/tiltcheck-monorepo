---
description: Repository Information Overview
alwaysApply: true
---

# TiltCheck Ecosystem Information

## Repository Summary
TiltCheck is a modular, AI-assisted ecosystem designed for **Responsible Gaming as a Service (RGaaS)**. It provides tools for scam reduction, bonus tracking, tilt detection, and trust scoring for online casino communities, primarily focused on Discord-first, non-custodial implementations.

## Repository Structure
The project is a **TypeScript monorepo** managed with **pnpm workspaces**.
- **apps/**: User-facing applications (Discord bot, web frontend, dashboard).
- **services/**: Backend infrastructure and core logic services.
- **modules/**: Domain-specific business logic (e.g., SusLink, JustTheTip).
- **packages/**: Shared libraries and utilities (e.g., event-router, types, config).
- **scripts/**: Utility and CI/CD scripts.
- **docs/**: Comprehensive documentation of the ecosystem.

### Main Repository Components
- **Discord Bot**: Main entry point for community interaction (`apps/discord-bot`).
- **Web App**: React/Vite-based frontend (`apps/web`).
- **Trust Engines**: Services for scoring casinos and users (`services/trust-rollup`).
- **Event Router**: Core communication layer for modular interoperability.

## Projects

### Discord Bot (@tiltcheck/discord-bot)
**Configuration File**: `apps/discord-bot/package.json`

#### Language & Runtime
**Language**: TypeScript  
**Version**: Node.js >= 18.0.0  
**Build System**: pnpm / tsc  
**Package Manager**: pnpm

#### Dependencies
**Main Dependencies**:
- `discord.js`: Bot framework
- `@tiltcheck/event-router`: Shared event logic
- `@tiltcheck/types`: Shared type definitions

#### Build & Installation
```bash
pnpm install
pnpm --filter @tiltcheck/discord-bot build
```

#### Docker
**Dockerfile**: `apps/discord-bot/Dockerfile`
**Configuration**: Orchestrated via `docker-compose.yml`.

#### Testing
**Framework**: Vitest
**Run Command**:
```bash
pnpm --filter @tiltcheck/discord-bot test
```

### Web Application (@tiltcheck/web)
**Configuration File**: `apps/web/package.json`

#### Language & Runtime
**Language**: TypeScript / React  
**Build System**: Vite  
**Package Manager**: pnpm

#### Dependencies
**Main Dependencies**:
- `react`: Frontend library
- `react-dom`: DOM binding

#### Build & Installation
```bash
pnpm --filter @tiltcheck/web build
```

### Trust Rollup Service (@tiltcheck/trust-rollup)
**Configuration File**: `services/trust-rollup/package.json`

#### Language & Runtime
**Language**: TypeScript  
**Build System**: tsc  
**Package Manager**: pnpm

#### Dependencies
**Main Dependencies**:
- `zod`: Schema validation
- `@tiltcheck/event-router`: Event communication

#### Docker
**Dockerfile**: `services/trust-rollup/Dockerfile`
**Configuration**: Provides trust scoring logic, connected via `docker-compose.yml`.

### Modules (e.g., @tiltcheck/suslink)
**Configuration File**: `modules/suslink/package.json`
**Type**: Domain logic module

#### Usage & Operations
**Key Commands**:
```bash
pnpm --filter @tiltcheck/suslink build
```

## Docker Configuration
The repository features a "One-Launch" deployment setup.
- **docker-compose.yml**: Orchestrates `reverse-proxy`, `landing`, `dashboard`, `discord-bot`, and `trust-rollup`.
- **Dockerfiles**: Present in root and specific service directories (`Dockerfile`, `Dockerfile.railway`, `Dockerfile.bots`).

## Testing & Validation
- **Framework**: **Vitest** is used globally and locally.
- **Quality Checks**: ESLint, Prettier, and automated accessibility audits (`pa11y`, `lighthouse`).
- **Run Command**:
```bash
pnpm test        # Run root tests
pnpm test:all    # Run all workspace tests
pnpm audit:all   # Run comprehensive a11y and component audits
```
