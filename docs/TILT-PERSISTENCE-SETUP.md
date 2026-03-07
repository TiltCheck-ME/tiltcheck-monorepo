# Tilt Events Persistence - Setup & Testing Guide

## 🎯 Overview

You've successfully implemented a complete tilt events persistence system with:
- ✅ Backend API endpoints for storing/retrieving tilt events
- ✅ Discord bot event listener that captures and persists tilt detections
- ✅ Supabase PostgreSQL schema with indexes and triggers
- ✅ User dashboard (Discord command + web page) to view tilt history

This guide walks you through final setup and testing.

---

## 📋 Pre-Setup Checklist

Before you start, make sure you have:

- [ ] Supabase project created (https://supabase.com)
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` from your Supabase project settings
- [ ] Backend running (or ready to run)
- [ ] Discord bot token configured
- [ ] Local environment variables set up

---

## Step 1: Create the Supabase Schema

### Option A: Manual (Recommended for first-time)

1. Go to [Supabase Dashboard](https://supabase.com)
2. Select your TiltCheck project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** button
5. Copy the entire SQL from `/docs/migrations/001-tilt-events.sql`
6. Paste it into the SQL editor
7. Click **Run** button
8. You should see: "✅ Success. No rows returned"

### Option B: Using Script

```bash
# Set your Supabase credentials
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Run the migration helper
bash ./scripts/migrate-tilt-events.sh
```

The script will display the SQL and guide you through manual execution.

### ✅ Verification

After running the migration, verify in Supabase:

1. Click **Table Editor** in left sidebar
2. You should see `tilt_events` table listed
3. Check these details:
   - Columns: `id`, `user_id`, `timestamp`, `signals`, `tilt_score`, `context`, `created_at`, `updated_at`
   - Indexes: 4 indexes on user_id, timestamp, etc.
   - RLS: Enabled

---

## Step 2: Configure Environment Variables

### Backend

Create/update `.env` in `/backend` directory:

```bash
# Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# API Configuration
PORT=3000
NODE_ENV=development

# Other required vars (keep existing)
DISCORD_TOKEN=your_token
# ... other vars
```

### Discord Bot

Create/update `.env` in `/apps/discord-bot` directory:

```bash
# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# Backend URL (for tilt events API)
BACKEND_URL=http://localhost:3000

# Dashboard links
DASHBOARD_URL=http://localhost:3000/user

# Other required vars
# ... keep existing
```

### Dashboard

Create/update `.env.local` in `/apps/dashboard` directory:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

---

## Step 3: Start Services Locally

### Terminal 1: Backend

```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/backend
pnpm dev
```

Expected output:
```
[TiltAPI] ✅ Tilt events routes registered
Server listening on port 3000
```

### Terminal 2: Discord Bot

```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/apps/discord-bot
pnpm dev
```

Expected output:
```
[TiltHandler] ✅ Tilt events handler initialized
🤖 Discord bot online
```

### Terminal 3: Dashboard (optional)

```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo-fresh/apps/dashboard
pnpm dev
```

Expected output:
```
▲ Next.js dev server listening on port 3000
```

---

## Step 4: Test the System

### Test 1: API Health Check

```bash
# Check backend is running
curl http://localhost:3000/api/tilt/stats/test-user

# Expected response:
# {"success":true,"userId":"test-user","totalEvents":0,"averageTiltScore":0,...}
```

### Test 2: Manually Create a Test Event

```bash
curl -X POST http://localhost:3000/api/tilt/events \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "timestamp": 1705776600000,
    "signals": [{"type": "rapid-messages", "severity": 3}],
    "tiltScore": 6.5,
    "context": "discord-dm"
  }'

# Expected response:
# {"success":true,"message":"Tilt event recorded","eventId":1}
```

### Test 3: Check Event Was Stored

```bash
curl http://localhost:3000/api/tilt/history/test-user-123?days=30&limit=10

# Expected response shows your event:
# {"success":true,"userId":"test-user-123","count":1,"days":30,"events":[...]}
```

### Test 4: Check Statistics

```bash
curl http://localhost:3000/api/tilt/stats/test-user-123

# Expected response:
# {"success":true,"userId":"test-user-123","totalEvents":1,"averageTiltScore":6.5,"maxTiltScore":6.5,"eventsLast24h":0,"eventsLast7d":1}
```

### Test 5: Discord Bot Command

In your Discord server where the bot is installed:

1. Type `/dashboard`
2. Bot should respond with an embed showing:
   - Tilt Score: 0/10 (no real detections yet)
   - Stats grid with all 6 metrics
   - "Full Dashboard" button

### Test 6: Web Dashboard

1. Open `http://localhost:3000/user?userId=test-user-123`
2. Should display:
   - Your tilt stats card
   - 6 stats grid
   - Recent events list (showing your test event)
   - Tips section

