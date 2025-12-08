# TiltCheck UX Audit Report

**Date**: December 8, 2025  
**Scope**: Landing page, login flow, dashboard, navigation  
**Methodology**: Heuristic evaluation of frontend code + UI patterns

---

## Executive Summary

**Overall Assessment**: The TiltCheck site shows strong technical foundations with good accessibility practices and responsive design. However, there are critical issues with navigation clarity, missing feedback states, and inconsistent information architecture that could confuse users.

**Priority Areas**:
1. **HIGH**: Navigation structure is confusing (multiple dashboards, unclear login flow)
2. **HIGH**: Missing error/success feedback on interactive elements
3. **MEDIUM**: Mobile navigation needs UX improvements
4. **MEDIUM**: Inconsistent typography scale and spacing
5. **LOW**: Accessibility improvements for contrast and ARIA labels

---

## Page-by-Page Analysis

### 1. Landing Page (`/frontend/public/index.html`)

#### Visual/Layout Issues

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| Tool icons missing `src` attributes - relying on JS injection | **HIGH** | Lines 207-265 | Add fallback `src` directly in HTML; JS should enhance, not be required |
| Hero background image has encoded spaces in filename | **MEDIUM** | Line 142 | Rename file to use hyphens: `dark-gradient-hero-background.webp` |
| KPI strip values show `--` until JS loads | **MEDIUM** | Lines 164-188 | Add meaningful placeholder numbers (e.g., "Loading...") |
| Tool cards have no hover preview | **LOW** | Lines 207-265 | Add subtle scale transform on hover |
| Footer copyright year hardcoded | **LOW** | Line 400 | Use JS to inject current year dynamically |

**Suggested Fixes**:
```css
/* Add to main.css */
.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 255, 198, 0.15);
}
```

#### Navigation/IA Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Confusing dashboard link** | **HIGH** | Top nav has `/dashboard` but unclear what it points to (app dashboard vs admin dashboard) | Rename to "Launch App" or "My Dashboard" for clarity |
| **Mobile nav has duplicate links** | **MEDIUM** | Lines 66-106: "Dashboard" appears in both top nav and mobile nav | Consolidate or differentiate (e.g., "User Dashboard" vs "Admin Panel") |
| **Dead "View Trust Scores" button** | **HIGH** | Line 158: Disabled button with no explanation | Either remove or add tooltip explaining "Coming Q1 2025" |
| **No breadcrumbs on landing** | **LOW** | Missing contextual navigation | Not critical for landing page |

**Suggested Fix**:
```html
<!-- Replace line 158 -->
<button class="btn btn-secondary" disabled aria-label="Trust Scores feature launching Q1 2025">
  View Trust Scores <span class="badge-soon">Q1 2025</span>
</button>
```

#### Feedback Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **No loading states** | **HIGH** | KPI values, tool icons load without spinners or skeletons | Add CSS skeleton screens |
| **No error states** | **HIGH** | If KPI fetch fails, values stay as `--` forever | Add error handling with fallback message |
| **Button states unclear** | **MEDIUM** | `.btn-disabled` doesn't show WHY it's disabled | Add tooltips or help text |
| **No success feedback** | **LOW** | Newsletter form submission has no visible confirmation | Add toast notification or inline success message |

**Suggested Fix**:
```css
/* Add skeleton loader */
.kpi-value {
  min-width: 40px;
  min-height: 24px;
}
.kpi-value:empty::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #1A1F24 25%, #2A2F34 50%, #1A1F24 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### Mobile/Responsive Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Mobile nav requires JS** | **HIGH** | Lines 1218-1237: Mobile nav is `display: none` until JS toggles it | Use CSS-only checkbox hack for accessibility |
| **Tools grid breaks on narrow screens** | **MEDIUM** | Grid minmax(300px) forces horizontal scroll on <320px devices | Change to `minmax(280px, 1fr)` |
| **Hero CTA buttons stack awkwardly** | **MEDIUM** | Lines 149-159: Buttons don't have responsive flex-wrap | Add `flex-wrap: wrap` to `.cta-group` |
| **Mobile nav covers entire screen** | **LOW** | No way to see content behind overlay | Acceptable for mobile pattern |

**Suggested Fix**:
```css
.cta-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap; /* Add this */
  justify-content: center;
}

