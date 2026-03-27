# Implementation Plan: Core Degen-Safety Features

This plan outlines the tasks required to implement the Tilt Gut Check and Solana Wallet Linking features.

## Phase 1: Wallet Linking Backend

- [x] **Task:** Create a new table in Supabase to store the mapping between Discord IDs and Solana public keys.
- [~] **Task:** Implement a new API endpoint in `apps/api` (e.g., `POST /user/wallet`) that accepts a Discord ID, a public key, and a signed message.
    - [ ] Sub-task: The endpoint should verify the signature to ensure the user owns the provided public key.
    - [ ] Sub-task: Upon successful verification, the endpoint should store the Discord ID and public key in the new Supabase table.
- [ ] **Task:** Write unit tests for the signature verification logic.
- [ ] **Task:** Write integration tests for the new API endpoint.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 1: Wallet Linking Backend' (Protocol in workflow.md)

## Phase 2: Wallet Linking Frontend (Discord Bot)

- [ ] **Task:** Create a new `/linkwallet` command in `apps/discord-bot`.
- [ ] **Task:** Implement the command logic:
    - [ ] Sub-task: Generate a unique message for the user to sign.
    - [ ] Sub-task: Display the message to the user with clear instructions on how to sign it.
    - [ ] Sub-task: Implement a modal or other input mechanism for the user to submit their public key and the signed message.
    - [ ] Sub-task: Call the `POST /user/wallet` API endpoint to link the wallet.
    - [ ] Sub-task: Provide feedback to the user on the success or failure of the linking process.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 2: Wallet Linking Frontend (Discord Bot)' (Protocol in workflow.md)

## Phase 3: Tilt Check Backend

- [ ] **Task:** Implement a new API endpoint in `apps/api` (e.g., `GET /user/:discordId/tilt-status`).
- [ ] **Task:** Implement the logic for the endpoint:
    - [ ] Sub-task: Query the Degen Trust Engine (or a simplified version of it) for the user's recent activity.
    - [ ] Sub-task: Implement a simple heuristic to determine if the user is "tilted" or "not tilted".
    - [ ] Sub-task: Return the tilt status.
- [ ] **Task:** Write unit tests for the tilt heuristic logic.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 3: Tilt Check Backend' (Protocol in workflow.md)

## Phase 4: Tilt Check Frontend (Discord Bot)

- [ ] **Task:** Create a new `/tiltcheck` command in `apps/discord-bot`.
- [ ] **Task:** Implement the command logic:
    - [ ] Sub-task: Call the `GET /user/:discordId/tilt-status` API endpoint.
    - [ ] Sub-task: Display the tilt status to the user as an ephemeral message.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 4: Tilt Check Frontend (Discord Bot)' (Protocol in workflow.md)