---

## Step 5: Verify Full Data Flow

Once basic tests pass, here's the full integration test:

1. **User types `/dashboard` in Discord**
   ↓
2. **Bot fetches stats from backend** (`GET /api/tilt/stats/<userId>`)
   ↓
3. **Bot fetches recent events** (`GET /api/tilt/history/<userId>`)
   ↓
4. **Bot displays embed** with stats and events
   ↓
5. **User clicks "Full Dashboard"** button
   ↓
6. **Web page loads** at `/user?userId=<userId>`
   ↓
7. **Page fetches** same API endpoints
   ↓
8. **Dashboard displays** full stats and event history

If all these work, the entire system is integrated! ✅

---

## Troubleshooting

### Issue: "Database not connected" error

**Solution:**
- Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
- Verify credentials in Supabase dashboard
- Restart backend: `pnpm dev`

### Issue: Table doesn't exist

**Solution:**
- Run the migration SQL in Supabase SQL Editor
- Verify table appears in Table Editor
- Check column names match exactly (case-sensitive)

### Issue: "function update_updated_at_colomn() does not exist"

**Solution:**
This is caused by a typo in the migration script (`colomn` vs `column`) or the function not being defined before the trigger. Run this SQL in Supabase to fix it:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Issue: Bot command doesn't work

**Solution:**
- Check `BACKEND_URL` in bot `.env` file
- Verify backend is running on configured port
- Check bot logs for error messages
- Bot needs `applications.commands` OAuth scope

### Issue: Dashboard shows no data

**Solution:**
- Verify you created test events (see Test 2 above)
- Check `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Check browser console for fetch errors
- Ensure backend has CORS enabled for dashboard origin

### Issue: Can't execute SQL migration

**Solution:**
- Make sure you're using **SQL Editor** not a migration tool
- Copy the entire SQL file contents
- Paste into a new query in Supabase
- Make sure you have permissions (admin or owner)

---

## Next Steps After Testing

### 1. Deploy Backend

```bash
# Push to your hosting (Railway, Spaceship, etc.)
git add -A
git commit -m "feat: add tilt events persistence"
git push origin main

# Update BACKEND_URL in production environment
```

### 2. Deploy Bot

```bash
# Ensure BACKEND_URL points to production backend
# Deploy to your bot hosting
```

### 3. Deploy Dashboard

```bash
# Ensure NEXT_PUBLIC_BACKEND_URL points to production backend
# Deploy to Vercel or your hosting
```

### 4. Enable RLS (Optional but Recommended)

For production security, uncomment the RLS policies in the migration:

```sql
-- Create RLS policy - allow users to see their own tilt events
CREATE POLICY "Users can see their own tilt events"
  ON public.tilt_events
  FOR SELECT
  USING (
    (SELECT auth.uid()::TEXT) = user_id
    OR
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
  );
```

Then update the dashboard to use authenticated Supabase client.

### 5. Monitor Production

Set up alerts in Supabase for:
- Table growth (should correlate with users)
- Query performance (check index usage)
- Error rates

---

## Files Reference

| File | Purpose |
|------|---------|
| `/backend/src/routes/tilt.ts` | API endpoints |
| `/apps/discord-bot/src/handlers/tilt-events-handler.ts` | Bot event listener |
| `/apps/discord-bot/src/commands/dashboard.ts` | `/dashboard` command |
| `/apps/dashboard/src/app/user/page.tsx` | Web dashboard |
| `/docs/migrations/001-tilt-events.sql` | Database schema |
| `/scripts/migrate-tilt-events.sh` | Migration helper |
| `/docs/USER-DASHBOARD.md` | Complete feature docs |
| `/docs/TILT-EVENTS-API.md` | API documentation |

---

## Checklist for Production

- [ ] Supabase `tilt_events` table created and verified
- [ ] `.env` variables set for backend with correct Supabase credentials
- [ ] `.env` variables set for bot with correct `BACKEND_URL`
- [ ] `.env.local` variables set for dashboard with correct `NEXT_PUBLIC_BACKEND_URL`
- [ ] All services tested locally with `/dashboard` command
- [ ] Web dashboard tested at `/user?userId=<test-id>`
- [ ] Test event created and appears in both Discord and web dashboard
- [ ] Code pushed to GitHub
- [ ] Backend deployed and `BACKEND_URL` updated
- [ ] Bot deployed with production `BACKEND_URL`
- [ ] Dashboard deployed with production `NEXT_PUBLIC_BACKEND_URL`
- [ ] Production test: `/dashboard` command works with real user ID
- [ ] Production test: Web dashboard loads and shows data

---

## Questions?

Refer to:
- API docs: `/docs/TILT-EVENTS-API.md`
- Feature docs: `/docs/USER-DASHBOARD.md`
- Migration file: `/docs/migrations/001-tilt-events.sql`
