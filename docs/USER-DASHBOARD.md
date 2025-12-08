# User Dashboard - Discord App & Web

## Overview

Users can now view their tilt stats and gaming patterns in two ways:

1. **Discord App** - `/dashboard` slash command (ephemeral embed with quick stats)
2. **Web Dashboard** - Full dashboard accessible via web link

---

## Discord App (`/dashboard` Command)

### Usage
Users type `/dashboard` in Discord to see their tilt stats instantly.

### What They See
- **Tilt Score** (7-day average, color-coded)
- **Max Score** (7-day high)
- **Total Events** (all time)
- **Events Last 24h** and **Last 7d**
- **Last Event Timestamp**
- **Recent Events** (last 5 tilt detections with timestamps)

### Response Format
- **Ephemeral** (only visible to the user who ran the command)
- **Two embeds**: Main stats + recent events
- **Action buttons**:
  - "Full Dashboard" (links to web dashboard)
  - "View Full History" (reserved for future feature)
  - "⚙️ Settings" (reserved for preferences)

### Color Coding (by tilt level)
- **Green** (0-5): 😊 Great mindset
- **Yellow** (5-7): 😐 Consider a break
- **Orange** (7-9): 😠 High tilt - time for a break
- **Red** (9-10): 😡 Critical tilt - stop playing

### File Location
- Command: `/apps/discord-bot/src/commands/dashboard.ts`

---

## Web Dashboard

### Access URL
```
https://tiltcheck.app/user?userId=<DISCORD_USER_ID>
```

Users can click the "Full Dashboard" button from the Discord command, or access directly via the URL.

### Features

#### 1. **Tilt Status Card**
- Large, color-coded display of current tilt level (0-10)
- Emoji indicator + status message
- Visual warnings:
  - ✨ "You're in a great mindset!"
  - ⚠️ "Consider taking a break soon"
  - 🚨 "High tilt detected - time for a break"
  - 🛑 "Critical tilt level - stop playing now"

#### 2. **Stats Grid** (6 key metrics)
- Total Events (all time)
- Max Score (7-day)
- Events (24h)
- Events (7d)
- Last Event Date
- Current Status (High Tilt / Normal)

#### 3. **Recent Events List**
- Displays up to 20 recent events (last 30 days)
- Shows per-event:
  - Tilt score (0-10)
  - Signal types (e.g., "rapid-messages, aggressive-language")
  - Timestamp
  - Emoji indicator for severity

#### 4. **Tips Section**
- "Tips to Manage Tilt" with actionable advice:
  - Take breaks at 6+ tilt
  - Set daily loss limits
  - Track emotions
  - Use 5-minute rule

### Responsive Design
- **Desktop**: Full-width stats grid, detailed event cards
- **Mobile**: Stacked layout, optimized for phones
- **Dark theme**: Slate/dark gradient background with high contrast

### File Location
- Main page: `/apps/dashboard/src/app/user/page.tsx`
- Content component: `/apps/dashboard/src/app/user/content.tsx`
- Layout: `/apps/dashboard/src/app/user/layout.tsx`

---

## Backend Integration

### API Endpoints Used

Both dashboard variants use the same backend APIs:

#### 1. **GET /api/tilt/stats/:userId**
Returns aggregated statistics:
```json
{
  "userId": "discord_user_id",
  "totalEvents": 42,
  "averageTiltScore": 6.5,
  "maxTiltScore": 9.2,
  "lastEventAt": "2025-01-20T14:30:00Z",
  "eventsLast24h": 3,
  "eventsLast7d": 15
}
```

#### 2. **GET /api/tilt/history/:userId**
Returns paginated event history:
```json
{
  "success": true,
  "userId": "discord_user_id",
  "count": 15,
  "days": 7,
  "events": [
    {
      "id": "event_id",
      "user_id": "discord_user_id",
      "timestamp": "2025-01-20T14:30:00Z",
      "signals": "[{\"type\": \"rapid-messages\", \"severity\": 3}]",
      "tilt_score": 6.5,
      "context": "discord-dm"
    }
  ]
}
```

