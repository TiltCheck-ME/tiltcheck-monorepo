<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# MVP web SEO — styled sitemap + robots

Copy into `tiltcheckmvp` at cutover or before staging sign-off.

## What ships

| Feature | URL | Files |
|---------|-----|-------|
| Styled HTML sitemap | `/site-map` | `site-map/page.tsx`, `lib/sitemap-entries.ts` |
| XML sitemap (XSL in Firefox/Safari) | `/sitemap.xml` | `sitemap.xml/route.ts`, `lib/sitemap-xml.ts`, `public/sitemap.xsl` |
| Crawler rules | `/robots.txt` | `robots.ts` (unchanged from prior artifact — copy from repo if needed) |

**Note:** Chrome no longer renders XSL for XML. Use `/site-map` for humans; `/sitemap.xml` stays for crawlers.

## Apply

```bash
cd tiltcheckmvp
git checkout -b cursor/web-sitemap-ec58

# Libraries
cp docs/migration/tiltcheckmvp-web-seo/sitemap-entries.ts apps/web/src/lib/sitemap-entries.ts
cp docs/migration/tiltcheckmvp-web-seo/sitemap-xml.ts apps/web/src/lib/sitemap-xml.ts

# Routes
mkdir -p apps/web/src/app/sitemap.xml apps/web/src/app/site-map
cp docs/migration/tiltcheckmvp-web-seo/sitemap-route.ts apps/web/src/app/sitemap.xml/route.ts
cp docs/migration/tiltcheckmvp-web-seo/site-map-page.tsx apps/web/src/app/site-map/page.tsx
cp docs/migration/tiltcheckmvp-web-seo/public/sitemap.xsl apps/web/public/sitemap.xsl

# Remove legacy MetadataRoute sitemap if present
rm -f apps/web/src/app/sitemap.ts

pnpm --filter @tiltcheck/web typecheck
git add -A
git commit -m "feat(web): styled site map page and XSL sitemap.xml"
git push -u origin cursor/web-sitemap-ec58
```

(Path prefix `docs/migration/...` assumes files copied from v1 monorepo.)

## Verify

- `https://tiltcheck.me/site-map` — dark themed index with category cards
- `https://tiltcheck.me/sitemap.xml` — XML with `xml-stylesheet` PI (styled in Firefox)
- `/site-map` listed in sitemap feed
- `/not-a-real-page` returns styled 404 with recovery links (not in sitemap; `robots: noindex`)

## Reference

Full route inventory: [WEB-SITEMAP.md](../WEB-SITEMAP.md)
