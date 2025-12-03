# TiltCheck Page Consistency Analysis

**Last Updated:** December 2025

This document analyzes the styling and content consistency across TiltCheck landing pages, identifying what needs to be aligned, what's left to develop, and next steps.

---

## Executive Summary

TiltCheck has two distinct page styling patterns:

1. **"Newer" pages** - Use `theme.css` + `main.css` with modern CSS variables, consistent navigation, and refined design
2. **"Original/older" pages** - Use `base.css` + `tool-page.css` with different styling patterns and simpler navigation

This creates visual inconsistency across the site that should be unified.

---

## Cloudflare Workers in TiltCheck

### Current Role

Cloudflare Workers is a key part of TiltCheck's planned serverless architecture:

1. **Command Hub** (Layer 2 in Architecture)
   - Parses Discord slash commands
   - Routes actions to modules
   - Handles rate limiting and permissions
   - Returns ephemeral replies to Discord

2. **Event Router** (Layer 3 in Architecture)
   - Dispatches async tasks to modules
   - Handles link scanning, casino page fetching
   - Runs predictions, wallet balance checks
   - Updates trust scores

3. **Storage Integration**
   - Cloudflare KV for URL scans and swap attempts
   - D1 (SQLite) for Worker-compatible database
   - Durable Objects for stateful operations

4. **Edge Caching**
   - Static assets for Game Arena
   - AI Gateway API endpoint

### Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Command Hub | **Planned** | Architecture documented, not implemented |
| Event Router | **Planned** | Design complete, pending development |
| KV Storage | **Planned** | Would replace some Supabase usage |
| AI Gateway | **Planned** | Listed in deployment docs |
| Edge Caching | **Planned** | For static assets |

### Why Cloudflare Workers?

Per the project philosophy:
- **Cost Discipline** — Free tier optimized (100K requests/day free)
- **Serverless** — No server maintenance
- **Global Edge** — Low latency worldwide
- **Workers + Queues** — Ideal for async event processing
- **D1/KV** — Free-tier compatible storage

### What's Missing

1. No `wrangler.toml` configuration file in repo
2. No actual Worker code implemented yet
3. Architecture is documented but not built
4. Current deployment uses Railway/Render (traditional hosting)

### Recommended Next Steps for Cloudflare

1. Create `wrangler.toml` for Worker configuration
2. Implement Command Hub as first Worker
3. Migrate Event Router to Workers + Queues
4. Set up KV namespaces for URL cache
5. Configure D1 database for lightweight storage

---

## 1. Styling Inconsistencies Identified

### CSS Framework Patterns

| Page Type | CSS Files Used | Navigation Style | Footer Style |
|-----------|---------------|------------------|--------------|
| **Newer** (faq, privacy, how-it-works, contact, terms) | `theme.css` + `main.css` | `site-header` with `nav-links` ul/li | Grid footer with 4 columns |
| **Older** (about, casinos, degen-trust, tool pages) | `base.css` + `tool-page.css` | `navbar` with `nav-links` div | Simple centered footer |
| **Home** (index.html) | `theme.css` + `main.css` | Complex dual nav system | Grid footer |

### Specific Style Differences

#### Navigation:
- **Newer pages**: `<ul class="nav-links">` with `<li>` items, consistent branding
- **Older pages**: `<div class="nav-links">` with direct `<a>` links
- **Home page**: Has both `top-nav` and `header-nav` (most complex)

#### Headers:
- **Newer pages**: `<header class="site-header">` - compact, sticky
- **Older pages**: Custom `about-hero`, `tool-header` sections - larger, page-specific
- **Inconsistency**: Different header heights, background treatments

#### Footers:
- **Newer pages**: 4-column grid with `footer-grid`, `footer-bottom`
- **Older pages**: Simple centered footer with inline links
- **About/Degen-trust**: Has social links (X, LinkedIn) that other pages don't

#### Color Variables:
- Both use similar colors but reference them differently:
  - `theme.css`: `--color-primary`, `--bg-primary`, `--text-primary`
  - `base.css`: `--color-accent`, `--color-bg`, `--color-text`

