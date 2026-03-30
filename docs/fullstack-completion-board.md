## Fullstack Completion Board

Last updated: 2026-03-29

### P0 (Release blockers)

- [x] **API route ambiguity fix**  
  Files: `apps/api/src/routes/user.ts`  
  Acceptance:
  - no duplicate handler implementations for same semantic route
  - static routes resolve before dynamic `/:discordId`
  - canonical `/user/:discordId` payload remains backward compatible

- [x] **OAuth redirect hardening**  
  Files: `apps/api/src/routes/auth.ts`  
  Acceptance:
  - unsafe redirect URLs rejected at login entrypoint
  - callback redirect cookie validated before redirect
  - default fallback used when redirect cookie is unsafe

- [ ] **Test runner reliability restoration**  
  Scope: workspace vitest install/runtime consistency  
  Acceptance:
  - `pnpm --filter @tiltcheck/api test -- tests/routes/auth-oauth-state.test.ts` passes
  - `pnpm -r test -- --passWithNoTests` no longer fails with missing vitest modules

- [ ] **Typecheck gate restoration**  
  Scope: `packages/agent`, `apps/trust-rollup`  
  Acceptance:
  - `pnpm -r typecheck` passes cleanly

- [ ] **Route/link integrity pass (web user journey)**  
  Scope: `apps/web/src/config/features.ts`, nav/footer route targets  
  Acceptance:
  - no links to non-existent routes
  - route map matches implemented surfaces

### P1 (Correctness + security hardening)

- [ ] Replace unsafe UI rendering paths (`innerHTML`) in game/lobby/profile surfaces with safe DOM APIs
- [ ] Add targeted regression tests for XSS sink prevention in arena and extension-adjacent render paths
- [ ] Consolidate extension sidebar implementation to one source-of-truth (`src/sidebar/*`)

### P2 (Completion and production quality)

- [ ] Finalize monetization route chain (pricing page + entitlement enforcement + upgrade callback sync)
- [ ] Update stale READMEs and route inventory docs to current architecture
- [ ] Add CI release gates: lint + test + typecheck + build + audit policy

### Notes

- Current known environment blocker: Vitest runtime module resolution failures prevent local test execution despite targeted test additions.
- Keep fixes minimal-risk and reversible for auth/security-sensitive paths.
