© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-14

# WebSocket Analyzer Endpoint Missing

## Problem

The Chrome extension is trying to connect to a WebSocket endpoint that doesn't exist:

```
wss://api.tiltcheck.me/analyzer
```

**Error in console:**
```
[TiltCheck] WebSocket connection to 'wss://api.tiltcheck.me/analyzer' failed
[TiltCheck] WebSocket closed (close event) {code: 1006, reason: '(no reason)'...
```

---

## What the Extension Expects

**File:** `apps/chrome-extension/src/content.ts` (Line 51)

```typescript
const ANALYZER_WS_URL = 'wss://api.tiltcheck.me/analyzer';

// Attempts to connect and send spin data
client = new AnalyzerClient(ANALYZER_WS_URL, (error) => {
  console.warn('[TiltGuard] Analyzer connection issue:', error);
});

await client.connect();
```

**Message Protocol:**

The extension sends periodic messages:
```typescript
// Heartbeat (every 25 seconds)
{ type: 'ping', ts: Date.now() }

// Spin data
{
  type: 'spin',
  data: {
    sessionId: string;
    casinoId: string;
    gameId: string;
    userId: string;
    bet: number;
    payout: number;
    gameResult?: number | null;
    symbols?: string[];
    bonusRound?: boolean;
    freeSpins?: boolean;
  }
}

// Report request
{
  type: 'request_report',
  sessionId: string
}
```

---

## Root Cause

The `/analyzer` WebSocket endpoint is **not implemented** in `apps/api/src/index.ts`.

**Current API routes:**
- `/auth` — OAuth and authentication
- `/services` — Internal service proxy
- `/tip`, `/rgaas`, `/safety`, `/affiliate`, `/newsletter`, `/stripe`, `/user`, `/ai`, `/pricing`, `/casino`, `/bonus`, `/vault`, `/beta`, `/stats`, `/mod`, `/health`

**Missing:**
- WebSocket upgrade handler for `/analyzer`
- AnalyzerClient service or integration
- Database models for storing spin data

---

## What Needs to Be Built

### 1. **WebSocket Handler in API** (apps/api/src/)

```typescript
// Example: apps/api/src/routes/analyzer.ts
import { WebSocket } from 'ws';

export function setupAnalyzerWebSocket(app: Express) {
  app.get('/analyzer', (req, res) => {
    // Upgrade to WebSocket
    const ws = req.socket;
    
    ws.on('data', (message) => {
      const { type, data } = JSON.parse(message);
      
      switch (type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'spin':
          // Process spin data
          // - Validate session
          // - Store in database
          // - Calculate fairness metrics
          // - Send back analysis
          break;
        case 'request_report':
          // Generate fairness report for session
          break;
      }
    });
  });
}
```

### 2. **Reverse Proxy Configuration**

If using Nginx/Cloud Load Balancer:

```nginx
location /analyzer {
  proxy_pass http://api:3001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 86400s;
  proxy_send_timeout 86400s;
}
```

### 3. **Database Schema** (if spin data needs to be stored)

```typescript
// Store gameplay data for analysis
export type SpinRecord = {
  id: string;
  sessionId: string;
  userId: string;
  casinoId: string;
  gameId: string;
  bet: number;
  payout: number;
  rtp: number; // Calculated return-to-player
  isFair: boolean; // Fairness analysis result
  createdAt: Date;
};
```

---

## Fallback Behavior (Current)

The extension handles the missing endpoint gracefully:

```typescript
try {
  await client.connect();
  console.log('[TiltGuard] Connected to analyzer server');
} catch (_error) {
  console.log('[TiltGuard] Analyzer backend offline - tilt monitoring only');
  // Falls back to local tilt detection only
}
```

**Current state:** Extension still works, but analyzer feature is disabled. Spin data is not analyzed for fairness.

---

## Why This Endpoint Was Never Implemented

Looking at the codebase:
- The extension code is complete (AnalyzerClient class fully defined)
- The API structure exists but the `/analyzer` route was never added
- Gameplay analyzer services (`apps/gameplay-analyzer/`, etc.) were deleted in Wave 3 cleanup

**Likely reason:** The analyzer feature was planned but deprioritized when Wave 3 cleanup consolidated services.

---

## Action Items

**To fix the WebSocket error:**

1. **Option A: Remove the feature** (if not needed)
   - Remove `ANALYZER_WS_URL` from extension
   - Remove `new AnalyzerClient()` initialization
   - Keep local tilt detection only

2. **Option B: Implement the endpoint** (if fairness analysis is a core feature)
   - Create `/analyzer` WebSocket handler in API
   - Add spin data storage and analysis logic
   - Update reverse proxy config for WebSocket upgrade
   - Test with extension

**Recommendation:** Clarify with the team whether fairness analysis is in scope for this release. If not, simplify by removing the incomplete endpoint reference.

---

## Testing the Fix

Once implemented:

```bash
# Test WebSocket connectivity
wscat -c wss://api.tiltcheck.me/analyzer

# In browser console (extension should show):
[TiltCheck] Connected to analyzer server
[TiltCheck] Sent spin: { sessionId: '...', bet: 100, payout: 250 }
```
