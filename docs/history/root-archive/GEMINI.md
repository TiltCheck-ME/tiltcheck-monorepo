# TiltCheck Monorepo - Developer Guide

This document provides a foundational overview of the TiltCheck ecosystem architecture, standards, and development roadmap.

## Core Mission
"Redeem-to-Win" - Our primary goal is to shift the definition of a "win." Instead of encouraging endless play, TiltCheck actively nudges users to cash out (redeem) their winnings once they cross a profitable threshold. The core mission is to help users secure wins, not just prevent losses.


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
- **Infrastructure**: Google Cloud Platform (GCP)
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

- [ ] **Type Refinement**: Continue the remaining `any` cleanup, starting with high-churn debt in `apps/api` and `apps/chrome-extension` before widening the sweep.
- [x] **Standardize UI/Sitemap**: Audited `apps/web` and implemented shared nav/footer across all 70+ HTML files.
- [ ] **Error Factory Integration**: Finish transitioning remaining API routes and middleware to `@tiltcheck/error-factory` for consistent responses.

### Medium Priority (Feature Completeness)

- [ ] **Buddy System V2**: Finish the remaining end-to-end accountability flow now that buddy management, dashboard handoff, and extension notifications already exist.
- [x] **RTP Scanner Consolidation**: Merged `BonusCheck` and `CollectClock` logic into the `bonuses.html` scanner.
- [ ] **Geo-Regulation Awareness**: Expand the existing geo-laws tool with better coverage, freshness, and region-aware routing.

### Low Priority (Developer Experience)

- [x] **Shared Testing Utils**: Consolidated shared mocks and helpers into `@tiltcheck/test-utils`.
- [x] **Documentation Sync**: Sitemap documented in `docs/sitemap_overview.md` and `site-map.html` updated.
- [ ] **API Documentation**: Generate API documentation from Zod schemas and TypeScript interfaces.

---

### *Created by Gemini CLI — 2026-03-10*

