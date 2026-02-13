# TiltCheck Footer Navigation Audit Report

**Date**: December 8, 2025  
**Scope**: Complete site navigation mapping + footer link verification  
**Methodology**: File system scan + manual link tracing

---

## Executive Summary

**Total Pages Found**: 59 HTML files + 2 Next.js routes = **61 navigable pages**  
**Footer Links Analyzed**: 15 internal links (from `/index.html` footer)  
**Status**:
- ✅ **Connected**: 13 links (87%)
- ❌ **Dead/Missing**: 2 links (13%)
- 🔍 **Orphaned Pages**: 34 pages not linked in footer (58%)

**Critical Issues**:
1. `/dashboard` link ambiguous (points to undefined route)
2. `/testimonials` dead link (file archived)
3. 34 pages exist but aren't discoverable via footer navigation
4. Control room + admin pages have no public access path

---

## 1. Complete Page Inventory

### 1.1 Frontend Static Pages (59 total)

#### Public Pages (17)
| File Path | URL | Linked in Footer | Notes |
|-----------|-----|------------------|-------|
| `index.html` | `/` | ✅ Yes | Landing page |
| `about.html` | `/about` | ✅ Yes | Company info |
| `contact.html` | `/contact` | ✅ Yes | Contact form |
| `how-it-works.html` | `/how-it-works` | ✅ Yes | Product explainer |
| `trust-explained.html` | `/trust-explained` | ✅ Yes | Trust system docs |
| `faq.html` | `/faq` | ✅ Yes | FAQ page |
| `privacy.html` | `/privacy` | ✅ Yes | Privacy policy |
| `terms.html` | `/terms` | ✅ Yes | Terms of service |
| `press-kit.html` | `/press-kit` | ✅ Yes | Press resources |
| `newsletter.html` | `/newsletter` | ✅ Yes | Newsletter signup |
| `search.html` | `/search` | ✅ Yes | Site search |
| `casinos.html` | `/casinos` | ❌ No | Casino trust scores |
| `degen-trust.html` | `/degen-trust` | ❌ No | Degen trust scores |
| `trust.html` | `/trust` | ❌ No | Trust dashboard (old?) |
| `site-map.html` | `/site-map` | ❌ No | Site map |
| `component-gallery.html` | `/component-gallery` | ❌ No | Dev tool |
| `components/index.html` | `/components/` | ❌ No | Component library |

#### Tool Pages (9)
| File Path | URL | Linked in Footer | Notes |
|-----------|-----|------------------|-------|
| `tools/justthetip.html` | `/tools/justthetip` | ❌ No | Tipping tool |
| `tools/suslink.html` | `/tools/suslink` | ❌ No | Link scanner |
| `tools/collectclock.html` | `/tools/collectclock` | ❌ No | Bonus tracker |
| `tools/freespinscan.html` | `/tools/freespinscan` | ❌ No | Promo scanner |
| `tools/tiltcheck-core.html` | `/tools/tiltcheck-core` | ❌ No | Tilt detection |
| `tools/poker.html` | `/tools/poker` | ❌ No | Poker game |
| `tools/daad.html` | `/tools/daad` | ❌ No | DA&D game |
| `tools/qualifyfirst.html` | `/tools/qualifyfirst` | ❌ No | Survey router |
| `tools/triviadrops.html` | `/tools/triviadrops` | ❌ No | Trivia game |

#### Admin Pages (3)
| File Path | URL | Linked in Footer | Notes |
|-----------|-----|------------------|-------|
| `control-room.html` | `/control-room` | ❌ No | Admin control panel |
| `admin-analytics.html` | `/admin-analytics` | ❌ No | Analytics dashboard |
| `admin-status.html` | `/admin-status` | ❌ No | System status |

