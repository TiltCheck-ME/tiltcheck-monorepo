# TiltCheck Discord Trust Scorer (V1)

**Zero dependency, ultra-fast Discord user reputation analyzer.**  
Built to be easily integrated into the broader `trust-engines` monorepo structure.

## Quickstart

This engine runs purely on native Node.js. No `npm install` required.

**1. Run the CLI Test**
Use the CLI tool to process a local JSON dataset of users.
```bash
npm run cli
# or
node cli.js mocks.json
```

**2. Start the API Server**
Spins up a local endpoint to score users strictly via JSON payload.
```bash
npm start
# or
node server.js
```

## API Usage

**POST** `/score`

**Body:**
```json
{
  "user": {
    "id": "193828392",
    "username": "DeFiDegen",
    "global_name": "Tyler T",
    "email": "tyler@example.com",
    "phone": "+1234567890",
    "verified": true,
    "mfa_enabled": true,
    "public_flags": 256,
    "client_status": { "desktop": "online" }
  },
  "guilds": []
}
```

**Response:**
```json
{
  "discordId": "193828392",
  "trustScore": 100,
  "riskLevel": "LOW",
  "riskPoints": 0,
  "reasons": []
}
```

## Scoring Logic
The normalized Trust Score (0-100) mathematically evaluates 9 primary vector points. Max theoretical risk is 26 points.

- No email -> `+3`
- No phone -> `+3`
- Not verified -> `+2`
- No MFA -> `+2`
- No presence -> `+4`
- Username entropy (alphanumeric spam) -> `+4`
- No public flags -> `+1`
- Display name identically matches handle -> `+2`
- Blacklisted Server/Guild overlap -> `+5`
