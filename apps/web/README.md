# TiltCheck Web App (`apps/web`)

Public-facing TiltCheck web properties (landing pages, docs pages, auth pages, dashboard gate, and static assets).

## Key Paths

```
apps/web/
├── index.html                 # Main landing page
├── login.html                 # Discord login entry point
├── dashboard/index.html       # Auth-gate for dashboard access
├── docs/                      # Public docs pages
├── tools/                     # Tool-specific marketing pages
├── components/                # Reusable nav/footer/component fragments
├── scripts/                   # Browser scripts
├── assets/                    # Icons, logos, static assets
├── styles/                    # Shared styles
└── copy-static-to-dist.mjs    # Copies non-Vite static files to dist/
```

## Dashboard Auth Gate

`/dashboard/` is an auth gate page:

- checks session via `/play/api/user`
- redirects authenticated users to `/play/profile.html`
- redirects unauthenticated users to `/login.html?next=%2Fplay%2Fprofile.html`

This keeps dashboard entry links stable while enforcing Discord-authenticated access.

## Development

```bash
# From repository root
pnpm -C apps/web dev

# Production build
pnpm -C apps/web build

# Preview built output
pnpm -C apps/web preview
```

## Build Behavior

Build uses:

1. `vite build`
2. `node copy-static-to-dist.mjs`

The copy step keeps non-Vite static files (legacy HTML pages, `/assets`, docs pages, etc.) in `dist/` so production includes all required icons and static resources.

## Related Commands (repo root)

```bash
# Landing/web a11y snapshot tests
pnpm a11y:audit:landing
pnpm a11y:serve:landing
```
