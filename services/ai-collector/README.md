# AI Collector Service

Autonomous casino data extraction using AI agents (Vercel AI SDK + OpenAI).

## Purpose
Automatically collects publicly available fairness data from casino websites:
- Disclosure pages (RTP, audits, licenses)
- Provably-fair hash verifications
- Player sentiment (Reddit, Trustpilot)

Feeds the grading engine with fresh data for trust score updates.

## Setup

```bash
cd services/ai-collector
pnpm install
```

## Environment Variables

```bash
OPENAI_API_KEY=sk-...

# Optional: Reddit OAuth (for enhanced sentiment analysis)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password
```

### Setting up Reddit OAuth

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Select "script" type
4. Set redirect URI to `http://localhost:8080`
5. Copy Client ID and Secret to your `.env` file

## Usage

### Single Collection Run (Testing)
```bash
pnpm collect
```

### Scheduled Mode (Weekly Sunday 2 AM UTC)
```bash
pnpm dev
```

## Registry Management

Casino targets defined in `data/casinos.json`:

```json
{
  "casinos": [
    {
      "id": "stake-us",
      "name": "Stake.us",
      "baseURL": "https://stake.us",
      "endpoints": {
        "fairness": "/fairness",
        "provablyFair": "/provably-fair"
      },
      "enabled": true
    }
  ]
}
```

## Output

Snapshots saved to `data/casino-snapshots/{casinoId}/{date}.json`:

```json
{
  "casinoId": "stake-us",
  "collectedAt": "2025-11-20T02:00:00Z",
  "sources": {
    "disclosures": {
      "rtpVersionPublished": false,
      "auditReportPresent": false,
      "fairnessPolicyURL": "https://stake.us/fairness"
    }
  }
}
```

## Cost Estimate

~$0.15 per casino per collection (using gpt-4o-mini for extraction).  
Weekly run with 10 casinos ≈ $1.50/week = ~$6.50/month.

## Rate Limiting

- 1 request per 2 seconds per page
- 5 seconds between casinos
- Respects robots.txt (manual override required for excluded paths)

## Non-Custodial Principle

Collector ONLY accesses publicly available information. No player accounts, login-required data, or PII collection.