### Data Flow
1. **Tilt Detection** → Discord bot detects tilt (via @tiltcheck/tiltcheck-core)
2. **Event Persisted** → Tilt events handler POSTs to `/api/tilt/events`
3. **Storage** → Events stored in Supabase `tilt_events` table
4. **Retrieval** → Dashboard fetches stats & history from backend
5. **Display** → Rendered in Discord embed or web UI

---

## Configuration

### Environment Variables

#### Discord Bot
```bash
DISCORD_TOKEN=your_token
BACKEND_URL=http://localhost:3000  # or production URL
DASHBOARD_URL=https://tiltcheck.app/dashboard
```

#### Dashboard (Next.js)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000  # or production URL
```

---

## User Flow Diagram

```
┌─────────────────────────────────────────┐
│ User types /dashboard in Discord        │
└────────────────┬────────────────────────┘
                 │
     ┌───────────▼───────────┐
     │ Bot fetches stats &    │
     │ recent events from     │
     │ backend API           │
     └───────────┬───────────┘
                 │
     ┌───────────▼──────────────────────┐
     │ Displays embed response with:     │
     │ - Tilt level (color-coded)        │
     │ - Stats grid                      │
     │ - Recent events                   │
     │ - "Full Dashboard" button         │
     └───────────┬──────────────────────┘
                 │
     ┌───────────▼────────────────────────┐
     │ User clicks "Full Dashboard"       │
     │ or opens: /user?userId=<ID>       │
     └───────────┬────────────────────────┘
                 │
     ┌───────────▼──────────────────────────┐
     │ Web dashboard loads with:            │
     │ - Large tilt status card             │
     │ - Stats grid (6 metrics)             │
     │ - Complete event history (20 events) │
     │ - Tips section                       │
     └──────────────────────────────────────┘
```

---

## Testing the Dashboards

### Local Testing

1. **Start backend**:
   ```bash
   cd backend && pnpm dev
   ```

2. **Start Discord bot**:
   ```bash
   cd apps/discord-bot && pnpm dev
   ```

3. **Start dashboard**:
   ```bash
   cd apps/dashboard && pnpm dev
   ```

4. **Test Discord command**:
   - Type `/dashboard` in a server where the bot is installed
   - Should see stats embed with your user ID

5. **Test web dashboard**:
   - Visit `http://localhost:3000/user?userId=<YOUR_DISCORD_ID>`
   - Should load with mock data (or real data if events exist)

### Production Testing

1. Deploy backend to Railway/production server
2. Deploy bot with `BACKEND_URL=<production_url>`
3. Deploy dashboard with `NEXT_PUBLIC_BACKEND_URL=<production_url>`
4. Users can access via `https://tiltcheck.app/user?userId=<ID>`

---

## Future Enhancements

1. **Authentication** - OAuth Discord login before showing dashboard
2. **Comparison View** - Compare tilt patterns week-over-week
3. **Export** - Download tilt history as CSV
4. **Alerts** - Set custom tilt threshold notifications
5. **Analysis** - ML-based tilt pattern recognition
6. **Streak Tracking** - "You've been tilted X times this week"
7. **Peer Comparison** - (Optional) Anonymous stats vs. community

---

## Security Considerations

- Dashboard uses `userId` from URL parameter (assumes verified Discord context)
- For production, add OAuth verification to ensure users can only see their own data
- Backend API doesn't require auth currently (should be added for security)
- All queries are scoped to specific userId (no cross-user leakage)

---

## Known Limitations

1. **No authentication** - Currently shows data for any userId passed in URL
2. **No server-side filtering** - Stats calculated across all time (should add date range limits)
3. **Fixed color scheme** - Tilt levels hardcoded (should be configurable)
4. **No pagination on web** - Loads first 20 events (should add "Load more")
5. **No real-time updates** - Dashboard must be refreshed manually

