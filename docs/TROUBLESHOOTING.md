# TiltCheck Troubleshooting Guide

This guide covers common issues and their solutions when deploying, running, or developing the TiltCheck monorepo.

## 1. Node & pnpm Issues

**Issue**: `pnpm install` fails or hangs indefinitely.

- **Solution**:
  - Delete `node_modules` in the root and run `pnpm store prune` before retrying `pnpm install`.
  - Ensure you are using the correct Node version specified in `.nvmrc` or `package.json` (typically v18 or v20). Use `nvm use` if applicable.

**Issue**: `Cannot find module X` or `Module not found X` during build.

- **Solution**:
  - Ensure you have built the workspace dependencies first. Run `pnpm turbo run build` from the root.
  - Check the `tsconfig.json` of the package exhibiting the error to ensure `paths` and `references` are set correctly.

## 2. Discord Bot Connectivity

**Issue**: The bot starts but does not appear online in Discord.

- **Solution**:
  - Verify your `TILT_DISCORD_BOT_TOKEN` in `.env` is correct.
  - Ensure the bot has been invited to the server (`TILT_DISCORD_GUILD_ID`) with the correct permissions.
  - Check if the Discord API is experiencing an outage at [discordstatus.com](https://discordstatus.com/).

**Issue**: Slash commands are not registering.

- **Solution**:
  - Run the designated command registration script usually found in the bot's `scripts/` directory (e.g., `pnpm run register-commands`).
  - Ensure your `TILT_DISCORD_CLIENT_ID` is correct.
  - Note that global commands can take up to an hour to propagate in Discord, while guild-specific commands (using `TILT_DISCORD_GUILD_ID`) update immediately.

## 3. Database & Supabase Connectivity

**Issue**: `Error connecting to the database` or silent failures during query execution.

- **Solution**:
  - Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are correct in your `.env`.
  - Check if your local or remote database is accepting connections (e.g., firewall issues, IP allowlisting).
  - Ensure the user/service role has appropriate row-level security (RLS) policies configured in Supabase.

**Issue**: Migrations fail to apply.

- **Solution**:
  - Review the migration logs for syntax errors in your SQL files.
  - If using Prisma or Drizzle, ensure your schema matches the remote database state or run a baseline migration.

## 4. Script Execution & Tooling

**Issue**: `pnpm turbo run X` fails due to cache issues.

- **Solution**:
  - Add the `--force` flag to ignore the cache: `pnpm turbo run build --force`.
  - Alternatively, manually clear the `.turbo` folder in the root or specific workspace packages.

**Issue**: Environment variables are not being picked up by a script.

- **Solution**:
  - Ensure you are using a tool like `dotenv-cli` or `cross-env` in your `package.json` scripts.
  - Verify that the specific `.env` file (e.g., `.env.local` vs `.env.production`) is being loaded based on your `NODE_ENV`.

## 5. Development Server Issues

**Issue**: Cannot access `http://localhost:3000` (Next.js Dashboard or Apps).

- **Solution**:
  - Check if another service is already running on port 3000. Use `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows) to identify the process.
  - Change the port by running `PORT=3001 pnpm run dev` or updating the port in the script configuration.

**Issue**: CORS Errors when API calls are made from the frontend.

- **Solution**:
  - Verify that `ALLOWED_ORIGINS` in your `.env` includes the URL you are testing from (e.g., `http://localhost:3000`).
  - Ensure that the backend server is configured to parse the `ALLOWED_ORIGINS` array correctly.
