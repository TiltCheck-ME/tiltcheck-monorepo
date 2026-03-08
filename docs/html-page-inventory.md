# HTML Page Inventory

Generated: 2026-03-08T07:26:43.919Z

## Summary

- Total HTML files: **98**
- production page: **40**
- production tool: **7**
- error page: **3**
- admin internal: **4**
- docs: **31**
- component partial: **4**
- app surface: **8**
- archive candidate: **1**

## Action model

- **Keep (wired)**: production pages already on shared nav + loader, or app-specific shells that are actively served.
- **Keep (custom auth/system)**: intentionally minimal auth/callback/health pages.
- **Wire**: page should be public but still uses legacy or custom nav inconsistent with shared pattern.
- **Archive/Delete candidate**: obsolete or superseded page (keep only if explicitly needed).

## Production pages (`apps/web/*.html`)

| File | Wiring | Suggested action | Notes |
|---|---|---|---|
| `apps/web/about.html` | shared-nav wired | keep (wired) |  |
| `apps/web/auth/callback.html` | custom/no-shared-nav | keep (custom auth/system) | Intentional standalone auth/health shell. |
| `apps/web/beta.html` | shared-nav wired | keep (wired) |  |
| `apps/web/casino-reviews.html` | shared-nav wired | keep (wired) |  |
| `apps/web/casinos.html` | shared-nav wired | keep (wired) |  |
| `apps/web/chrome-extension-subscription.html` | shared-nav wired | keep (wired) |  |
| `apps/web/compliance.html` | shared-nav wired | keep (wired) |  |
| `apps/web/component-gallery.html` | shared-nav wired | keep (wired) |  |
| `apps/web/contact.html` | shared-nav wired | keep (wired) |  |
| `apps/web/cookie-policy.html` | shared-nav wired | keep (wired) |  |
| `apps/web/dashboard/index.html` | custom/no-shared-nav | keep (custom auth/system) | Intentional standalone auth/health shell. |
| `apps/web/degen-trust.html` | shared-nav wired | keep (wired) |  |
| `apps/web/extension.html` | shared-nav wired | keep (wired) |  |
| `apps/web/faq.html` | shared-nav wired | keep (wired) |  |
| `apps/web/getting-started.html` | shared-nav wired | keep (wired) |  |
| `apps/web/glossary.html` | shared-nav wired | keep (wired) |  |
| `apps/web/help-chatbot.html` | shared-nav wired | keep (wired) |  |
| `apps/web/help.html` | shared-nav wired | keep (wired) |  |
| `apps/web/how-it-works.html` | shared-nav wired | keep (wired) |  |
| `apps/web/index.html` | shared-nav wired | keep (wired) |  |
| `apps/web/licensing.html` | shared-nav wired | keep (wired) |  |
| `apps/web/login.html` | custom/no-shared-nav | keep (custom auth/system) | Intentional standalone auth/health shell. |
| `apps/web/newsletter.html` | shared-nav wired | keep (wired) |  |
| `apps/web/press-kit.html` | shared-nav wired | keep (wired) |  |
| `apps/web/privacy.html` | shared-nav wired | keep (wired) |  |
| `apps/web/responsible-gambling.html` | shared-nav wired | keep (wired) |  |
| `apps/web/scam-reports.html` | shared-nav wired | keep (wired) |  |
| `apps/web/search.html` | shared-nav wired | keep (wired) |  |
| `apps/web/settings.html` | shared-nav wired | keep (wired) |  |
| `apps/web/site-map.html` | shared-nav wired | keep (wired) |  |
| `apps/web/stats-dashboard.html` | shared-nav wired | keep (wired) |  |
| `apps/web/status.html` | custom/no-shared-nav | keep (custom auth/system) | Intentional standalone auth/health shell. |
| `apps/web/terms.html` | shared-nav wired | keep (wired) |  |
| `apps/web/testimonials.html` | shared-nav wired | keep (wired) |  |
| `apps/web/transparency-reports.html` | shared-nav wired | keep (wired) |  |
| `apps/web/trust-api.html` | shared-nav wired | keep (wired) |  |
| `apps/web/trust-explained.html` | shared-nav wired | keep (wired) |  |
| `apps/web/trust-scores.html` | shared-nav wired | keep (wired) |  |
| `apps/web/trust.html` | shared-nav wired | keep (wired) |  |
| `apps/web/tutorials.html` | shared-nav wired | keep (wired) |  |

## Tool pages (`apps/web/tools/*.html`)

