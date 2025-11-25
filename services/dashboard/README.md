# TiltCheck Dashboard Service

The personalized web dashboard service for the TiltCheck ecosystem. Provides comprehensive analytics and management interfaces that Discord bot commands redirect to.

## Overview

The dashboard service serves as the central web interface for TiltCheck users, integrating trust analytics, tilt monitoring, and cooldown management into personalized dashboards.

## Features

### 🎯 Trust Analytics Dashboard
- Real-time trust scoring for users
- Casino trust leaderboards  
- Trust factor breakdowns
- Historical trust events

### 📈 Tilt Monitoring Dashboard
- Live tilt level detection
- 24-hour tilt history charts
- Risk factor identification
- Personalized recommendations

### ❄️ Cooldown Management Dashboard
- Spending limit tracking (daily/weekly/monthly)
- Quick cooldown controls (15min to 24h+)
- Active cooldown management
- Lock vault integration

### 🌐 Main Dashboard
- Unified overview of all metrics
- Quick navigation to specialized dashboards
- Real-time status updates
- TiltCheck ecosystem integration

## API Endpoints

### Dashboard Routes
- `GET /dashboard?discord={id}` - Main unified dashboard
- `GET /dashboard/trust?discord={id}` - Trust analytics
- `GET /dashboard/tilt?discord={id}` - Tilt monitoring  
- `GET /dashboard/cooldown?discord={id}` - Cooldown management

### API Routes
- `GET /api/trust/:discordId` - Trust data JSON
- `GET /api/casinos` - Casino trust scores JSON
- `GET /api/events` - Server-Sent Events for real-time updates

### Health Check
- `GET /health` - Service status

## Discord Bot Integration

Discord bot commands redirect users to their personalized dashboards:

```javascript
// Trust command redirects to trust dashboard
/trust → https://tiltcheck.com/dashboard/trust?discord={user_id}

// Tilt check redirects to tilt monitoring
/tiltcheck → https://tiltcheck.com/dashboard/tilt?discord={user_id}

// Cooldown commands redirect to cooldown management
/cooldown → https://tiltcheck.com/dashboard/cooldown?discord={user_id}
```

## Development

### Local Development
```bash
cd services/dashboard
npm run dev  # Starts on port 3001
```

### Access Dashboards
- Main: http://localhost:3001/dashboard?discord=YOUR_DISCORD_ID
- Trust: http://localhost:3001/dashboard/trust?discord=YOUR_DISCORD_ID
- Tilt: http://localhost:3001/dashboard/tilt?discord=YOUR_DISCORD_ID
- Cooldown: http://localhost:3001/dashboard/cooldown?discord=YOUR_DISCORD_ID

### Build & Deploy
```bash
npm run build  # Compiles TypeScript
npm start      # Production mode
```

## Integration Status

### ✅ Completed
- Express server with routing
- Complete HTML dashboard templates  
- Trust engine integration structure
- Real-time event streaming setup
- CORS and security configuration
- Mock data for development/testing

### 🔄 In Progress
- Trust engine data source connections
- Tilt monitoring integration
- User preference persistence
- Casino data API integration

### 📋 Planned
- User authentication system
- Data export functionality
- Mobile responsive optimizations
- Advanced analytics and charts

---

**Created by jmenichole**  
**TiltCheck Ecosystem © 2024–2025**
