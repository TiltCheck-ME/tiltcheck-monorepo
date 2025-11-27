# TiltGuard Chrome Extension - Features

## Core Features

### 🧠 Tilt Detection

TiltGuard monitors your betting behavior to detect signs of tilt:

- **Rage Betting**: Detects rapid consecutive bets (< 2 seconds between bets)
- **Chasing Losses**: Identifies increasing bet sizes after losses
- **Fast Clicks**: Monitors erratic clicking patterns
- **Bet Escalation**: Alerts when bets exceed 5x your average
- **Duration Warning**: Notifies after 1+ hours of play

Each indicator has a severity level:
- 🟢 Low: Minor concern
- 🟡 Medium: Moderate concern
- 🟠 High: Significant concern
- 🔴 Critical: Immediate action recommended

### 📊 Session Tracking

Real-time metrics displayed in the sidebar:

- **Duration**: Total session time
- **Bets**: Number of bets placed
- **Wagered**: Total amount bet
- **P/L**: Profit/Loss for the session
- **RTP**: Return to Player percentage
- **Tilt Score**: 0-100 risk score

### 📈 P/L Graph

Visual profit/loss chart showing your session performance over time:
- Green line indicates profit
- Red line indicates loss
- Updates with each bet

### 🏦 Vault Integration

Smart vault recommendations to protect winnings:

- **Auto-recommendations** when balance reaches 5x starting amount
- **Stop-loss alerts** at 50% balance loss
- **Real-world comparisons**: "Your profit could buy X months of groceries"
- **One-click vaulting** to secure funds

### 🔒 License Verification

Automatic casino license checking:

- Scans page footer for license information
- Verifies against known legitimate authorities
- Supports Tier 1-3 jurisdictions:
  - **Tier 1**: UKGC, Malta Gaming Authority, Gibraltar
  - **Tier 2**: Curacao, Kahnawake, Alderney, Isle of Man
  - **Tier 3**: Anjouan, Costa Rica
  - **US States**: Nevada, New Jersey, Pennsylvania

### ⏸️ Cooldown Periods

When critical tilt is detected:

- Full-screen overlay blocks betting
- Countdown timer until cooldown ends
- Bet buttons are disabled during cooldown
- Default 5-minute cooldown period

### 🔐 Authentication

Multiple authentication options:

- **Discord OAuth**: Full features with account sync
- **Guest Mode**: Local-only session tracking

### 💾 Data Export

Export your session data:

- JSON format with all metrics
- Download for personal records
- Privacy-focused local storage

## Sidebar Interface

The sidebar provides:

1. **Header**: Minimize/expand, settings access
2. **User Bar**: Account info and tier status
3. **Active Session Metrics**: Real-time stats grid
4. **P/L Graph**: Visual performance chart
5. **Activity Feed**: Recent events and alerts
6. **Quick Actions**: Dashboard, Vault, Wallet, Upgrade
7. **Vault Balance**: Current vault amount
8. **Export Button**: Download session data

## Interventions

TiltGuard can trigger several intervention types:

| Type | Trigger | Action |
|------|---------|--------|
| Cooldown | Critical tilt signs | Blocks betting for 5 minutes |
| Vault Prompt | High balance | Recommends vaulting |
| Spending Reminder | Real-world items | Suggests using profit wisely |
| Stop Loss | 50%+ balance loss | Urgent vault recommendation |
| Phone Friend | Multiple tilt signs | Suggests calling someone |
| Session Break | 1+ hour play | Suggests taking a break |

## Casino Support

### Supported Casinos

Site-specific selectors for:
- Stake.com
- Roobet.com
- BC.Game
- Duelbits.com

### Generic Support

Fallback selectors work on many other casino sites.

### Excluded Sites

The extension does not activate on:
- discord.com
- localhost development servers