| File | Wiring | Suggested action | Notes |
|---|---|---|---|
| `apps/web/tools/collectclock.html` | shared-nav wired | keep (wired) |  |
| `apps/web/tools/daad.html` | shared-nav wired | keep (wired) |  |
| `apps/web/tools/justthetip.html` | shared-nav wired | keep (wired) |  |
| `apps/web/tools/poker.html` | shared-nav wired | keep (wired) |  |
| `apps/web/tools/suslink.html` | shared-nav wired | keep (wired) |  |
| `apps/web/tools/tiltcheck-core.html` | shared-nav wired | keep (wired) |  |
| `apps/web/tools/triviadrops.html` | shared-nav wired | keep (wired) |  |

## Admin/internal pages

| File | Wiring | Suggested action | Notes |
|---|---|---|---|
| `apps/web/admin-analytics.html` | custom/no-shared-nav | keep (internal) |  |
| `apps/web/admin-status.html` | custom/no-shared-nav | keep (internal) |  |
| `apps/web/admin/game-archive.html` | custom/no-shared-nav | keep (internal) |  |
| `apps/web/control-room.html` | custom/no-shared-nav | keep (internal) |  |

## Error pages

| File | Wiring | Suggested action | Notes |
|---|---|---|---|
| `apps/web/404.html` | custom/no-shared-nav | keep (error handling) |  |
| `apps/web/410.html` | custom/no-shared-nav | keep (error handling) |  |
| `apps/web/451.html` | custom/no-shared-nav | keep (error handling) |  |

## Documentation pages

| File | Wiring | Suggested action | Notes |
|---|---|---|---|
| `apps/web/docs/apis.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/architecture.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/branch-protection.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/brand.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/coding-standards.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/components-audits.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/dashboard-design.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/dashboard-enhancements.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/data-models.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/design-prompts-replies.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/design-prompts.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/diagrams.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/discord-bots.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/ecosystem-overview.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/founder-voice.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/future-roadmap.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/index.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/intro.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/linkguard-integration.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/migration-checklist.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/poker-module.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/render-deployment.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/system-prompts.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/testing-strategy.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/tool-specs-1.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/tool-specs-2.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/tool-specs-3.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/tools-overview.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/trust-engines.html` | custom/no-shared-nav | keep (docs) |  |
| `apps/web/docs/trust-migration.html` | custom/no-shared-nav | keep (docs) |  |
| `docs/index.html` | n/a | keep (docs) |  |

## Component partials

| File | Wiring | Suggested action | Notes |
|---|---|---|---|
| `apps/web/components/footer.html` | custom/no-shared-nav | keep (include partials) | Not standalone route pages. |
| `apps/web/components/index.html` | custom/no-shared-nav | keep (include partials) | Not standalone route pages. |
| `apps/web/components/nav.html` | legacy inline nav | keep (include partials) | Not standalone route pages. |
| `apps/web/components/trust-gauges.html` | custom/no-shared-nav | keep (include partials) | Not standalone route pages. |

## App-specific HTML shells

| File | Wiring | Suggested action | Notes |
|---|---|---|---|
| `apps/control-room/public/analytics.html` | n/a | keep (app shell) | Served by app-specific service. |
| `apps/control-room/public/index.html` | n/a | keep (app shell) | Served by app-specific service. |
| `apps/game-arena/public/arena.html` | n/a | keep (app shell) | Served by app-specific service. |
| `apps/game-arena/public/game.html` | n/a | keep (app shell) | Served by app-specific service. |
| `apps/game-arena/public/index.html` | n/a | keep (app shell) | Served by app-specific service. |
| `apps/game-arena/public/profile.html` | n/a | keep (app shell) | Served by app-specific service. |
| `apps/user-dashboard/public/dashboard.html` | n/a | keep (app shell) | Served by app-specific service. |
| `apps/user-dashboard/public/index.html` | n/a | keep (app shell) | Served by app-specific service. |

## Archive/delete candidates

| File | Wiring | Suggested action | Notes |
|---|---|---|---|
| `apps/web/index-legacy.html` | legacy inline nav | archive/delete candidate | Legacy homepage superseded by apps/web/index.html |

## Proposed next steps

1. Archive or remove `apps/web/index-legacy.html` once confirmed unused in deployment tooling.
2. Keep all pages marked `keep (wired)` and avoid reintroducing inline `top-nav` markup.
3. Keep `login`, `auth/callback`, `dashboard/index`, and `status` as standalone system pages unless product wants full marketing nav there.
4. Optional: add a CI check that fails when new `top-nav` blocks are introduced in `apps/web/*.html`.
