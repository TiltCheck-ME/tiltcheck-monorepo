# TiltCheck Monorepo - Developer Guide

This document provides a foundational overview of the TiltCheck ecosystem architecture, standards, and development roadmap.

## 1. Project Architecture

The TiltCheck monorepo is managed via **pnpm** and structured into three primary top-level directories:

- **`apps/`**: Service-level applications and user interfaces.
  - `api`: Central Express-based gateway and business logic.
  - `dashboard`: Next.js frontend for users and administrators.
  - `chrome-extension`: Browser-based security and session tracking tools.
  - `discord-bot`: Community integration and tipping handlers.
  - `reverse-proxy`: Nginx configuration for unified routing.
- **`packages/`**: Shared libraries and utilities.
  - `@tiltcheck/types`: The single source of truth for all TypeScript interfaces.
  - `@tiltcheck/db`: Shared PostgreSQL client using Neon/pg.
  - `@tiltcheck/config`: Centralized environment validation and schema management.
  - `@tiltcheck/auth`: Unified JWT and OAuth logic.
- **`modules/`**: Domain-specific logic encapsulated for reuse.
  - `tiltcheck-core`: Core tilt detection, cooldown management, and nudge generation.
  - `justthetip`: Specialized tipping logic.

## 2. Key Dependencies

- **Runtime**: Node.js (>=18.0.0)
- **Language**: TypeScript (Strict Mode)
- **Backend**: Express, Zod (Validation), pg (PostgreSQL)
- **Frontend**: Next.js 16 (Dashboard), Vite (Landing Page)
- **Infrastructure**: Nginx, Cloudflare Workers, Neon (DB), Supabase (Auth/Storage)
- **Tools**: Vitest (Testing), ESLint, Prettier

## 3. Coding Style Guidelines

- **TypeScript Standards**:
  - **No `any`**: All new code must use proper interfaces from `@tiltcheck/types`.
  - **Explicit Imports**: Use explicit `.js` extensions in imports when working in `apps/api` (NodeNext compatibility).
  - **Shared Types**: Never define duplicate interfaces in local apps; contribute to `@tiltcheck/types` instead.
- **Service Logic**:
  - **Validation First**: Always use `@tiltcheck/config` for environment variables and Zod for API request payloads.
  - **Fail Fast**: Throw descriptive errors using the shared error factory where possible.
- **Architecture Patterns**:
  - **Centralized Events**: Use `@tiltcheck/event-router` for cross-service communication.
  - **Stateless API**: Keep the central API stateless; use Supabase or PostgreSQL for persistence.

## 4. Prioritized TODO List

Based on current file structure and codebase status:

### High Priority (Stability & Types)
- [ ] **Type Refinement**: Conduct a monorepo-wide sweep to replace remaining `any` types with defined interfaces in `@tiltcheck/types`.
- [ ] **Standardize Builds**: Ensure all `apps` and `packages` follow the `dist/` output pattern and maintain clean `src/` directories.
- [ ] **Error Factory Integration**: Transition all services to use the `@tiltcheck/error-factory` for consistent API responses.

### Medium Priority (Feature Completeness)
- [ ] **Buddy System V2**: Finalize the "Phone a Friend" accountability system in the Chrome Extension and Dashboard.
- [ ] **Predictive AI Drops**: Improve AI Predictor logic in `CollectClock` for Instagram/Social drops.
- [ ] **Compliance Edge**: Implement Geo-Compliance checks in the Cloudflare Worker layer.

### Low Priority (Developer Experience)
- [ ] **Shared Testing Utils**: Consolodate test mocks into a `@tiltcheck/test-utils` package.
- [ ] **Documentation**: Generate API documentation from Zod schemas and TypeScript interfaces.

---
*Created by Gemini CLI — 2026-03-10*
