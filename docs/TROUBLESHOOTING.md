# Troubleshooting Guide

This guide covers common issues and their solutions when working on the TiltCheck Ecosystem monorepo.

## 1. Local Development (pnpm)

**Issue: Dependencies fail to map correctly in Turborepo or during builds.**

- **Description:** Sometimes `pnpm install` throws caching or workspace mapping errors.
- **Solution:** Stop all running servers, delete the `node_modules` folders, and run a fresh installation:

  ```bash
  rm -rf node_modules
  pnpm i --ignore-scripts
  ```

**Issue: `Type Error: module not found` in the Browser Extension.**

- **Description:** Typescript might throw relative module not found errors when it compiles with `moduleResolution: Node16/NodeNext`.
- **Solution:** Verify that your file imports are using `.js` extensions for local module resolution (e.g. `import { Something } from './file.js';`), or map directly to external dependencies (`@tiltcheck/utils`). Do not omit the extension when doing relative imports inside the Chrome Extension `content.ts`.

## 2. API / Bot Issues

**Issue: Invalid API Key or Unauthorized Error in the Discord Bot**

- **Description:** Your bot will not authenticate with the Discord API.
- **Solution:** Double check your `.env` variables `TIP_DISCORD_BOT_TOKEN` or `TILT_DISCORD_BOT_TOKEN` (depending on the package you are working on). They **must** be present without trailing whitespace or quotes. Make sure they correspond to the correct `CLIENT_ID`.

**Issue: TiltGuard Backend Services fail to respond / CORS Errors**

- **Description:** Making requests from the web app or Chrome Extension results in an immediate Network Error or CORS restriction block.
- **Solution:**
  1. Ensure your backend is running (`pnpm --filter @tiltcheck/api dev`).
  2. Verify that `ALLOWED_ORIGINS` in your `.env` contains the protocol + domain generating the request (`http://localhost:3000` or the Chrome extension ID origin).
  3. Ensure `NODE_ENV=development` allows loose cross-origin rules in your local network.

## 3. Storage / Database (Supabase)

**Issue: Database schema mismatches or missing tables.**

- **Description:** Your application calls a method returning a 404 or `relation does not exist` from Supabase.
- **Solution:** Validate that your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` point to the correct instance (staging vs. local vs. production) where the latest SQL migrations have been executed.

## 4. Environment Variables

**Issue: The platform crashes on startup claiming "No Configuration Found".**

- **Description:** Many modules rely on strong validation during startup.
- **Solution:** Check the `docs/ENV-VARIABLES.md` file against your local `.env`. If a variable is marked as required (e.g. `JWT_SECRET`), the application may fail to start immediately.

### Need more help?

Reach out to the `#dev-help` channel in the official Discord Server or open a GitHub Issue describing your trace logs in detail.