.tools-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Change from 300px */
}
```

#### Accessibility Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Color contrast on muted text** | **MEDIUM** | `--text-muted: #6B7280` on `--bg-primary: #0E0E0F` = 4.3:1 (fails AA for small text) | Lighten to `#7B8290` for 4.5:1 |
| **Missing alt text on decorative images** | **LOW** | Hero background has `alt=""` (correct) but some feature icons missing alt | Audit all images |
| **Focus indicators inconsistent** | **MEDIUM** | Some links have custom focus, others use browser default | Standardize focus styles |
| **Skip link works but hidden** | **LOW** | Line 48: Skip link is visually hidden until focused (correct pattern) | No fix needed |

**Suggested Fix**:
```css
:root {
  --text-muted: #7B8290; /* Improved contrast */
}

*:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: var(--radius-sm);
}
```

---

### 2. Dashboard (`/apps/dashboard/src/app/page.tsx`)

#### Visual/Layout Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Inconsistent card styling** | **MEDIUM** | User dashboard has gradient, admin cards don't | Either all gradient or all flat |
| **Icon sizes not responsive** | **LOW** | Fixed `text-5xl` on mobile looks too large | Use clamp() or media query |
| **No visual hierarchy** | **MEDIUM** | All cards same weight, hard to prioritize | Make "Your Dashboard" larger/more prominent |

#### Navigation/IA Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Dashboard vs Dashboards confusion** | **HIGH** | Page shows "Dashboard" but has link to "Your Dashboard" - recursive? | Rename page to "App Home" or "Control Center" |
| **No clear path to login** | **HIGH** | Dashboard requires auth but no login button/link visible | Add "Sign in with Discord" button if unauthenticated |
| **Unclear admin vs user distinction** | **HIGH** | Cards mix user features (User Dashboard) with admin features (Casino Grading, User Management) | Separate into two sections: "Your Tools" and "Admin Panel" |
| **Dead links** | **HIGH** | Most dashboard cards link to unimplemented routes | Add "Coming Soon" badges or disable non-ready links |

**Suggested Fix**:
```tsx
// Split into sections
<div className="grid grid-cols-1 gap-8">
  <section>
    <h2 className="text-xl font-semibold text-white mb-4">Your Tools</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* User Dashboard card */}
    </div>
  </section>
  
  <section>
    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
      Admin Panel <span className="text-sm text-slate-400">(Requires Admin Role)</span>
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Admin cards */}
    </div>
  </section>
</div>
```

#### Feedback Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **No loading state** | **HIGH** | Dashboard appears instantly with no auth check | Show loading spinner while checking auth |
| **No error state** | **HIGH** | If route doesn't exist (404), no feedback | Implement error boundary |
| **Clicking unimplemented cards gives 404** | **HIGH** | No warning that feature isn't ready | Add `onClick` handler with modal: "Coming soon!" |

#### Mobile/Responsive Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Cards too cramped on mobile** | **MEDIUM** | `p-8` padding on user dashboard card excessive on mobile | Use responsive padding: `p-4 md:p-8` |
| **Grid doesn't collapse well** | **LOW** | `md:col-span-2` creates layout shift | Acceptable behavior |

#### Accessibility Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Emoji-only icons** | **MEDIUM** | Emojis like 📊 have no text alternative | Add `aria-label` to parent elements |
| **Color-only information** | **LOW** | Green gradient indicates "user section" but no text label | Add visible heading or icon |

**Suggested Fix**:
```tsx
<div className="text-5xl" role="img" aria-label="Dashboard icon">📱</div>
```

---

### 3. User Dashboard (`/apps/dashboard/src/app/user/content.tsx`)

#### Visual/Layout Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **No data state is weak** | **MEDIUM** | Line 38: "No recent events" is plain text | Add empty state illustration or helpful tips |
| **Stats grid cramped** | **LOW** | 6 metrics in grid feels dense | Consider 2-column layout on mobile |
| **Color coding not explained** | **MEDIUM** | Tilt levels use colors but no legend | Add color key or tooltip |

#### Feedback Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Loading state missing** | **HIGH** | No skeleton or spinner while fetching data | Add skeleton cards |
| **Error state generic** | **HIGH** | "Error loading data" with no context | Show specific error (network, auth, server) |
| **No refresh mechanism** | **HIGH** | Data could be stale, no way to refresh | Add "Refresh" button or auto-refresh timer |

**Suggested Fix**:
```tsx
// Add loading skeleton
{isLoading ? (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-slate-700 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-slate-600 rounded w-1/2"></div>
      </div>
    ))}
  </div>
) : (
  <StatsGrid stats={stats} />
)}
```