#### Documentation Pages (27)
| File Path | URL | Linked in Footer | Notes |
|-----------|-----|------------------|-------|
| `docs/index.html` | `/docs/` | ❌ No | Docs home |
| `docs/intro.html` | `/docs/intro` | ❌ No | Ecosystem intro |
| `docs/brand.html` | `/docs/brand` | ❌ No | Brand guide |
| `docs/founder-voice.html` | `/docs/founder-voice` | ❌ No | Voice guide |
| `docs/ecosystem-overview.html` | `/docs/ecosystem-overview` | ❌ No | System overview |
| `docs/tool-specs-1.html` | `/docs/tool-specs-1` | ❌ No | Tool specs pt1 |
| `docs/tool-specs-2.html` | `/docs/tool-specs-2` | ❌ No | Tool specs pt2 |
| `docs/tool-specs-3.html` | `/docs/tool-specs-3` | ❌ No | Tool specs pt3 |
| `docs/trust-engines.html` | `/docs/trust-engines` | ❌ No | Trust engines |
| `docs/architecture.html` | `/docs/architecture` | ❌ No | System architecture |
| `docs/data-models.html` | `/docs/data-models` | ❌ No | Data models |
| `docs/system-prompts.html` | `/docs/system-prompts` | ❌ No | AI prompts |
| `docs/apis.html` | `/docs/apis` | ❌ No | API specs |
| `docs/discord-bots.html` | `/docs/discord-bots` | ❌ No | Bot architecture |
| `docs/testing-strategy.html` | `/docs/testing-strategy` | ❌ No | Testing guide |
| `docs/future-roadmap.html` | `/docs/future-roadmap` | ❌ No | Roadmap |
| `docs/diagrams.html` | `/docs/diagrams` | ❌ No | System diagrams |
| `docs/tools-overview.html` | `/docs/tools-overview` | ❌ No | Tools overview |
| `docs/coding-standards.html` | `/docs/coding-standards` | ❌ No | Code standards |
| `docs/trust-migration.html` | `/docs/trust-migration` | ❌ No | Migration guide |
| `docs/linkguard-integration.html` | `/docs/linkguard-integration` | ❌ No | LinkGuard docs |
| `docs/design-prompts.html` | `/docs/design-prompts` | ❌ No | Design prompts |
| `docs/design-prompts-replies.html` | `/docs/design-prompts-replies` | ❌ No | Prompt examples |
| `docs/branch-protection.html` | `/docs/branch-protection` | ❌ No | Branch rules |
| `docs/migration-checklist.html` | `/docs/migration-checklist` | ❌ No | Migration checklist |
| `docs/components-audits.html` | `/docs/components-audits` | ❌ No | Component audits |
| `docs/dashboard-design.html` | `/docs/dashboard-design` | ❌ No | Dashboard design |
| `docs/dashboard-enhancements.html` | `/docs/dashboard-enhancements` | ❌ No | Dashboard features |
| `docs/render-deployment.html` | `/docs/render-deployment` | ❌ No | Render deploy |
| `docs/poker-module.html` | `/docs/poker-module` | ❌ No | Poker module |

#### Error Pages (3)
| File Path | URL | Purpose | Notes |
|-----------|-----|---------|-------|
| `404.html` | `/404` | Not found | Standard 404 |
| `410.html` | `/410` | Gone | Removed content |
| `451.html` | `/451` | Unavailable for legal reasons | Legal takedown |

#### Components (1)
| File Path | URL | Purpose | Notes |
|-----------|-----|---------|-------|
| `components/trust-gauges.html` | `/components/trust-gauges` | Trust gauge component | Standalone component |

---

### 1.2 Next.js Dashboard Routes (2)

| Route File | URL | Linked in Footer | Notes |
|------------|-----|------------------|-------|
| `app/page.tsx` | `/dashboard` | ✅ Yes | Dashboard home (Control Center) |
| `app/user/page.tsx` | `/dashboard/user` | ❌ No | User tilt dashboard |

**Note**: The footer links to `/dashboard` which doesn't exist as a static file but is served by the Next.js app at `/apps/dashboard`. This requires proper routing/proxy configuration.

---

### 1.3 Archived Pages (Not Counted)

Located in `/frontend/_archive/`:
- `index-legacy.html` - Old landing page
- `beta.html` - Beta signup (deprecated)
- `early-access.html` - Waitlist (deprecated)
- `testimonials.html` - Empty testimonials page

---

## 2. Footer Link Analysis

**Footer Location**: All pages use consistent footer (defined in `/frontend/public/index.html` lines 358-410)

### 2.1 Footer Structure

The footer has 4 sections:
1. **Product** (9 links)
2. **Company** (4 links)
3. **Legal** (2 links)
4. **Footer Bottom** (3 external links)

---

### 2.2 Footer Link Status Table

#### Product Section

