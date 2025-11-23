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
pnpm start
```

4. Access at `http://localhost:3001`

## Environment Variables

- `CONTROL_ROOM_PORT` - Port (default: 3001)
- `ADMIN_PASSWORD` - Admin login password
- `SESSION_SECRET` - Session encryption key

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