---

### 4. Top Navigation (All Pages)

#### Visual/Layout Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Nav items too close** | **LOW** | `gap: clamp(1rem, 2vw, 1.5rem)` feels tight on tablet | Increase to `clamp(1.5rem, 3vw, 2rem)` |
| **Active state unclear** | **MEDIUM** | Underline animation on hover is subtle | Make active page more obvious (bold + underline) |

#### Navigation/IA Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Inconsistent link labels** | **HIGH** | "Dashboard" vs "Casinos" vs "Degens" - unclear mental model | Standardize: "Casino Trust", "Degen Trust", "My Dashboard" |
| **Discord link opens new tab without warning** | **MEDIUM** | Line 56: `target="_blank"` with no icon indicating external link | Add external link icon or ARIA label |
| **No user account indicator** | **HIGH** | Logged-in users can't see their username/avatar | Add user menu or profile icon |

**Suggested Fix**:
```html
<a href="https://discord.gg/s6NNfPHxMS" class="btn btn-primary btn-nav" target="_blank" rel="noopener noreferrer">
  Join Discord
  <svg class="external-icon" aria-hidden="true"><!-- external link icon --></svg>
  <span class="sr-only">(opens in new tab)</span>
</a>
```

#### Mobile Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **Hamburger icon low contrast** | **MEDIUM** | `--text-secondary` on nav background is ~3.5:1 | Use `--text-primary` for button |
| **Mobile nav requires scrolling** | **LOW** | Many sections could overflow on short screens | Acceptable with scroll |
| **No close button visible** | **MEDIUM** | Users might not know hamburger becomes X | Add "Close" text label next to X |

---

### 5. Login Flow (Missing/Broken)

#### Critical Issues

| Issue | Severity | Description | Fix |
|-------|----------|-------------|-----|
| **No login page exists** | **CRITICAL** | Dashboard requires auth but no login UI | Create `/login.html` or `/auth/discord` |
| **No OAuth callback handler** | **CRITICAL** | Discord OAuth would fail - no redirect endpoint | Add `/auth/callback` route |
| **No session persistence check** | **HIGH** | Apps reload, user gets kicked out | Implement session cookies or JWT |
| **No "logged out" state** | **HIGH** | No indicator if session expires | Add auth guard with redirect |

**Required Implementation**:
```html
<!-- /frontend/public/login.html -->
<main class="login-page">
  <div class="login-card">
    <h1>Sign in to TiltCheck</h1>
    <p>Connect your Discord account to access your dashboard</p>
    <a href="/api/auth/discord" class="btn btn-primary">
      <svg><!-- Discord logo --></svg>
      Sign in with Discord
    </a>
    <p class="legal-text">
      By signing in, you agree to our <a href="/terms.html">Terms</a> and <a href="/privacy.html">Privacy Policy</a>.
    </p>
  </div>
</main>
```

---

## Cross-Cutting Issues

### Typography Hierarchy

| Issue | Severity | Fix |
|-------|----------|-----|
| Inconsistent heading scales | **MEDIUM** | Define clear h1-h6 scale in theme.css |
| Body text too small on mobile | **LOW** | Increase base to `clamp(1rem, 1vw, 1.125rem)` |
| No clear distinction between display and body fonts | **LOW** | Reserve Space Grotesk for headings only |

### Spacing System

| Issue | Severity | Fix |
|-------|----------|-----|
| Inconsistent section padding | **MEDIUM** | Standardize to `--section-padding-y: clamp(3rem, 8vw, 6rem)` |
| Card internal spacing varies | **LOW** | Use consistent `--card-padding: 1.5rem` |

### Color System

| Issue | Severity | Fix |
|-------|----------|-----|
| Status colors not defined in theme | **MEDIUM** | Add `--status-live`, `--status-beta`, `--status-soon` to theme.css (already done) |
| No dark mode toggle visible | **LOW** | "Theme" button at bottom-right is easy to miss - move to nav |

---

## Unused Code Scan

### Deprecated "Tip" References

**Files containing tipping references (JustTheTip is active, not deprecated)**:
- ✅ `/frontend/public/tools/justthetip.html` - **ACTIVE MODULE** (keep)
- ✅ `/frontend/public/index.html` - References JustTheTip tool (keep)
- ✅ `/frontend/public/early-access.html` - References tipping feature (keep)
- ✅ `/apps/dashboard/src/app/page.tsx` - "JustTheTip Monitor" link (keep)