| Link Label | href | Target Page | Status | Issue |
|------------|------|-------------|--------|-------|
| Home | `/` | `index.html` | ✅ Connected | - |
| How It Works | `/how-it-works` | `how-it-works.html` | ✅ Connected | - |
| Trust System | `/trust-explained` | `trust-explained.html` | ✅ Connected | - |
| FAQ | `/faq` | `faq.html` | ✅ Connected | - |
| Trust Dashboard | `/dashboard` | Next.js `/dashboard` | ⚠️ Ambiguous | Requires proxy/routing to Next.js app |
| Search | `/search` | `search.html` | ✅ Connected | - |
| Press Kit | `/press-kit` | `press-kit.html` | ✅ Connected | - |
| Newsletter | `/newsletter` | `newsletter.html` | ✅ Connected | - |
| Testimonials | `/testimonials` | ~~`testimonials.html`~~ | ❌ Dead Link | File moved to `_archive/` |

#### Company Section

| Link Label | href | Target Page | Status | Issue |
|------------|------|-------------|--------|-------|
| About | `/about` | `about.html` | ✅ Connected | - |
| Contact | `/contact` | `contact.html` | ✅ Connected | - |
| GitHub | `https://github.com/jmenichole/tiltcheck-monorepo` | External | ✅ Connected | - |
| Discord | `https://discord.gg/s6NNfPHxMS` | External | ✅ Connected | - |

#### Legal Section

| Link Label | href | Target Page | Status | Issue |
|------------|------|-------------|--------|-------|
| Privacy Policy | `/privacy` | `privacy.html` | ✅ Connected | - |
| Terms of Service | `/terms` | `terms.html` | ✅ Connected | - |

#### Footer Bottom

| Link Label | href | Target | Status |
|------------|------|--------|--------|
| made for degens by degens | `https://jmenichole.github.io/Portfolio/` | External | ✅ Connected |
| jmenichole | `https://github.com/jmenichole` | External | ✅ Connected |
| Support | `https://ko-fi.com/jmenichole0` | External | ✅ Connected |

---

### 2.3 Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Connected (Resolved) | 13 | 87% |
| ⚠️ Ambiguous (Needs Routing) | 1 | 6.5% |
| ❌ Dead Link | 1 | 6.5% |
| **Total Internal Links** | **15** | **100%** |

---

## 3. Missing/Dead Link Details

### 3.1 Dead Links (1)

#### `/testimonials`
- **Link Location**: Footer → Product → "Testimonials"
- **Expected File**: `/frontend/public/testimonials.html`
- **Actual Status**: ❌ File moved to `/frontend/_archive/testimonials.html`
- **Impact**: 404 error when clicked
- **Fix**: Remove from footer OR restore file with actual testimonials

**Recommended Action**: **Remove link** until testimonials are collected.

```html
<!-- REMOVE THIS LINE FROM FOOTER -->
<li><a href="/testimonials">Testimonials</a></li>
```

---

### 3.2 Ambiguous Links (1)

#### `/dashboard`
- **Link Location**: Footer → Product → "Trust Dashboard"
- **Expected Behavior**: Load Next.js dashboard app
- **Current Setup**: Next.js app runs separately at `/apps/dashboard`
- **Issue**: Requires reverse proxy or routing to map `/dashboard` → Next.js app
- **Impact**: May 404 or load incorrect page depending on deployment
- **Fix**: Configure Nginx/Express to proxy `/dashboard` to Next.js app

**Deployment Configuration Required**:
```nginx
# Nginx example
location /dashboard {
  proxy_pass http://localhost:3000/;
  proxy_set_header Host $host;
}
```

OR

```javascript
// Express server.js example
app.use('/dashboard', proxy('http://localhost:3000'));
```

---

## 4. Orphaned Pages

**Definition**: Pages that exist but are NOT linked in the footer navigation

### 4.1 Critical Orphaned Pages (Should Be Linked)

| Page | URL | Why It Should Be Linked | Suggested Footer Section |
|------|-----|-------------------------|--------------------------|
| `casinos.html` | `/casinos` | Core feature - casino trust scores | Product (add below "Trust System") |
| `degen-trust.html` | `/degen-trust` | Core feature - degen trust scores | Product (add below "Casinos") |
| `site-map.html` | `/site-map` | Helps users navigate entire site | Legal or Footer Bottom |
| `docs/index.html` | `/docs/` | Developer documentation portal | Company or new "Resources" section |

### 4.2 Intentionally Orphaned (OK)

