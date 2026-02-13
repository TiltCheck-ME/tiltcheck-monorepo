# Implementation Plan

Replace the failing custodial tipcc Discord bot with a non-custodial justthetip system using Solana agents and magic link wallets for seamless crypto tipping.

The current tipcc bot is unreliable with stuck funds due to custodial nature. This implementation creates a trustless system where users control their funds, supporting popular tokens like SOL, USDC, ETH, LTC, XRP, BNB on Solana and Ethereum. Discord commands will mirror tipcc syntax ($tip @user amount token) while ensuring depositors maintain full access to their crypto.

[Types]
Define core types for tipping transactions, user wallets, and Discord integration. Key types include:
- TipTransaction: { id: string, sender: string, recipient: string, amount: number, token: string, status: 'pending' | 'confirmed' | 'failed' }
- UserWallet: { discordId: string, solanaAddress: string, ethereumAddress?: string, linkedAt: Date }
- DiscordCommand: { command: string, args: string[], user: string, channel: string }

[Files]
New files to create:
- apps/justthetip/src/app/api/tip/route.ts: API endpoint for processing tip transactions
- apps/justthetip/src/app/api/wallet/route.ts: API for wallet linking and management
- apps/discord-bot/src/commands/tip.ts: Discord slash command handler for /tip
- apps/discord-bot/src/commands/airdrop.ts: Handler for airdrop commands
- apps/discord-bot/src/services/solana-agent.ts: Solana blockchain interaction service
- apps/justthetip/src/components/TipForm.tsx: React component for web-based tipping
- apps/justthetip/src/lib/wallet.ts: Wallet generation and linking utilities

Existing files to modify:
- apps/justthetip/src/app/page.tsx: Add tipping interface and wallet linking
- apps/discord-bot/src/index.ts: Register new tip and airdrop commands
- apps/justthetip/package.json: Add Solana and Ethereum wallet dependencies
- apps/discord-bot/package.json: Add Discord.js slash command support

[Functions]
New functions:
- processTip(discordId: string, recipientId: string, amount: number, token: string): Promise<TipTransaction>
- generateMagicWallet(discordId: string): Promise<UserWallet>
- executeSolanaTransaction(wallet: UserWallet, recipient: string, amount: number, token: string): Promise<string>
- handleDiscordTip(interaction: CommandInteraction): Promise<void>

Modified functions:
- apps/justthetip/src/app/page.tsx: JustTheTipHome component to include wallet status and tip history
- apps/discord-bot/src/index.ts: Add event listeners for tip and airdrop slash commands

[Classes]
New classes:
- SolanaAgent: Handles Solana blockchain interactions, transaction signing, and balance checks
- DiscordTipBot: Manages Discord bot commands, user authentication, and tip processing
- WalletManager: Generates magic link wallets, manages user wallet associations

[Dependencies]
Add to apps/justthetip/package.json:
- @solana/web3.js: ^1.87.6
- @solana/wallet-adapter-react: ^0.15.35
- ethers: ^6.8.1
- @magic-sdk/react: ^22.0.0

Add to apps/discord-bot/package.json:
- discord.js: ^14.14.1
- @discordjs/rest: ^2.2.0

[Testing]
Unit tests for:
- Solana transaction processing
- Wallet generation and linking
- Discord command parsing
- API endpoint responses

Integration tests for:
- Full tip flow from Discord command to blockchain confirmation
- Wallet linking via magic links
- Multi-token support (SOL, USDC, ETH)

[Implementation Order]
1. Set up Solana agent service for blockchain interactions
2. Implement magic link wallet generation
3. Create Discord bot slash commands (/tip, /airdrop)
4. Build API endpoints for tip processing and wallet management
5. Update web UI for tipping interface and wallet linking
6. Add multi-token support (SOL, USDC, ETH, LTC, XRP, BNB)
7. Implement transaction monitoring and confirmation
8. Add error handling and user notifications
9. Test full tipping flow end-to-end
10. Deploy and monitor for reliability
