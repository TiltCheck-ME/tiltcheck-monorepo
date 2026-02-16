# TiltCheck Landing Page - Theme & Customization Guide

## Overview

The TiltCheck landing page uses a modern, modular CSS architecture with CSS custom properties (variables) for easy theme customization. This guide explains how to swap themes, customize colors, and maintain consistency across the ecosystem.

## Architecture

```
services/landing/public/
├── index-v2.html          # New semantic HTML (production ready)
├── index.html             # Original HTML (deprecated)
├── styles/
│   ├── theme.css          # Theme variables (colors, fonts, spacing)
│   └── main.css           # Component styles (uses theme variables)
```

## Default Theme: Cyber-Punk Neon

The default theme features:
- **Primary Color**: Neon Teal (`#00d4aa`)
- **Secondary Color**: Electric Blue (`#00a8ff`)
- **Accent Color**: Neon Purple (`#a855f7`)
- **Background**: Deep Black (`#0a0a0a`)
- **Typography**: Inter (sans-serif)

## How to Swap Themes

### Option 1: Degen Edition (Black/Gold)

1. Open `services/landing/public/styles/theme.css`
2. Comment out the default `:root` block (lines 13-79)
3. Uncomment the "Degen Edition" block (lines 87-111)

**Degen Edition Colors:**
- Primary: Gold (`#ffd700`)
- Secondary: Orange (`#ff6b35`)
- Accent: Hot Pink (`#ff006e`)
- Background: Pure Black (`#000000`)

### Option 2: Custom Theme

Create your own theme by modifying the CSS variables in `theme.css`:

```css
:root {
  /* Brand Colors */
  --color-primary: #your-color;      /* Main brand color */
  --color-secondary: #your-color;    /* Secondary accent */
  --color-accent: #your-color;       /* Tertiary accent */
  --color-gold: #your-color;         /* Highlight color */
  
  /* Backgrounds */
  --bg-primary: #your-color;         /* Main background */
  --bg-secondary: #your-color;       /* Section backgrounds */
  --bg-card: #your-color;            /* Card/panel backgrounds */
  --bg-elevated: #your-color;        /* Elevated surfaces */
  
  /* Text */
  --text-primary: #your-color;       /* Headings */
  --text-secondary: #your-color;     /* Body text */
  --text-muted: #your-color;         /* Labels, meta */
  
  /* Status Colors */
  --status-live: #your-color;        /* Live tools */
  --status-beta: #your-color;        /* Beta tools */
  --status-soon: #your-color;        /* Coming soon */
}
```

## Key Design Tokens

### Colors

| Token | Default | Purpose |
|-------|---------|---------|
| `--color-primary` | `#00d4aa` | Primary brand color, CTAs, links |
| `--color-secondary` | `#00a8ff` | Secondary accents, gradients |
| `--color-accent` | `#a855f7` | Tertiary highlights |
| `--color-gold` | `#ffd700` | Premium features, badges |

### Typography

| Token | Default | Usage |
|-------|---------|-------|
| `--text-xs` | `0.7-0.8rem` | Labels, badges |
| `--text-sm` | `0.85-0.95rem` | Navigation, meta |
| `--text-base` | `1-1.1rem` | Body text |
| `--text-lg` | `1.15-1.35rem` | Subheadings |
| `--text-xl` | `1.5-2rem` | Section titles |
| `--text-2xl` | `2-2.8rem` | Page titles |
| `--text-3xl` | `2.5-3.5rem` | Hero headings |
| `--text-4xl` | `3-4rem` | Main hero |

**Note**: All text sizes use `clamp()` for fluid typography across devices.

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `0.25rem` | Tight spacing |
| `--space-sm` | `0.5rem` | Small gaps |
| `--space-md` | `1rem` | Default spacing |
| `--space-lg` | `1.5rem` | Section padding |
| `--space-xl` | `2rem` | Large gaps |
| `--space-2xl` | `3rem` | Hero sections |
| `--space-3xl` | `4rem` | Major sections |

## Accessibility Guidelines

### Contrast Ratios

All themes MUST meet WCAG 2.1 AA standards:
- **Normal text**: 4.5:1 contrast minimum
- **Large text (18pt+)**: 3:1 contrast minimum
- **Interactive elements**: 3:1 contrast minimum