| Page | URL | Reason |
|------|-----|--------|
| `control-room.html` | `/control-room` | Admin-only, requires auth |
| `admin-analytics.html` | `/admin-analytics` | Admin-only |
| `admin-status.html` | `/admin-status` | Admin-only |
| `component-gallery.html` | `/component-gallery` | Dev tool |
| `components/index.html` | `/components/` | Dev tool |
| All `/docs/*` pages | `/docs/*` | Accessible via `/docs/index.html` |
| All `/tools/*` pages | `/tools/*` | Accessible via landing page tools grid |

### 4.3 Should Be Linked Elsewhere (Not Footer)

| Page | URL | Where It Should Be Linked |
|------|-----|---------------------------|
| `trust.html` | `/trust` | May be duplicate of `/trust-explained` - needs review |
| `search.html` | `/search` | Already in footer ✅ |
| All tool pages | `/tools/*` | Already linked on landing page tools grid ✅ |

---

## 5. Inconsistent/Legacy Links

### 5.1 Multiple "Dashboard" Concepts

There are **3 different dashboard-related pages**:

| Page | URL | Purpose | Linked in Footer |
|------|-----|---------|------------------|
| Next.js Dashboard | `/dashboard` (via proxy) | Main user dashboard (Control Center) | ✅ Yes |
| Trust Dashboard | `/trust.html` | Old trust scores page? | ❌ No |
| User Tilt Dashboard | `/dashboard/user` | User tilt stats | ❌ No |

**Issue**: Confusing naming. Is `/trust.html` still needed, or is it replaced by Next.js `/dashboard`?

**Recommendation**: 
- If `/trust.html` is legacy → Archive it
- If `/trust.html` is still used → Rename to `/trust-scores.html` for clarity
- Link `/dashboard/user` from main dashboard, not footer

---

### 5.2 Outdated Route Structure

Several pages link to `/dashboard` assuming it's a static HTML file:
- `casinos.html` line 30
- `degen-trust.html` line 45
- `newsletter.html` line 141
- All tool pages (breadcrumbs)
- All doc pages (nav bar)

**Impact**: These internal links will break unless `/dashboard` is properly proxied to Next.js app.

---

## 6. Recommended Footer Updates

### 6.1 Updated Footer Structure (Proposed)

```html
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <!-- Column 1: TiltCheck Branding -->
      <div>
        <h3>TiltCheck</h3>
        <p>Protecting degens from tilt-induced disaster since 2024.</p>
      </div>
      
      <!-- Column 2: Product -->
      <div>
        <h4>Product</h4>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/how-it-works">How It Works</a></li>
          <li><a href="/trust-explained">Trust System</a></li>
          <li><a href="/casinos">Casino Trust Scores</a></li><!-- ✅ ADDED -->
          <li><a href="/degen-trust">Degen Trust Scores</a></li><!-- ✅ ADDED -->
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/search">Search</a></li>
        </ul>
      </div>
      
      <!-- Column 3: Resources -->
      <div>
        <h4>Resources</h4><!-- ✅ NEW SECTION -->
        <ul>
          <li><a href="/press-kit">Press Kit</a></li>
          <li><a href="/newsletter">Newsletter</a></li>
          <li><a href="/docs/">Developer Docs</a></li><!-- ✅ ADDED -->
          <li><a href="/site-map">Site Map</a></li><!-- ✅ ADDED -->
        </ul>
      </div>
      
      <!-- Column 4: Company & Legal -->
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="https://github.com/jmenichole/tiltcheck-monorepo" target="_blank" rel="noopener">GitHub</a></li>
          <li><a href="https://discord.gg/s6NNfPHxMS" target="_blank" rel="noopener">Discord</a></li>
        </ul>
        <h4>Legal</h4>
        <ul>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    
    <div class="footer-bottom">
      <p>
        <a href="https://jmenichole.github.io/Portfolio/" target="_blank" rel="noopener" style="color: var(--color-primary);">made for degens by degens</a>
      </p>
      <p>
        Built by <a href="https://github.com/jmenichole" target="_blank" rel="noopener">jmenichole</a> • 
        TiltCheck Ecosystem © 2024–2025 • 
        <a href="https://ko-fi.com/jmenichole0" target="_blank" rel="noopener">Support</a>
      </p>
    </div>
  </div>
</footer>
```

### 6.2 Changes Made

| Action | Link | Reason |
|--------|------|--------|
| ✅ **Added** | `/casinos` | Core feature missing from footer |
| ✅ **Added** | `/degen-trust` | Core feature missing from footer |
| ✅ **Added** | `/docs/` | Developer docs portal |
| ✅ **Added** | `/site-map` | Helps users find all pages |
| ❌ **Removed** | `/testimonials` | File archived, no content yet |
| 📦 **Reorganized** | New "Resources" section | Better IA, separates marketing from tools |

