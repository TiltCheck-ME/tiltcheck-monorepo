# TiltCheck Deployment & Operations Manual

This manual outlines the steps to deploy, maintain, and update the TiltCheck ecosystem.

## 1. Onboarding Platform Recommendation

**Recommended Home: Web App (PWA)**

Given the constraints (financial/app store) and the need for scalability:
*   **Primary Hub:** The **Web App (PWA)** hosted at `tiltcheck.me`. This bypasses App Store fees, allows instant updates, and works on both mobile and desktop.
*   **Entry Points:**
    *   **Discord:** Use the bot to funnel users to the Web App via `/tiltcheck` command.
    *   **Extension:** The sidebar acts as a "companion mode" for the Web App while browsing casinos.

## 2. Deployment Steps

### Prerequisites
*   **Vercel Account** (Frontend hosting)
*   **Railway/Heroku/DigitalOcean Account** (Backend hosting)
*   **Supabase Account** (Database)
*   **GitHub Repository** (Source code)

### Step 1: Database Setup (Supabase)
1.  Log in to Supabase and create a new project `tiltcheck-prod`.
2.  Go to **SQL Editor** and run the schema migration scripts located in `packages/database/schema.sql` (ensure this file exists with your table definitions).
3.  Go to **Project Settings > API** and copy the `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### Step 2: Backend Deployment (Railway/Heroku)
1.  Connect your GitHub repo to Railway.
2.  Set the **Root Directory** to `apps/backend` (or wherever your server entry point is).
3.  **Environment Variables:** Add the following:
    *   `DATABASE_URL`: (From Supabase Connection String)
    *   `DISCORD_CLIENT_ID` & `DISCORD_CLIENT_SECRET`: (From Discord Developer Portal)
    *   `SOLANA_RPC_URL`: (Your RPC provider URL)
    *   `PORT`: `8080` (or your preferred port)
4.  Deploy. Note the **Public URL** provided by Railway (e.g., `https://api.tiltcheck.railway.app`).

### Step 3: Frontend/PWA Deployment (Vercel)
1.  Connect your GitHub repo to Vercel.
2.  Set the **Root Directory** to `apps/web` (or your frontend folder).
3.  **Environment Variables:**
    *   `NEXT_PUBLIC_API_URL`: The Backend URL from Step 2.
    *   `NEXT_PUBLIC_SUPABASE_URL`: From Step 1.
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: From Step 1.
4.  Deploy. Your PWA is now live at `https://tiltcheck.me`.

### Step 4: Chrome Extension Deployment
1.  Update `manifest.json` version in `apps/chrome-extension`.
2.  Run build command: `npm run build:extension`.
3.  Zip the `dist` folder.
4.  **Manual Distribution:** Host the `.zip` on your website for users to download and install via Developer Mode.
5.  **Store Distribution:** When ready, upload to Chrome Web Store Developer Dashboard ($5 one-time fee).

## 3. CI/CD & Automation Checks

### Checking Dependabot
Dependabot ensures your dependencies are secure and up-to-date.

1.  Go to your GitHub Repository.
2.  Click **Settings > Code security and analysis**.
3.  Ensure **Dependabot alerts** and **Dependabot security updates** are Enabled.
4.  To verify configuration, check `.github/dependabot.yml`. It should look like this:
    ```yaml
    version: 2
    updates:
      - package-ecosystem: "npm"
        directory: "/"
        schedule:
          interval: "weekly"
    ```
5.  Go to the **Pull requests** tab to see if Dependabot has created any update PRs.

### Ensuring Pipeline Success
1.  Go to the **Actions** tab in GitHub.
2.  Check the latest workflow runs. Green checkmarks indicate success.
3.  If a job fails:
    *   Click on the failed run.
    *   Click on the failed job step to see the logs.
    *   Common issues: Linting errors, failed tests, or missing secrets.
4.  **Fix:** Resolve the error locally, commit, and push. The pipeline will re-run automatically.

## 4. Merging & Updating

To merge all branches and ensure your main branch is up to date:

**Using GitHub UI (Recommended):**
1.  Go to **Pull requests**.
2.  Review each open PR.
3.  If checks pass (green), click **Merge pull request**.

**Using Command Line (For local cleanup):**
```bash
# 1. Switch to main
git checkout main

# 2. Pull latest changes
git pull origin main

# 3. Merge a specific branch (e.g., feature/new-ui)
git merge feature/new-ui

# 4. Push changes
git push origin main
```

*Note: Always ensure CI pipelines pass before merging to main to prevent breaking production.*