**Testing Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools Lighthouse

### Focus States

All interactive elements have visible focus states:
```css
element:focus-visible {
  outline: 2-3px solid var(--color-primary);
  outline-offset: 3-4px;
}
```

### Screen Reader Support

- Semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- ARIA labels on interactive elements
- Skip-to-content link for keyboard navigation
- Alt text on all images/icons

## Performance Optimizations

### CSS

1. **Critical CSS**: Theme variables loaded first
2. **No inline styles**: All styles in external CSS
3. **CSS custom properties**: Runtime theming without rebuilds
4. **Efficient selectors**: Class-based, low specificity

### HTML

1. **Semantic markup**: Better SEO and accessibility
2. **Lazy loading**: Images loaded below the fold
3. **Preconnect**: Fonts loaded via `<link rel="preconnect">`
4. **Meta tags**: Mobile-optimized viewport

### JavaScript

1. **Deferred loading**: Analytics loaded after page interactive
2. **Intersection Observer**: Animations only when visible
3. **Debounced animations**: Reduced motion preference support
4. **No blocking scripts**: All JS at end of `<body>`

## Component Library

### Buttons

```html
<!-- Primary CTA -->
<a href="/dashboard" class="btn btn-primary">Launch TiltCheck</a>

<!-- Secondary -->
<a href="#" class="btn btn-secondary">Learn More</a>

<!-- Disabled -->
<button class="btn btn-secondary btn-disabled" aria-disabled="true">
  Coming Soon
</button>
```

### Cards

```html
<a class="tool-card" href="/tools/example.html">
  <h3>Tool Name</h3>
  <p>Tool description goes here.</p>
  <span class="tool-status status-live">Live</span>
</a>
```

**Status variants:**
- `.status-live` - Green (operational)
- `.status-beta` - Yellow (testing)
- `.status-soon` - Gray (coming soon)

### Stats/KPIs

```html
<div class="stat">
  <span class="stat-number">100</span>
  <span class="stat-label">Metric Name</span>
</div>
```

## Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | `< 768px` | Phones |
| Tablet | `768px - 1024px` | Tablets |
| Desktop | `> 1024px` | Desktops |

**Note**: All sizing uses fluid typography and spacing, so breakpoints are minimal.

## Browser Support

- **Chrome/Edge**: Last 2 versions
- **Firefox**: Last 2 versions
- **Safari**: Last 2 versions
- **Mobile Safari**: iOS 13+
- **Chrome Mobile**: Last 2 versions

**Required Features:**
- CSS Custom Properties
- CSS Grid & Flexbox
- Intersection Observer API (progressive enhancement)

## Migration from Old HTML

To switch from `index.html` to `index-v2.html`:

1. **Backup current file:**
   ```bash
   cp index.html index-old-backup.html
   ```

2. **Replace index:**
   ```bash
   mv index-v2.html index.html
   ```

3. **Test all pages:**
   - Check navigation links
   - Verify responsive design
   - Test keyboard navigation
   - Run Lighthouse audit

4. **Update server config** (if needed):
   - Ensure CSS files served with correct MIME type
   - Enable gzip compression
   - Set cache headers for static assets

## Testing Checklist

- [ ] All links work correctly
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Focus states visible on keyboard navigation
- [ ] Color contrast meets WCAG AA
- [ ] Images have alt text
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Page loads in < 3 seconds
- [ ] Lighthouse score > 90
- [ ] Screen reader navigation works
- [ ] No console errors

## Future Enhancements

- [ ] Dark mode toggle (auto/manual)
- [ ] Theme persistence (localStorage)
- [ ] Animated background effects
- [ ] More theme presets (Retro, Minimal, etc.)
- [ ] Component showcase page
- [ ] Style guide documentation

## Support

For questions or issues:
- GitHub: [tiltcheck-monorepo](https://github.com/jmenichole/tiltcheck-monorepo)
- Discord: [TiltCheck Community](https://discord.gg/s6NNfPHxMS)
- Twitter: [@Tilt_check](https://x.com/Tilt_check)

---

**Made for degens by degens** • TiltCheck © 2024-2025