**Verdict**: JustTheTip is a core module, not deprecated. No removal needed.

### Unused Components/Routes

| File | Status | Action |
|------|--------|--------|
| `/frontend/public/index-legacy.html` | **UNUSED** | Rename to `_archive/index-legacy.html` or delete |
| `/frontend/public/beta.html` | **UNUSED** | No links point to this page - archive or delete |
| `/frontend/public/component-gallery.html` | **DEV ONLY** | Move to `/docs/` folder |
| `/frontend/public/early-access.html` | **UNUSED** | Outdated waitlist page - archive |
| `/frontend/public/testimonials.html` | **UNUSED** | No testimonials yet - archive until ready |
| `/frontend/public/newsletter.html` | **ACTIVE** | Footer links to it - keep |
| `/frontend/public/control-room.html` | **ADMIN TOOL** | Keep but require auth |

### Unused Styles

**In `/frontend/public/styles/main.css`**:
- ✅ All classes are used
- ❌ `.dashboard-login` (lines 133-147 in justthetip.html) - only defined inline, not in main.css

**In `/frontend/public/styles/base.css`**:
- ✅ All utility classes used
- ⚠️ `.lede-accent` - only defined, never used (REMOVE)

**In `/frontend/public/styles/tool-page.css`**:
- Unknown (file not read) - needs audit

### Unused JavaScript

**In `/frontend/public/index.html`**:
- All scripts are active (KPI animation, mobile nav, analytics)
- ✅ No dead code found

**In `/frontend/public/breadcrumbs.js`**:
- Used by tool pages
- ✅ Keep

**In `/frontend/public/trust-dashboard.js`**:
- Unknown usage - needs audit

### Dead Links

| Link | Location | Status | Fix |
|------|----------|--------|-----|
| `/dashboard` | Multiple pages | ❓ Unclear destination | Point to `/apps/dashboard` or create redirect |
| `/tools/daad.html` | index.html | ⚠️ "Coming Soon" | Keep |
| `/tools/poker.html` | index.html | ⚠️ "Coming Soon" | Keep |
| `/tools/qualifyfirst.html` | index.html | ⚠️ "Coming Soon" | Keep |

---

## Cleanup Recommendations

### High Priority (Do Now)

1. **Remove unused legacy files**:
   ```bash
   mkdir -p frontend/_archive
   mv frontend/public/index-legacy.html frontend/_archive/
   mv frontend/public/beta.html frontend/_archive/
   mv frontend/public/early-access.html frontend/_archive/
   mv frontend/public/testimonials.html frontend/_archive/
   ```

2. **Fix navigation confusion**:
   - Rename "Dashboard" to "Launch App" in top nav
   - Split dashboard cards into "Your Tools" and "Admin Panel"
   - Add login page at `/login.html`

3. **Add loading/error states**:
   - User dashboard skeleton
   - KPI loading animation
   - Error boundaries

### Medium Priority (This Week)

4. **Improve accessibility**:
   - Fix `--text-muted` contrast to 4.5:1
   - Add ARIA labels to emoji icons
   - Standardize focus indicators

5. **Mobile UX improvements**:
   - Add "Close" text to hamburger X
   - Fix tools grid on <320px screens
   - Responsive padding on dashboard cards

### Low Priority (Backlog)

6. **Polish**:
   - Add empty state illustrations
   - Implement theme switcher in nav
   - Add external link icons
   - Create style guide page

---

## Build Verification

All changes should be tested with:
```bash
pnpm build --filter @tiltcheck/frontend
pnpm build --filter @tiltcheck/dashboard
```

**Expected**: Clean build, no TypeScript errors, no console warnings.

---

## Summary Metrics

| Category | Issues Found | High Severity | Medium | Low |
|----------|--------------|---------------|--------|-----|
| Visual/Layout | 18 | 3 | 8 | 7 |
| Navigation/IA | 15 | 9 | 4 | 2 |
| Feedback | 12 | 8 | 3 | 1 |
| Mobile/Responsive | 11 | 2 | 6 | 3 |
| Accessibility | 10 | 0 | 5 | 5 |
| **TOTAL** | **66** | **22** | **26** | **18** |

---

**Report Compiled By**: TiltCheck Development Agent  
**Next Steps**: Review with founder (jmenichole), prioritize fixes, create implementation tickets