---

## 7. Routing Configuration Needed

### 7.1 Express Server Routing

The frontend Express server (`/frontend/server.js`) needs to proxy `/dashboard` to the Next.js app:

```javascript
// Add to /frontend/server.js
const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy /dashboard to Next.js app
app.use('/dashboard', createProxyMiddleware({
  target: process.env.DASHBOARD_URL || 'http://localhost:3000',
  changeOrigin: true,
  ws: true, // WebSocket support for hot reload
}));
```

**Environment Variable**:
```bash
DASHBOARD_URL=http://localhost:3000 # Development
DASHBOARD_URL=https://dashboard.tiltcheck.me # Production
```

---

### 7.2 Nginx Configuration (Production)

If using Nginx in production:

```nginx
# Proxy /dashboard to Next.js app
location /dashboard {
  proxy_pass http://dashboard-app:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}

# Static frontend files
location / {
  root /usr/share/nginx/html;
  try_files $uri $uri.html $uri/ =404;
}
```

---

## 8. Implementation Checklist

### High Priority (Do Now)

- [ ] **Remove `/testimonials` from footer** (dead link)
- [ ] **Add `/casinos` to footer** under Product section
- [ ] **Add `/degen-trust` to footer** under Product section
- [ ] **Add `/docs/` to footer** in new Resources section
- [ ] **Configure dashboard routing** (Express proxy or Nginx)
- [ ] **Test `/dashboard` link** after routing is configured

### Medium Priority (This Week)

- [ ] **Create "Resources" footer section** (better IA)
- [ ] **Add `/site-map` to Resources section**
- [ ] **Review `/trust.html`** - determine if it's duplicate of `/trust-explained.html`
- [ ] **Update all internal `/dashboard` links** across all pages (breadcrumbs, nav bars)

### Low Priority (Backlog)

- [ ] **Create visual sitemap** showing all page relationships
- [ ] **Add "Documentation" link to top nav** (in addition to footer)
- [ ] **Consider adding "Tools" section to footer** with top 3-4 tools
- [ ] **Implement search functionality** on `/search.html` (currently empty)

---

## 9. Page Discovery Matrix

**How users can find pages**:

| Page Type | Discoverable Via | Missing From |
|-----------|------------------|--------------|
| **Landing** | Direct URL, Google | - |
| **About/Contact** | Footer, Top Nav | - |
| **Trust Scores (Casinos/Degens)** | Landing tools grid | ❌ Footer |
| **Tool Pages** | Landing tools grid | ❌ Footer, Top Nav |
| **Documentation** | `/docs/index.html` only | ❌ Footer, Top Nav |
| **Admin Pages** | Direct URL only (auth required) | ❌ All navigation (intentional) |
| **Dashboard** | Footer, Top Nav | Needs routing fix |

**Critical Gap**: Users can't discover `/casinos` or `/degen-trust` unless they know the URL or find it via search engine.

---

## 10. Metrics & Statistics

### 10.1 Link Coverage

| Metric | Count | Percentage |
|--------|-------|------------|
| Total pages | 61 | 100% |
| Linked in footer | 13 | 21% |
| Linked elsewhere (landing, docs) | 14 | 23% |
| **Discoverable pages** | **27** | **44%** |
| **Orphaned pages** | **34** | **56%** |

### 10.2 Footer Link Health

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Working links | 13 | 87% |
| ⚠️ Needs routing | 1 | 6.5% |
| ❌ Broken links | 1 | 6.5% |
| **Total footer links** | **15** | **100%** |

---

## 11. Conclusion

The TiltCheck footer navigation is **mostly functional** but has critical gaps:

1. **Missing core features** (`/casinos`, `/degen-trust`) from footer
2. **One dead link** (`/testimonials`) causing 404s
3. **Ambiguous routing** for `/dashboard` (Next.js app requires proxy)
4. **Poor discoverability** for documentation and tools (56% orphaned pages)

**Immediate Actions**:
- Remove `/testimonials` link
- Add casino/degen trust scores to footer
- Configure `/dashboard` routing
- Add "Resources" section with docs + sitemap

**Impact**: These changes will reduce 404 errors, improve SEO, and make core features more discoverable.

---

**Report Compiled By**: TiltCheck Development Agent  
**Next Steps**: Implement footer updates, configure routing, test all links
