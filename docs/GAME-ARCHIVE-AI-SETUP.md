# Game Archive AI Analysis - Setup Guide

## What It Does

Uploads your personal gambling data (CSV/JSON or via Stake API) and uses AI pattern recognition to find:

- **Time patterns:** Best hours/days to play
- **Crypto performance:** Which crypto has best ROI for you
- **Bonus vs deposit:** Performance comparison
- **Session duration:** Optimal play time windows
- **Tilt detection:** When losing streaks lead to bad decisions
- **Game type analysis:** Which games work best for you

## Setup Steps

### 1. Run Database Migration

```bash
cd backend
psql $SUPABASE_DB_URL < src/db/migrations/004_game_archive.sql
```

Or in Supabase dashboard:
- Go to SQL Editor
- Paste contents of `backend/src/db/migrations/004_game_archive.sql`
- Run

### 2. Install Dependencies

```bash
pnpm install
```

This adds `multer` for file uploads and `@types/multer` for TypeScript.

### 3. Build & Deploy

```bash
pnpm build
```

Deploy to Railway (backend will have new `/api/admin/game-archive/*` endpoints).

### 4. Access Admin Panel

Navigate to: `https://your-vercel-frontend.app/admin/game-archive.html`

## Usage

### Option 1: Upload CSV/JSON

**CSV Format:**
```csv
timestamp,game_type,bet_amount,win_amount,crypto_type,is_bonus_money,session_duration_minutes,casino
2024-12-08T10:30:00Z,Dice,0.001,0.0015,BTC,false,15,stake.com
2024-12-08T11:00:00Z,Slots,0.002,0,ETH,true,20,stake.com
```

**JSON Format:**
```json
[
  {
    "timestamp": "2024-12-08T10:30:00Z",
    "game_type": "Dice",
    "bet_amount": 0.001,
    "win_amount": 0.0015,
    "crypto_type": "BTC",
    "is_bonus_money": false,
    "session_duration_minutes": 15,
    "casino": "stake.com"
  }
]
```

### Option 2: Import from Stake.com

1. Get your Stake API key (from Stake settings)
2. Enter API key, start date, end date
3. Click "Import from Stake"

**Note:** Stake API endpoint may need verification—check Stake docs for current API.

## AI Insights Explained

### Time of Day
- Analyzes hourly win rates
- Recommends best hours based on your history
- Min 10 sessions per hour for confidence

### Day of Week
- Finds best performing days
- Min 5 sessions per day for confidence

### Crypto Type
- Compares ROI across BTC, ETH, SOL, etc.
- Shows which crypto has been most profitable for you

### Bonus vs Deposit
- Win rate comparison: bonus money vs your deposits
- Helps decide whether to chase bonuses

### Session Duration
- Groups sessions into 15-min buckets
- Finds optimal session length before burnout

### Tilt Detection
- Detects losing streak patterns (5+ losses)
- Warns when tilt risk is high
- **Most important for preventing further losses**

### Game Type
- ROI analysis per game (Dice, Slots, Poker, etc.)
- Min 10 sessions per game for confidence

## Example Insights

```
🕐 TIME OF DAY
Best winning hour: 14:00 (65% win rate)
💡 Consider playing between 14:00-15:00 for better odds

📅 DAY OF WEEK
Best winning day: Tuesday (58% win rate)
💡 Tuesdays show better results in your history

₿ CRYPTO TYPE
Best performing crypto: BTC (12.5% ROI)
💡 BTC has historically performed better for you

🎁 BONUS VS DEPOSIT
Bonus money win rate: 42% vs Deposited: 38%
💡 Bonus money shows better performance

⏱️ SESSION DURATION
Optimal session length: 22 minutes
💡 Sessions around 22 minutes show best results

⚠️ TILT RISK
Tilt detected after 7 consecutive losses
💡 STOP after 6 losses to avoid tilt

🎮 GAME TYPE
Best game: Dice (8.2% ROI)
💡 Focus on Dice for better returns
```

## Security Notes

- Admin panel requires authentication (use auth middleware)
- API key storage: store Stake API key securely (env vars)
- Data privacy: all data stored in Supabase with RLS policies
- Only you can see your game archive data

## Troubleshooting

**Upload fails:**
- Check file format (CSV headers or JSON structure)
- Ensure file size < 50MB
- Verify Supabase connection

**No insights:**
- Min 50 sessions recommended for accurate patterns
- Upload more data or import from Stake

**Stake import fails:**
- Verify API key is correct
- Check Stake API endpoint (may change)
- Ensure date range is valid

## Next Steps

1. Upload historical data (past 6-12 months ideal)
2. Review AI insights
3. Test recommendations (e.g., play during best hour)
4. Upload new data weekly to refine patterns
5. Use tilt warnings to stop losses

---

**Built for jmenichole's personal gambling analysis.**  
Non-custodial, privacy-first, AI-powered pattern recognition.