#### Typography:
- **Newer pages**: Uses CSS variables like `--text-xl`, `--text-lg` with `clamp()`
- **Older pages**: Hardcoded font sizes like `1.15rem`, `2.2rem`

### Missing Elements on Older Pages:
1. **Breadcrumbs**: Some pages have `<nav class="breadcrumbs"></nav>` but no visible breadcrumbs script output
2. **Discord Login Button**: Inconsistent styling and placement
3. **Mobile hamburger menu**: Only on home page
4. **Skip-to-content link**: Missing on older pages (accessibility issue)

---

## 2. Information Conflicts with Codebase

### Navigation Link Conflicts:
| Link | Exists? | Notes |
|------|---------|-------|
| `/dashboard` | ✅ Yes | Points to services/dashboard, but apps/dashboard also exists |
| `/docs/index.html` | ⚠️ Partial | Directory exists but content varies |
| `/trust-explained` | ❓ Unknown | Referenced but file not found |
| `/how-it-works.html` | ✅ Yes | But linked without `.html` on some pages |
| `/faq.html` vs `/faq` | ⚠️ Mixed | Inconsistent file extension usage |

### Content/Feature Status Conflicts:

1. **JustTheTip Page Claims**:
   - States "Live in Discord" with `status-live` badge
   - References `QualifyFirst withdrawals` but QualifyFirst is marked "Coming Soon" on home

2. **Discord Bot Status**:
   - Multiple pages say "Coming Soon" or "private beta"
   - But tool pages say "Live" - need clarification

3. **Fee Structure**: ✅ **FIXED**
   - JustTheTip page: "0.0007 SOL (~$0.07) per transaction"  
   - How-it-works page: "0.0007 SOL (~$0.07 USD) per transaction"
   - FAQ page: "0.0007 SOL (~$0.07 USD) per transaction"
   - Terms page: "0.0007 SOL (~$0.07 USD) per transaction"
   - All pages now consistent: 0.0007 SOL (~$0.07 USD)

4. **Casino Directory**:
   - `casinos.html` references `/data/casino_data_latest.csv`
   - This file may or may not exist/be populated

---

## 3. What's Left to Develop

### UI/UX Development Needed:

1. **Unified Navigation Component**
   - Create a shared header/nav partial or web component
   - Should work on all pages with same styling
   - Include mobile-responsive hamburger menu

2. **Unified Footer Component**
   - Consistent footer across all pages
   - Include all social links, support links, legal links

3. **Page Templates**
   - Create base HTML templates for:
     - Content pages (legal, how-it-works style)
     - Tool pages (individual tool features)
     - Dashboard/functional pages

4. **Missing Pages**:
   - `/trust-explained.html` - referenced but missing
   - Several 404 edge cases

5. **Accessibility Improvements**:
   - Add skip-to-content on all pages
   - Ensure ARIA labels consistent
   - Fix color contrast issues flagged in `ACCESSIBILITY_AUDIT.md`

### Feature Pages Incomplete:

| Tool | Page Status | Functionality |
|------|-------------|---------------|
| JustTheTip | Complete | Needs real integration |
| SusLink | Complete | Needs backend hook |
| CollectClock | Complete | Mock data only |
| FreeSpinScan | Complete | Mock data only |
| TiltCheck Core | Complete | Needs tilt engine |
| DA&D | Stub only | Not developed |
| QualifyFirst | Stub only | Phase 1 in codebase |
| Poker | Stub only | Not developed |
| TriviaDrops | Section in JTT | Needs own page |

### Backend/Infrastructure Development:

| Component | Status | Priority |
|-----------|--------|----------|
| Cloudflare Workers Command Hub | Not implemented | High |
| Cloudflare Workers Event Router | Not implemented | High |
| Cloudflare KV for URL cache | Not configured | Medium |
| D1 Database setup | Not configured | Medium |
| Wrangler configuration | Missing | High |
| Discord Bot (discord.js) | Partial | High |
| Trust Engine backend | Partial | Medium |
| AI Gateway | Not implemented | Low |

