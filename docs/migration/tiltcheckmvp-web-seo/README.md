<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->

# MVP web SEO — sitemap + robots

Copy into `tiltcheckmvp` at cutover or before staging sign-off.

## Files

| Artifact (this repo) | Target (tiltcheckmvp) |
|----------------------|------------------------|
| `docs/migration/tiltcheckmvp-web-seo/sitemap.ts` | `apps/web/src/app/sitemap.ts` |
| `docs/migration/tiltcheckmvp-web-seo/robots.ts` | `apps/web/src/app/robots.ts` |

## Apply

```bash
cd tiltcheckmvp
git checkout -b cursor/web-sitemap-ec58
cp /path/to/tiltcheck-monorepo/docs/migration/tiltcheckmvp-web-seo/sitemap.ts apps/web/src/app/sitemap.ts
cp /path/to/tiltcheck-monorepo/docs/migration/tiltcheckmvp-web-seo/robots.ts apps/web/src/app/robots.ts
pnpm --filter @tiltcheck/web typecheck
git add apps/web/src/app/sitemap.ts apps/web/src/app/robots.ts
git commit -m "feat(web): add sitemap.xml and robots.txt for public MVP routes"
git push -u origin cursor/web-sitemap-ec58
```

## Verify

- `https://tiltcheck.me/sitemap.xml` lists public routes + `/casinos/[slug]`
- `https://tiltcheck.me/robots.txt` disallows `/dashboard`, `/settings`, `/login`, `/api/`
- `/tools/*` excluded from sitemap (noindex layout)

## Reference

Full route inventory: [WEB-SITEMAP.md](../WEB-SITEMAP.md)
