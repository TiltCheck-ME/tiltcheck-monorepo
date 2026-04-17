# TiltCheck Control Room

Admin dashboard for managing the TiltCheck ecosystem.

## Features

### System Monitoring
- Live service status for all 13 services
- Process health checks
- System metrics (CPU, memory, disk)
- Error tracking

### Process Management
- Start/Stop/Restart individual services
- Kill all & restart switch
- View service logs in real-time
- Auto-restart configuration

### Command Usage Feed
- Real-time activity stream
- Filter by command type, user, module
- Usage statistics
- Performance metrics

### Documentation Viewer
- Secure access to sensitive docs
- Architecture diagrams
- API documentation
- Search functionality

### Settings Controls
- Environment variable management
- Module enable/disable toggles
- Feature flags
- Rate limits & quotas

### AI-Powered Terminal
- Chat interface for code changes
- Natural language commands
- System diagnostics
- Integrated with AI Gateway

### Quick Actions
- Emergency shutdown
- Clear caches
- Export system state
- Broadcast announcements

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Start the control room:
```bash
pnpm --filter @tiltcheck/control-room start
```

4. Access at `http://localhost:3001`

## Access Control

The Control Room should be locked to you, not exposed as a general admin panel.

- `ADMIN_DISCORD_IDS` - Comma-separated Discord user IDs allowed through Discord OAuth
- `ADMIN_PASSWORD` - Backup password gate for direct login
- `CONTROL_ROOM_ALLOWED_IPS` - Optional comma-separated IPv4 / IPv6 allowlist for a second network gate

Recommended lock setup:

```bash
ADMIN_DISCORD_IDS=<your_discord_user_id>
CONTROL_ROOM_ALLOWED_IPS=68.57.191.75,2001:4860:7:110e::80
```

That keeps the Control Room behind:

1. Your Discord ID whitelist
2. Your admin password fallback
3. Your network allowlist when you are on one of those IPs

If you deploy behind a proxy, make sure the proxy forwards the real client IP so the allowlist can work correctly.

## Environment Variables

- `CONTROL_ROOM_PORT` - Port (default: 3001)
- `ADMIN_PASSWORD` - Admin login password
- `SESSION_SECRET` - Session encryption key
- `ADMIN_DISCORD_IDS` - Discord user ID whitelist for Control Room OAuth access
- `CONTROL_ROOM_ALLOWED_IPS` - Optional IPv4 / IPv6 allowlist for Control Room requests
- `CONTROL_ROOM_DATA_DIR` - Optional persistent directory for queued report jobs and generated report state

## Channel Reports

The Control Room now includes a **Channel Reports** tab for one-off async report requests.

Use it to queue searches like:

- messages from `@ruby` mentioning `provably fair`
- messages from a specific Discord user ID within a date range
- term-only searches across a custom timeframe

Each request is queued, processed in the background, and saved so you can come back later and inspect the finished report.

## Security

- Admin-only access (password-protected)
- Sensitive docs protected
- Process control requires confirmation
- Audit logging for all actions
- Rate limiting

## Usage

1. Login with admin password
2. Monitor system status
3. Manage processes as needed
4. Use AI terminal for code changes
5. View documentation
6. Control settings

## Architecture

- Express server with WebSocket support
- Server-Sent Events for live updates
- PM2 integration for process management
- File system access for logs/docs
- Admin-only authentication middleware
- AI Gateway integration

## For Operators

This dashboard is designed for:
- System administrators
- DevOps engineers
- Future employees
- Anyone who needs to monitor/control the TiltCheck ecosystem

**Keep your admin password secure!**

---

Built for degens, by degens. 🎛️