---

## 4. What Hasn't Been Brainstormed

### Missing Concepts/Pages:

1. **User Onboarding Flow**
   - No "Get Started" tutorial
   - No wallet connection guide
   - No Discord bot setup wizard

2. **User Dashboard Features**
   - Personal tilt history view
   - Wallet connection management
   - Settings/preferences page

3. **Community Features**
   - Leaderboards page
   - Community stats
   - User profiles (public view)

4. **Monetization Pages**
   - Pricing/subscription page (mentioned in `stripe.js` but no page)
   - Premium features comparison
   - Chrome extension subscription page exists but incomplete

5. **API Documentation**
   - Trust API docs page exists but is basic
   - No interactive API explorer
   - No SDK documentation

6. **Legal/Compliance Expansion**
   - Jurisdiction-specific pages
   - Responsible gambling resources (page exists but basic)
   - Age verification flow

### Missing Integrations:
- Real-time trust score lookup widget
- Live casino status feed
- Tilt detection demo/preview
- Interactive tool demos

---

## 5. Steps to Complete It

### Phase 1: Unify Styling (Immediate)

1. **Create shared CSS variables file**
   - Consolidate `theme.css` and `base.css` variables
   - Use single source of truth for colors, spacing, typography

2. **Update older pages to use newer patterns**
   - About page → use `theme.css` + `main.css`
   - Degen-trust page → use `theme.css` + `main.css`
   - Casinos page → use `theme.css` + `main.css`
   - Tool pages → migrate to newer CSS

3. **Create reusable partials**
   - `_header.html` partial or JS injection
   - `_footer.html` partial
   - `_nav.html` partial

### Phase 2: Fix Content Conflicts (This Sprint)

1. **Audit all internal links**
   - Fix `.html` extension inconsistencies
   - Create missing pages (404 targets)
   - Update broken references

2. **Standardize feature status**
   - Create single source of truth for tool status
   - Update all pages to match
   - Add version/date to status badges

3. **Fix fee documentation**
   - Verify correct fee (0.0007 vs 0.07 SOL)
   - Update all references

### Phase 3: Complete Missing Features (Next Sprint)

1. **Priority Pages**
   - Create `/trust-explained.html`
   - Complete DA&D tool page
   - Complete Poker tool page
   - Create TriviaDrops standalone page

2. **Dashboard Integration**
   - Connect `/dashboard` to real backend
   - Add user authentication flow
   - Build out user-specific features

3. **Accessibility**
   - Add skip links to all pages
   - Run full a11y audit
   - Fix all critical contrast issues

### Phase 4: New Features (Future)

1. **User Accounts**
   - Design user profile pages
   - Implement wallet connection
   - Build settings interface

2. **Interactive Features**
   - Live trust score widget
   - Tool demo embeds
   - Community leaderboards

3. **API/Developer**
   - Interactive API explorer
   - SDK documentation
   - Integration guides

---

## File Reference

### Newer Pattern Files (Reference):
- `/services/landing/public/styles/theme.css` - CSS variables
- `/services/landing/public/styles/main.css` - Component styles
- `/services/landing/public/faq.html` - Example newer page
- `/services/landing/public/privacy.html` - Example newer page

### Older Pattern Files (Need Migration):
- `/services/landing/public/styles/base.css` - Old CSS variables
- `/services/landing/public/styles/tool-page.css` - Tool page styles
- `/services/landing/public/about.html` - Needs migration
- `/services/landing/public/degen-trust.html` - Needs migration
- `/services/landing/public/casinos.html` - Needs migration
- `/services/landing/public/tools/*.html` - All need migration

---

## Recommended Priority Order

1. **High Priority**: Fix fee documentation conflict (0.0007 vs 0.07 SOL)
2. **High Priority**: Unify navigation/footer across all pages
3. **Medium Priority**: Migrate older pages to newer CSS pattern
4. **Medium Priority**: Create missing pages (trust-explained, etc.)
5. **Lower Priority**: Add new features and interactive elements

---

*Document created as part of page consistency analysis. Review with team before implementation.*
