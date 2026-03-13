# TiltCheck Development Plan

This document outlines the development plan for TiltCheck, incorporating new feature requests and priorities.

## Phase 1: Fix Discord OAuth "Invalid State Error"

This is the highest priority task to ensure the core authentication flow is stable.

### 1.1. Investigate the "Invalid State Error"

- **Action:** Search the codebase for the string "Invalid OAuth state" to pinpoint the exact location where the error is thrown.
- **Action:** Analyze the `/auth/discord/callback` route in `apps/api/src/routes/auth.ts`, which is responsible for validating the
  OAuth state.
- **Focus:** Pay close attention to the comparison between the `state` parameter from the query and the `storedState` from the
  `oauth_state` cookie.

### 1.2. Identify the Root Cause

Based on the investigation, determine the root cause of the state mismatch. Potential causes include:

- The `oauth_state` cookie is not being set correctly or is being cleared prematurely.
- The `state` parameter is being modified or lost during the redirect from Discord.
- There is a discrepancy in how the state is generated versus how it is validated.

### 1.3. Propose and Implement a Fix

The fix will be tailored to the identified root cause. Possible solutions include:

- **Cookie Correction:** Adjust cookie settings (e.g., `sameSite`, `secure`, `domain`).
- **State Parameter Handling:** Ensure the `state` parameter is correctly passed and maintained.
- **Robust Validation:** Modify the state validation logic to be more resilient.

### 1.4. Verification

- **Action:** After implementing the fix, manually test the Discord login flow from the Chrome extension and the web app.
- **Success Criteria:** Successful authentication via Discord without the "Invalid State Error".

## Phase 1.5 Audit Website Context
the website needs to be updated for feature relevance, marketing impact and clarity. tools that work should be listed, if its build and hosted lets link it in. first audit, then review and brainstorm via interactive questions with developer to ensure visual concept is grasped, then edit them to fit the build.


## Phase 2: Implement Auto-Vault (MVP)

As requested, the Auto-Vault is an MVP priority.

### 2.1. Initial Codebase Investigation

- **Action:** Read `apps/chrome-extension/src/autovault.ts` to understand existing vault logic.
- **Action:** Analyze `apps/chrome-extension/src/content.ts` and `sidebar.ts` for integration points.
- **Action:** Search for existing vault-related API endpoints in `apps/api`.

### 2.2. MVP Feature Definition

- **Simplified Rules:** The MVP will feature a structured rule builder in the UI, not a full NLP engine. Rules will follow the
  format: "Vault X% of every win over Y amount".
- **"Clutch" Summary:** A simple UI display in the sidebar showing the total amount vaulted during the current session.

### 2.3. Implementation Steps

- **Frontend (Chrome Extension):**
    - Create a UI section for managing Auto-Vault rules.
    - Implement DOM monitoring in `content.ts` to detect wins on supported casino sites.
    - Send requests to the backend to update the user's vault when a rule is matched.
    - Update the "Clutch" summary UI.
- **Backend (API):**
    - Create a new authenticated API endpoint (e.g., `POST /api/vault/deposit`).
    - Implement logic to store vault balances in the database. This may require schema changes in `packages/db`.

### 2.4. Verification

- **Action:** Test the feature on a supported casino site by setting a rule, simulating a win, and verifying that the vault
  balance is updated correctly in the UI and database.

## Tasks for Later Development

The following features are documented for future development phases.

- [ ] **HUD Overlay:** A persistent sidebar on casino sites with real-time stats and a "Vibe Check" button for social intervention
  via Discord.
- [ ] **Zero-Friction Extraction:** A streamlined process for transferring funds to a safe wallet.
- [ ] **The TiltCheck DAO (The Safety Net):** A community-governed fund for members, funded by affiliate commissions and tips.
- [ ] **Transparency Dashboard:** A public dashboard showing "Total Lives Saved" and the Emergency Fund balance.
