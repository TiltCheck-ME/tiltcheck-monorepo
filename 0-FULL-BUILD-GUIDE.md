<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-24 -->

# The "One True Path": A Start-to-Finish Build Guide

**Purpose:** This document cuts through the noise. It is the single source of truth for how to set up, develop, test, and deploy code for the TiltCheck monorepo. Forget the other docs for a moment. Start here.

**Philosophy:** We build and test locally on your machine. We deploy to the cloud automatically. This keeps your local environment fast and the production environment stable.

---

## Part 1: First-Time Setup (Do This Once)

This gets the project running on your computer.

1.  **Get the Code:**
    ```bash
    git clone https://github.com/jmenichole/tiltcheck-monorepo.git
    cd tiltcheck-monorepo
    ```

2.  **Install Dependencies:** We use `pnpm` to manage the monorepo.
    ```bash
    # This installs all dependencies for all services and links them together.
    pnpm install
    ```

3.  **Configure Environment:** The project needs secrets and keys to run.
    - Find the `.env.example` file in the root directory.
    - Copy it to a new file named `.env`.
    - Fill in the values. For local development, you can use placeholder values for anything you're not actively working on. The `AUDIT-QUICK-REFERENCE.md` can help identify what's critical.

4.  **Run a Full Build:** This compiles all the code and makes sure everything is linked correctly.
    ```bash
    # This command builds every app and package in the correct order.
    pnpm build
    ```
    If this command succeeds, your environment is set up correctly.

---

## Part 2: The Daily Workflow (The "Loop")

This is the process you'll follow every time you want to make a change.

1.  **Get Latest Changes:** Always start by making sure you have the latest code from the `main` branch.
    ```bash
    git checkout main
    git pull origin main
    pnpm install # Run this in case dependencies have changed
    ```

2.  **Create a New Branch:** Never work directly on `main`. Give your branch a descriptive name.
    ```bash
    # Example: git checkout -b feature/add-blog-comments
    git checkout -b <your-branch-name>
    ```

3.  **Start the Dev Server:** This command runs all services in "watch mode". When you save a file, the relevant service will automatically restart.
    ```bash
    pnpm dev
    ```
    You can now access the services locally (e.g., `http://localhost:5173` for the web app, `http://localhost:3001` for the API).

4.  **Make Your Code Changes:** This is where you do your work. Edit the files in `apps/`, `modules/`, or `packages/`.

5.  **Run Tests:** Before you commit, make sure you haven't broken anything.
    ```bash
    # In a new terminal (leave `pnpm dev` running)
    pnpm test
    ```

6.  **Update The Log:** This is a non-negotiable project rule (**Degen Law #7**). Add a summary of your work to `SESSION_LOG.md`.
    ```markdown
    ## 2026-03-24 - My Awesome Feature
    - Added a new button to the blog page.
    - Fixed a bug in the tipping logic.
    ```

7.  **Commit and Push:** Save your work to Git and push your branch to GitHub.
    ```bash
    git add .
    git commit -m "feat: Add comments to blog"
    git push origin <your-branch-name>
    ```

8.  **Open a Pull Request (PR):** In GitHub, create a PR to merge your branch into `main`. The `Brand Law Enforcer` agent will automatically check your work for compliance.

**This is the complete development loop. Repeat these steps for every new feature or fix.**

---

## Part 3: How It Gets to Production (The "Magic")

You don't need to do this manually. This happens automatically when your PR is merged into `main`.

1.  **Merge to `main`:** Once your PR is approved and passes all checks, you merge it.

2.  **Cloud Build is Triggered:** A file named `cloudbuild.yaml` tells Google Cloud to wake up.

3.  **Docker Image is Built:** Cloud Build runs a `docker build` command, which packages your application (e.g., the `api` service) into a container.

4.  **Cloud Run Deploys:** The new container image is sent to Cloud Run, which seamlessly replaces the old version with the new one.

The `SESSION_LOG.md` confirms this is the current, live architecture. Your only job is to get your code into the `main` branch by following the workflow in Part 2. The rest is automated.

---

## Summary

- **Do all your work on your local machine.**
- **Follow the "Loop" in Part 2.**
- **Let the automated system handle deployment.**

This structure is designed to be robust and to let you focus on building features without worrying about the deployment complexities. The "mess" was just a lack of a clear map. This is the map.

Let's build from here.