# TiltCheck PWA Migration Plan

## Executive Summary

This document outlines the migration of **TiltCheck** (gambling behavior tracker and tilt detection) from Discord bot commands to a standalone Progressive Web App (PWA).

**Why Migrate**: Discord bot commands (`/cooldown`, `/tilt`) are a poor fit for gambling tracking because they lack privacy, rich features, and real-time intervention capabilities. A PWA provides a private, mobile-first, feature-rich solution that can actually help people with gambling problems.

**Timeline**: 11 weeks from start to full migration  
**Effort**: 4-5 weeks development + 2 weeks migration + ongoing support

---

## Table of Contents

1. [Current State (Discord Bot)](#current-state-discord-bot)
2. [Problems with Discord Bot Approach](#problems-with-discord-bot-approach)
3. [Proposed TiltCheck PWA](#proposed-tiltcheck-pwa)
4. [Technical Architecture](#technical-architecture)
5. [Migration Strategy](#migration-strategy)
6. [Bot Changes Required](#bot-changes-required)
7. [Event-Driven Communication](#event-driven-communication-preserved)
8. [Benefits of Migration](#benefits-of-migration)
9. [Implementation Timeline](#implementation-timeline)
10. [Success Metrics](#success-metrics)

---

## Current State (Discord Bot)

### Existing Commands

**In TiltCheck Discord Bot** (`apps/discord-bot/`):

1. **`/cooldown <user>`**
   - Check if user is in gambling cooldown period
   - Returns time remaining or "ready to gamble"
   - Public command (visible to server)
   - Limited tracking (only cooldown status)

2. **`/tilt <user>`**
   - Analyze user's tilt level based on recent activity
   - Returns tilt score and risk level
   - Public command (visible to server)
   - No historical tracking or trends

### Current Functionality

- **Basic tilt detection**: Analyzes recent gambling behavior
- **Cooldown enforcement**: Tracks when user should take a break
- **Public visibility**: Commands run in Discord servers (not private)
- **No persistence**: Limited historical data storage
- **Reactive**: Intervenes after gambling, not during

### Command Usage

Commands are implemented in:
- `apps/discord-bot/src/commands/cooldown.ts`
- `apps/discord-bot/src/commands/tilt.ts`
- Registered in `apps/discord-bot/src/commands/index.ts`

---

## Problems with Discord Bot Approach

### 1. ❌ Privacy Violation

**Problem**: Gambling problems are deeply personal and often stigmatized. Using bot commands in Discord servers exposes users' struggles to server members.

**Example**:
```
User: /tilt @johnDoe
Bot: @johnDoe has a HIGH tilt level (82/100). 
     They've lost $450 in the last 3 hours. 
     Recommend immediate cooldown.
```
Everyone in the server can see this. Embarrassing and invasive.

**Why This Matters**: Users won't use tools that expose their gambling problems publicly. Privacy is essential for adoption and effectiveness.

### 2. ❌ Limited Features

**Problem**: Discord commands are text-based and limited. Can't build rich analytics, charts, or interactive features.

**What You Can't Do in Discord**:
- Show spending charts (line graphs, heat maps)
- Interactive trend analysis
- Session-by-session breakdowns
- Comparative analytics (this week vs last week)
- Visual tilt indicators

**What Users Need**: Rich visual interface with charts, trends, and insights.

### 3. ❌ Poor User Experience

**Problem**: Users won't manually run `/cooldown` or `/tilt` commands regularly. It requires deliberate action in Discord.

**Why This Fails**:
- Requires user to remember to check
- Extra friction (open Discord, find bot, type command)
- No reminders or prompts
- Can't track when not in Discord

**What Users Need**: Automatic tracking, push notifications, always-available mobile app.

### 4. ❌ No Real-Time Integration

**Problem**: Discord bot can't connect to live casino sessions. It can only analyze after the fact.

**What's Missing**:
- Live session tracking (know when user is gambling NOW)
- Real-time interventions ("You've been playing for 2 hours, take a break")
- Auto-cashout when limits reached
- In-session alerts

**What Users Need**: Real-time tracking and intervention while gambling is happening.

### 5. ❌ Reactive, Not Proactive

**Problem**: Bot only responds to commands. It doesn't proactively help users.

**Current Flow**:
1. User gambles (bot doesn't know)
2. User loses money (bot doesn't know)
3. User manually runs `/tilt` (maybe, if they remember)
4. Bot says "you're tilted" (too late)

**Desired Flow**:
1. User starts gambling (app knows via casino integration or manual check-in)
2. App tracks session in real-time
3. User starts losing more than usual
4. App sends push notification: "You've lost $200 in 30 minutes. Take a break?"
5. User sets cooldown or cashes out

**What Users Need**: Proactive monitoring and timely interventions.

### 6. ❌ No Advanced Features

**Problem**: Can't build sophisticated features in Discord commands.

**Missing Features**:
- AI-powered coaching chatbot (24/7 support)
- Self-exclusion (lock accounts across multiple casinos)
- Family monitoring (share data with trusted person)
- Spending analytics (deep insights, predictions)
- Session journals (reflect on gambling sessions)
- Goal tracking (reduction targets, milestones)

**What Users Need**: Comprehensive suite of tools to manage gambling behavior.

---

## Proposed TiltCheck PWA

### Core Features

#### 1. 📊 Private Session Logging

**Manual Logging**:
- Quick entry form: date/time, amount, game type, outcome, mood
- Tags: poker, slots, sports betting, live dealer, etc.
- Notes field for reflections
- Photo upload (optional, for receipts or screenshots)

**Auto-Logging** (Casino Integration):
- Connect casino accounts (Stake, Rollbit, DraftKings, etc.)
- Automatic session detection (when you start/stop playing)
- Auto-pull: amount wagered, wins, losses, game types
- Real-time sync

**Privacy**:
- Data encrypted on device and in cloud
- Optional: Local-only mode (no cloud sync)
- Anonymous mode (no account required)
- Export data anytime (CSV, JSON)

#### 2. 🛡️ Self-Exclusion Dashboard

**Spending Limits**:
- Daily limit (e.g., $100/day)
- Weekly limit (e.g., $500/week)
- Monthly limit (e.g., $2000/month)
- Time limits (max 2 hours/session)

**Account Locking**:
- Lock all linked casino accounts for X days/weeks/months
- Can't unlock until timer expires (enforced by casino APIs)
- Emergency "STOP" button (instant lock)
- Cooldown periods after big losses

**Break Reminders**:
- Set interval (e.g., every 30 minutes)
- Push notification: "Time for a break. Step away for 5 minutes."
- Mandatory breaks after X hours

#### 3. 📈 Spending Analytics

**Charts & Graphs**:
- Line graph: spending over time (daily, weekly, monthly, yearly)
- Bar chart: wins vs losses by game type
- Pie chart: % of spending by category (slots, poker, sports, etc.)
- Heat map: danger zones (time of day, day of week with most losses)

**Trends & Insights**:
- "You lose 3x more between 11pm-2am"
- "Your average loss on Fridays is $250"
- "You're chasing losses 60% of the time after initial loss >$100"
- "Your win rate on sports betting is only 35%"

**Predictive Analytics** (AI-powered):
- "Based on your patterns, you're likely to gamble tonight between 8-10pm"
- "You're showing early signs of tilt (increased bet sizes)"
- "If you continue at this rate, you'll exceed your monthly limit by the 20th"

#### 4. 🤖 AI-Powered Coaching

**24/7 AI Chatbot**:
- Integrated with AI Gateway (GPT-4o or Claude)
- Chat about cravings, urges, triggers
- Get support anytime, anywhere
- Confidential and non-judgmental

**Coaching Techniques**:
- Cognitive behavioral therapy (CBT) prompts
- Coping strategies (distraction, delay, alternatives)
- Journaling exercises
- Mindfulness techniques

**Crisis Intervention**:
- Escalation to human help (therapist, hotline)
- Emergency contacts (trusted friend/family)
- Suicide prevention resources

**Examples**:
```
User: I really want to gamble right now.
AI: I hear you. Let's talk about this. What's triggering this urge right now?

User: I lost $500 yesterday and want to win it back.
AI: That's called "chasing losses" and it rarely works. 
    Let me show you your stats: when you chase losses, 
    you lose 85% of the time and average $200 more in losses. 
    Would you like to try a different coping strategy?
```

#### 5. 🎰 Real-Time Casino Integration

**Connected Casinos**:
- Stake (via API)
- Rollbit (via API)
- DraftKings (via browser extension or API)
- FanDuel (via browser extension or API)
- Others as requested

**Live Session Tracking**:
- Detect when you start gambling (automatic)
- Track wagers, wins, losses in real-time
- Session timer (know how long you've been playing)
- Running total (how much you're up/down this session)

**Real-Time Alerts**:
- "You've lost $200 in the last 30 minutes"
- "You've been playing for 2 hours. Take a 10-minute break?"
- "You're approaching your daily limit ($80/$100)"
- "Your bet sizes are increasing. This is a sign of tilt."

**Auto-Actions**:
- Auto-cashout when daily limit reached
- Force cooldown after X hours
- Block deposits when limit hit

#### 6. 👨‍👩‍👧 Family Monitoring (with Consent)

**Accountability Partner**:
- Share access with trusted friend, spouse, or family member
- They can view your stats (read-only or with intervention powers)
- Optional: They can lock your accounts for you

**Parent Monitoring**:
- For dependents (children, family members)
- Mutual agreement required
- View spending, set limits, receive alerts

**Therapist Access**:
- Share anonymized data with therapist or counselor
- Export reports for sessions
- Track progress over time

**Privacy Controls**:
- Granular permissions (what can they see?)
- Revoke access anytime
- Audit log (who accessed what, when)

#### 7. 🎯 Tilt Detection Algorithm

**Pattern Analysis**:
- Chasing losses (betting more after losing)
- Increasing bet sizes (sign of desperation)
- Emotional state (mood tracking via journaling)
- Time of day (late night = higher risk)
- Win/loss streaks (how you respond to runs)

**Tilt Score** (0-100):
- 0-25: **Low Risk** (green) - Gambling responsibly
- 26-50: **Medium Risk** (yellow) - Watch for warning signs
- 51-75: **High Risk** (orange) - Intervention recommended
- 76-100: **Critical Risk** (red) - Immediate cooldown required

**Tilt Indicators**:
- 🔴 Chasing losses
- 🟠 Increasing bet sizes
- 🟡 Emotional state (angry, frustrated)
- 🟣 Late night gambling
- 🔵 Lack of sleep

**Interventions**:
- Push notification with tilt score and recommendation
- Mandatory cooldown suggestion
- AI chatbot outreach
- Emergency contact alert (if enabled)

---

## Technical Architecture

### Frontend (PWA)

**Framework**: React or Vue.js (recommend React for ecosystem consistency)

**Key Libraries**:
- **Chart.js** or **Recharts** - Data visualization (charts, graphs)
- **Workbox** - Service worker for offline support
- **Axios** - API calls
- **Socket.IO Client** - Real-time updates (WebSocket)
- **React Router** - Navigation
- **TailwindCSS** or **Material-UI** - Styling

**Features**:
- **Mobile-first design**: Optimized for phones (where most gambling happens)
- **Responsive**: Works on tablet, desktop too
- **Offline support**: Log sessions offline, sync when online (IndexedDB)
- **Push notifications**: Alerts and interventions
- **Installable**: Add to home screen (app-like experience)
- **Biometric lock**: Fingerprint or Face ID for opening app

**PWA Requirements**:
- `manifest.json` - App metadata (name, icons, theme)
- Service worker - Offline caching, background sync
- HTTPS - Required for PWA features

### Backend (API Server)

**Framework**: Express.js (Node.js)

**Port**: 3004 (TBD, confirm with other services)

**Endpoints**:

**Authentication**:
- `POST /api/auth/discord` - Discord OAuth login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

**Sessions**:
- `POST /api/sessions` - Log new session (manual)
- `GET /api/sessions` - Get session history
- `GET /api/sessions/:id` - Get specific session
- `PATCH /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

**Analytics**:
- `GET /api/analytics/summary` - Overview stats (total spent, win rate, etc.)
- `GET /api/analytics/trends` - Trend data for charts
- `GET /api/analytics/tilt-score` - Current tilt score
- `GET /api/analytics/insights` - AI-generated insights

**Limits & Self-Exclusion**:
- `GET /api/limits` - Get current limits
- `PUT /api/limits` - Update limits
- `POST /api/exclusion/activate` - Start self-exclusion
- `GET /api/exclusion/status` - Check exclusion status

**AI Chatbot**:
- `POST /api/chat` - Send message to AI, get response
- `GET /api/chat/history` - Get chat history

**Casino Integrations**:
- `POST /api/casinos/connect` - Link casino account
- `GET /api/casinos` - List connected casinos
- `DELETE /api/casinos/:id` - Unlink casino
- `GET /api/casinos/:id/sessions` - Get auto-tracked sessions

**Family Monitoring**:
- `POST /api/sharing/invite` - Invite accountability partner
- `GET /api/sharing/invites` - List pending invites
- `POST /api/sharing/accept` - Accept invite
- `DELETE /api/sharing/:id` - Revoke access

**Dependencies**:
- **@tiltcheck/event-router** - Publish/subscribe to events
- **@tiltcheck/ai-gateway** - AI chatbot integration
- **@tiltcheck/types** - Shared types
- **PostgreSQL** - Database for user data, sessions, limits
- **Socket.IO** - Real-time updates to frontend
- **Passport.js** - Authentication (Discord OAuth)
- **Axios** - External API calls (casino APIs)

### Database (PostgreSQL)

**Tables**:

**users**:
- id, discord_id, email, created_at, updated_at
- settings (JSON: notifications, privacy, etc.)

**sessions**:
- id, user_id, start_time, end_time, duration
- amount_wagered, amount_won, amount_lost, net_result
- game_type, casino, mood, notes
- auto_tracked (boolean), created_at

**limits**:
- id, user_id, limit_type (daily/weekly/monthly/session)
- amount, time_duration, enabled, created_at

**exclusions**:
- id, user_id, start_date, end_date, reason
- active (boolean), created_at

**casinos**:
- id, user_id, casino_name, api_key (encrypted)
- connected_at, last_sync

**tilt_scores**:
- id, user_id, score, calculated_at
- indicators (JSON: chasing_losses, bet_increases, etc.)

**chat_messages**:
- id, user_id, role (user/assistant), content, timestamp

**sharing**:
- id, user_id, shared_with_user_id, permissions (JSON)
- accepted_at, revoked_at

### Security & Privacy

**Encryption**:
- All sensitive data encrypted at rest (PostgreSQL + pgcrypto)
- Passwords/API keys hashed with bcrypt
- HTTPS for all API calls

**Authentication**:
- Discord OAuth (primary)
- Optional: Email/password for non-Discord users
- Session tokens (JWT)

**Privacy**:
- Optional anonymous mode (no account, data on device only)
- GDPR compliant (data export, deletion)
- No data sharing without explicit consent
- Audit logs for family monitoring access

**Biometric**:
- Fingerprint or Face ID to unlock app
- Prevent unauthorized access to sensitive data

---

## Migration Strategy

### Phase 1: Build TiltCheck PWA (4-5 weeks)

**Week 1-2: Backend API**
- Set up Express server
- Implement authentication (Discord OAuth)
- Create database schema
- Implement session CRUD endpoints
- Implement analytics endpoints

**Week 3-4: Frontend UI**
- Set up React PWA
- Implement authentication flow
- Build session logging UI
- Build analytics dashboard (charts, graphs)
- Build self-exclusion UI

**Week 5: Casino Integrations**
- Integrate Stake API
- Integrate Rollbit API
- Test auto-tracking

**Week 6: AI Chatbot**
- Integrate AI Gateway
- Build chat UI
- Implement coaching prompts

**Week 7: Testing & Security**
- End-to-end testing
- Security audit
- Performance optimization
- PWA checklist (offline, notifications, install)

### Phase 2: Announce Migration (1-2 weeks)

**Week 8: Announcement**
- Deploy TiltCheck PWA to production (e.g., `tracker.tiltcheck.me`)
- Update Discord bot help text
- Add `/tiltcheck` redirect command
- Post announcements in Discord servers
- Create migration guide (README, video)
- Set grace period end date

**Communications**:
```
📢 IMPORTANT ANNOUNCEMENT 📢

TiltCheck has moved to a dedicated app!

❌ The /cooldown and /tilt commands will be REMOVED on [date]

✅ Use the new TiltCheck app instead:
   🔗 https://tracker.tiltcheck.me

Why the change?
- 🔒 Privacy: Your data is private, not visible in Discord
- 📊 Better features: Charts, analytics, AI coaching
- 📱 Mobile app: Track on your phone
- 🤖 AI support: 24/7 coaching chatbot
- 🎰 Casino integration: Real-time tracking

Scan this QR code to install on your phone:
[QR code image]

Questions? Use /tiltcheck command for more info.
```

### Phase 3: Deprecate Commands (2 weeks grace period)

**Week 9-10: Grace Period**
- `/cooldown` and `/tilt` commands show deprecation warning
- Commands still work, but display message:
  ```
  ⚠️ This command is deprecated and will be removed on [date].
  
  Please use the TiltCheck app instead:
  🔗 https://tracker.tiltcheck.me
  
  [Run command anyway? Yes / No]
  ```
- Track command usage to monitor migration
- Support users with questions

### Phase 4: Remove Commands (After grace period)

**Week 11: Full Migration**
- Delete `/cooldown` and `/tilt` command handlers
- Remove TiltCheck module import from Discord bot (keep module for PWA)
- Update bot command list (remove from `/help`)
- Archive old command files (don't delete, move to `/archive`)

**Final `/tiltcheck` redirect command**:
```typescript
// apps/discord-bot/src/commands/tiltcheck.ts
export default {
  name: 'tiltcheck',
  description: 'Access the TiltCheck gambling tracker app',
  async execute(interaction) {
    const qrCode = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://tracker.tiltcheck.me';
    
    await interaction.reply({
      content: '🎰 **TiltCheck - Gambling Tracker**\n\n' +
        '**Track your gambling, set limits, get AI support:**\n' +
        '🔗 https://tracker.tiltcheck.me\n\n' +
        '**Features:**\n' +
        '• Private session logging\n' +
        '• Spending analytics & charts\n' +
        '• Self-exclusion tools\n' +
        '• AI-powered coaching (24/7)\n' +
        '• Real-time casino integration\n' +
        '• Family monitoring (with consent)\n\n' +
        '**Install on your phone:**',
      embeds: [{
        image: { url: qrCode },
        color: 0x5865F2
      }],
      ephemeral: true
    });
  }
};
```

### Phase 5: Monitor & Support (Ongoing)

**Metrics to Track**:
- PWA adoption rate (% of previous `/cooldown` users who register)
- Daily active users
- Session logs per user
- Feature usage (analytics, chatbot, self-exclusion)
- User feedback and ratings

**Support**:
- Monitor feedback channels
- Iterate on features based on user requests
- Add more casino integrations
- Improve AI chatbot prompts
- Bug fixes and performance improvements

---

## Bot Changes Required

### Files to Modify

**Delete** (or move to `/archive`):
- `apps/discord-bot/src/commands/cooldown.ts`
- `apps/discord-bot/src/commands/tilt.ts`

**Modify**:
- `apps/discord-bot/src/commands/index.ts` - Remove cooldown, tilt imports
- `apps/discord-bot/package.json` - Remove @tiltcheck/tiltcheck-core dependency (if not used elsewhere)

**Add**:
- `apps/discord-bot/src/commands/tiltcheck.ts` - Redirect command to PWA

### Code Changes

**Before** (`apps/discord-bot/src/commands/index.ts`):
```typescript
import cooldown from './cooldown';
import tilt from './tilt';
import ping from './ping';
// ... other commands

export default [
  cooldown,
  tilt,
  ping,
  // ... other commands
];
```

**After** (`apps/discord-bot/src/commands/index.ts`):
```typescript
// import cooldown from './cooldown'; // REMOVED
// import tilt from './tilt'; // REMOVED
import tiltcheck from './tiltcheck'; // NEW: Redirect to PWA
import ping from './ping';
// ... other commands

export default [
  tiltcheck, // NEW
  ping,
  // ... other commands
];
```

### Package.json Changes

**Before** (`apps/discord-bot/package.json`):
```json
{
  "dependencies": {
    "@tiltcheck/tiltcheck-core": "workspace:*",
    // ... other deps
  }
}
```

**After** (`apps/discord-bot/package.json`):
```json
{
  "dependencies": {
    // "@tiltcheck/tiltcheck-core": "workspace:*", // REMOVED (unless used elsewhere)
    // ... other deps
  }
}
```

---

## Event-Driven Communication Preserved

### TiltCheck PWA Still Integrates with Ecosystem

Even though TiltCheck is no longer a Discord bot, it remains part of the TiltCheck ecosystem via **Event Router**.

### Events Published by TiltCheck PWA

```typescript
// Backend publishes these events to Event Router

// Session events
eventRouter.publish('tilt.session.started', {
  userId: 'user123',
  sessionId: 'session456',
  startTime: new Date(),
  casino: 'Stake'
});

eventRouter.publish('tilt.session.ended', {
  userId: 'user123',
  sessionId: 'session456',
  endTime: new Date(),
  netResult: -250.00, // Lost $250
  duration: 7200 // 2 hours in seconds
});

// Limit events
eventRouter.publish('tilt.limit.reached', {
  userId: 'user123',
  limitType: 'daily',
  limitAmount: 100.00,
  currentAmount: 100.00
});

// Tilt events
eventRouter.publish('tilt.alert.triggered', {
  userId: 'user123',
  tiltScore: 82,
  riskLevel: 'high',
  indicators: ['chasing_losses', 'bet_increases'],
  recommendation: 'immediate_cooldown'
});

// Self-exclusion events
eventRouter.publish('tilt.exclusion.activated', {
  userId: 'user123',
  duration: 604800, // 7 days in seconds
  reason: 'self_imposed',
  startDate: new Date()
});
```

### Events Subscribed by TiltCheck PWA

```typescript
// Backend subscribes to these events

// JustTheTip transactions (to detect gambling-related payments)
eventRouter.subscribe('transaction.created', (event) => {
  if (event.recipient === 'stake.com' || event.recipient === 'rollbit.com') {
    // Potentially gambling-related transaction
    // Log as session or trigger alert
  }
});

// AI Gateway responses (for chatbot)
eventRouter.subscribe('ai.response', (event) => {
  if (event.application === 'tilt-coaching') {
    // AI chatbot responded
    // Store message in chat history
  }
});

// User profile updates
eventRouter.subscribe('user.profile.updated', (event) => {
  // User changed Discord username, avatar, etc.
  // Update TiltCheck user record
});
```

### Benefits of Event-Driven Architecture

- ✅ **Decoupled**: TiltCheck PWA doesn't need direct imports from Discord bot
- ✅ **Flexible**: Easy to add new integrations (e.g., new casinos publish events)
- ✅ **Observable**: Other modules can react to tilt events (e.g., Trust system lowers score during tilt)
- ✅ **Scalable**: Event Router handles distribution to all subscribers

---

## Benefits of Migration

### For Users

1. ✅ **Privacy**
   - Track gambling privately, not in public Discord servers
   - No one else sees your data unless you share it
   - Optional anonymous mode

2. ✅ **Better UX**
   - Rich visual interface (charts, graphs, dashboards)
   - Mobile app experience (installable on phone)
   - Intuitive navigation
   - Offline support

3. ✅ **Real-Time Tracking**
   - Live casino integration (Stake, Rollbit)
   - Know when you're gambling, in real-time
   - Alerts during sessions, not after

4. ✅ **AI Support**
   - 24/7 coaching chatbot
   - Get help during cravings
   - CBT techniques and coping strategies

5. ✅ **Advanced Features**
   - Self-exclusion (lock accounts)
   - Spending analytics (deep insights)
   - Family monitoring (with consent)
   - Goal tracking and milestones

6. ✅ **Mobile Accessibility**
   - Always in your pocket
   - Push notifications
   - Offline logging

### For TiltCheck

1. ✅ **Professionalism**
   - Dedicated app shows TiltCheck is serious about helping people
   - Not just a gimmick Discord bot

2. ✅ **Reach**
   - Not limited to Discord users
   - Anyone with gambling problems can use it
   - SEO (discoverable via Google)

3. ✅ **Features**
   - Can build advanced features in PWA that are impossible in Discord
   - Casino integrations, real-time tracking, rich analytics

4. ✅ **Monetization Potential**
   - Partnerships with therapy providers
   - Premium features (advanced analytics, more casinos)
   - B2B (casinos use TiltCheck for responsible gambling compliance)

5. ✅ **Impact**
   - Actually help people, not just detect tilt
   - Reduce gambling harm in real, measurable ways
   - Positive brand reputation

### For Discord Bot

1. ✅ **Simpler**
   - Fewer commands to maintain
   - Smaller codebase

2. ✅ **Focused**
   - Bot stays focused on social features (games, tipping, promos)
   - No privacy-sensitive commands

3. ✅ **Cleaner**
   - Remove bloat
   - Easier to understand and maintain

---

## Implementation Timeline

### Detailed Week-by-Week Plan

| Week | Phase | Tasks | Deliverables |
|------|-------|-------|--------------|
| 1 | Backend | Set up Express server, database schema, auth | API endpoints for sessions, analytics |
| 2 | Backend | Implement limits, self-exclusion, chat endpoints | Complete backend API |
| 3 | Frontend | Set up React PWA, auth flow, session logging UI | Basic PWA with login and logging |
| 4 | Frontend | Analytics dashboard, charts, self-exclusion UI | Feature-complete PWA |
| 5 | Integration | Stake API, Rollbit API, auto-tracking | Casino integrations working |
| 6 | AI | AI Gateway integration, chat UI, coaching prompts | AI chatbot functional |
| 7 | Testing | End-to-end tests, security audit, performance | Production-ready PWA |
| 8 | Deploy | Deploy to production, announce migration | Live at tracker.tiltcheck.me |
| 9-10 | Grace Period | Support users, monitor adoption, iterate | Users migrating to PWA |
| 11 | Removal | Delete Discord commands, archive files | Full migration complete |

**Total**: 11 weeks from start to full migration

### Effort Breakdown

- **Development**: 4-5 weeks (backend + frontend + integrations + AI)
- **Testing & Deployment**: 1 week
- **Migration & Support**: 4 weeks (announcement + grace period + removal)
- **Ongoing**: Continuous improvement based on user feedback

---

## Success Metrics

### Adoption Metrics

- **Registration Rate**: % of previous `/cooldown` users who create account on PWA
- **Target**: 50%+ within 3 months

- **Daily Active Users (DAU)**: Users who log in daily
- **Target**: 100+ DAU within 3 months

### Engagement Metrics

- **Sessions Logged**: Average sessions logged per user per week
- **Target**: 3+ sessions/week

- **Chatbot Usage**: % of users who chat with AI
- **Target**: 30%+ of users

- **Self-Exclusion**: % of users who activate self-exclusion
- **Target**: 10%+ of users

### Impact Metrics

- **Gambling Reduction**: Self-reported reduction in gambling losses
- **Survey**: "Has TiltCheck helped you reduce gambling? Yes/No/Somewhat"
- **Target**: 60%+ say "Yes" or "Somewhat"

- **Satisfaction**: User ratings (1-5 stars)
- **Target**: 4.0+ average rating

### Technical Metrics

- **Uptime**: PWA availability
- **Target**: 99.5%+ uptime

- **Performance**: Page load time
- **Target**: <2 seconds (3G network)

- **Offline**: % of sessions logged offline
- **Target**: 20%+ (shows offline feature is valuable)

---

## Risks & Mitigation

### Risk 1: Low Adoption

**Risk**: Users don't migrate from Discord to PWA.

**Mitigation**:
- Make PWA clearly better (rich features, privacy)
- Aggressive communication (announcements, emails, DMs)
- Incentives (e.g., "First 100 users get XYZ")
- Long grace period (2 weeks minimum)
- Keep `/tiltcheck` redirect command forever

### Risk 2: Technical Complexity

**Risk**: Casino integrations are hard, APIs change, etc.

**Mitigation**:
- Start with 2 casinos (Stake, Rollbit)
- Add more based on demand
- Fallback to manual logging if API fails
- Clear error messages and support

### Risk 3: Privacy Concerns

**Risk**: Users worry about data security.

**Mitigation**:
- End-to-end encryption
- GDPR compliance
- Optional anonymous mode
- Clear privacy policy
- Security audit by third party

### Risk 4: Maintenance Burden

**Risk**: PWA requires more maintenance than Discord bot.

**Mitigation**:
- Good code architecture
- Automated tests
- Monitoring and alerting
- Budget for ongoing support
- Consider hiring dedicated developer

---

## Conclusion

Migrating TiltCheck from Discord bot to PWA is the **right decision** for the following reasons:

1. **Privacy**: Gambling problems need privacy, not public Discord commands
2. **Features**: PWA enables rich features impossible in Discord (charts, real-time tracking, AI chatbot)
3. **Reach**: Not limited to Discord users, anyone can use it
4. **Impact**: Can actually help people reduce gambling harm
5. **Professionalism**: Shows TiltCheck is serious, not just a Discord gimmick

**Timeline**: 11 weeks total (4-5 weeks dev + migration + support)

**Effort**: High upfront, but worth it for long-term impact

**Recommendation**: **PROCEED** with migration. TiltCheck PWA will be a flagship product that demonstrates TiltCheck's commitment to responsible gambling and user privacy.

---

**TiltCheck PWA: Not just detecting tilt. Actually helping people. 🎰📱💙**
