# TiltCheck Landing Site

Public-facing landing pages for the TiltCheck ecosystem.

## Structure

```
public/
├── index.html          # Main landing page
├── about.html          # About page with legal info
├── styles/            # CSS files
│   └── base.css       # Base styles
├── assets/            # Images, icons
├── components/        # Reusable UI fragments
│   ├── index.html
│   └── trust-gauges.html
└── tools/             # Tool-specific pages
```

## Development

**Local preview:**
```bash
# Serve at http://localhost:8090
pnpm a11y:serve:landing

# Or use any static server
npx http-server public -p 8090 -c-1
```

**Accessibility audits:**
```bash
# Run Pa11y + Lighthouse on index.html
pnpm a11y:audit:landing

# View Lighthouse report
cat ../../../dist/landing-lighthouse-accessibility.json | jq '.categories.accessibility.score'
```

## Standards

- **Contrast**: WCAG AA (4.5:1 normal text, 3.0:1 large)
- **Mobile-first**: Responsive breakpoints at 680px, 768px
- **Semantic HTML**: Proper heading hierarchy, landmarks, alt text
- **Performance**: Minimal dependencies, inline critical CSS

## Colors

- Background: `#0a0a0a`
- Surface: `#1a1a1a`
- Text primary: `#e0e0e0`
- Footer text: `#999` (6.95:1 contrast ratio)
- Accent: `#00d4aa` (cyan)
- Accent alt: `#00a8ff` (blue)

## Quick Edits

- Hero copy: `index.html` line ~70
- Footer links: `index.html` line ~467
- Tool cards: `index.html` line ~300
- Mobile breakpoints: `index.html` line ~208

---

Built by @jmenichole • TiltCheck © 2024–2025
