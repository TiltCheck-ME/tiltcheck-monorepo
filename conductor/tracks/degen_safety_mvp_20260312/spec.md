# Specification: Core Degen-Safety Features

## 1. Overview
This track implements the foundational safety and identity features for the TiltCheck MVP. The goal is to provide immediate, tangible value to Discord users by allowing them to get a "gut check" on their gambling behavior and securely link their Solana wallet to their Discord identity.

## 2. Features

### 2.1. Tilt Gut Check
- **User Story:** As a degen, I want to get a "gut check" from the bot about my recent activity to see if I'm tilted.
- **Implementation:** A `/tiltcheck` command in the Discord bot.
- **Logic:**
    - The command will query the Degen Trust Engine for the user's recent activity (e.g., message velocity, sentiment, recent losses).
    - Based on a simple heuristic, the bot will respond with a clear, concise "tilted" or "not tilted" status.
    - The response should be ephemeral to protect user privacy.

### 2.2. Solana Wallet Linking
- **User Story:** As a degen, I want to link my Solana wallet to my Discord identity to be eligible for token-gated features.
- **Implementation:** A `/linkwallet` command in the Discord bot.
- **Logic:**
    - The bot will generate a unique, single-use message for the user to sign with their Solana wallet.
    - The user will sign the message using their wallet (e.g., Phantom, Solflare) and submit the signature to the bot.
    - The bot will verify the signature against the user's public key.
    - Upon successful verification, the bot will store the association between the user's Discord ID and their Solana public key in the Supabase database.

## 3. Non-Functional Requirements
- **Non-Custodial:** At no point will the system have access to or store user private keys. The entire wallet linking process is based on signature verification.
- **Scalability:** The services must be able to handle at least 100 concurrent users without significant degradation in performance.
- **Discord-First:** Both features must be fully functional and accessible within Discord.
