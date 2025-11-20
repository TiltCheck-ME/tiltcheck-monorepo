# Migration Checklist (Individual Repos → Monorepo)

Use this checklist for each legacy repository you migrate into the TiltCheck monorepo.

## 1. Pre-Migration Assessment
- [ ] Identify repository name & purpose
- [ ] Confirm module maps to existing domain (suslink / justthetip / collectclock / trust-engine / freespsinscan / tiltcheck-core / poker-module)
- [ ] Audit license headers (remove if conflicting; internal only)
- [ ] Inventory env vars used
- [ ] Inventory external services used (RPC, APIs, wallets)
- [ ] Note Node & TypeScript versions
- [ ] List custom types that may move to `@tiltcheck/types`

## 2. Code Quality Gate
- [ ] Run linter (or add temporary) and capture warnings
- [ ] Run existing tests (if any)
- [ ] Ensure no hard-coded secrets
- [ ] Verify no custodial flows (fund custody, private keys)
- [ ] Identify dead code

## 3. Mapping to Monorepo Structure
Legacy → Monorepo:
```
/src/types      → packages/types (merge & dedupe)
/src/events     → services/event-router (convert to publish/subscribe calls)
/src/lib        → modules/<module-name>/src/lib
/.env.example   → apps/discord-bot/.env.example (if shared) or module README
/tests          → <module>/tests (Vitest)
```

## 4. Extraction Steps
- [ ] Create new module directory `modules/<name>/`
- [ ] Add `package.json` with workspace deps
- [ ] Add `tsconfig.json` extending root
- [ ] Copy source code → `src/` (exclude build artifacts)
- [ ] Replace internal event bus usage with `eventRouter.publish/subscribe`
- [ ] Move shared types to `packages/types` & import from there
- [ ] Remove duplicated utility code (prefer `discord-utils` or shared packages)

## 5. Refactor Pass
- [ ] Convert default exports to named exports (consistency)
- [ ] Ensure no cross-module relative traversal (`../../../` replaced by package imports)
- [ ] Add index barrel exports
- [ ] Add minimal README describing purpose / events consumed / events emitted
- [ ] Add registration snippet (if Discord commands needed)

## 6. Testing Setup
- [ ] Create `tests/` folder with baseline test
- [ ] Add Vitest config if missing
- [ ] Write at least one unit test for core logic
- [ ] Write one integration test using Event Router

## 7. Documentation
- [ ] Update `STATUS.md` with module state
- [ ] Update `docs/tiltcheck/10-data-models.md` if types changed
- [ ] Update `docs/tiltcheck/12-apis.md` if new exposed API surfaces
- [ ] Record migration date in CHANGELOG

## 8. Validation
- [ ] Run `pnpm build` at root (all packages pass)
- [ ] Run `pnpm test` (new tests pass)
- [ ] Confirm no orphan workspace deps
- [ ] Confirm module appears in `pnpm list --depth 0` as workspace

## 9. Cleanup
- [ ] Archive legacy repo (read-only) or mark deprecated in README
- [ ] Backfill tags/releases if needed
- [ ] Remove old CI (GitHub Actions) referencing legacy structure

## 10. Post-Migration Observability
- [ ] Add logging prefix `[ModuleName]` to new logs
- [ ] Add event counts instrumentation (future metrics hook)
- [ ] Verify Discord `/help` references new feature (if user facing)

## 11. Post-Migration Validation (Required)
- [ ] Run CI locally if possible:
	- `pnpm install && pnpm build && pnpm test && pnpm coverage`
- [ ] Verify coverage report exists under `coverage/` and key files are included
- [ ] Ensure `README.md` exists for the module (use `scripts/gen-readme-template.sh <module-path>` if missing)
- [ ] Update `STATUS.md` with coverage status and TODOs
- [ ] Smoke test event flow:
	- Publish a sample event and confirm it appears in `eventRouter.getHistory()`
	- Confirm downstream modules react (if applicable)

---
**Principles:**
- Non-custodial always
- Minimize duplication (centralize in `@tiltcheck/types`, `discord-utils`)
- Event-driven only (no direct cross-module imports for behavior)
- Keep modules small & cheap to run
