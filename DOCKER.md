# Docker Deployment Guide

Quick reference for deploying TiltCheck with Docker.

## Quick Start

```bash
# 1. Copy environment template
cp .env.docker.example .env

# 2. Edit .env and add your credentials
nano .env

# 3. Build and start services
docker-compose up -d

# 4. Check status
docker-compose ps
docker-compose logs -f

# 5. Verify
curl http://localhost:5055/api/health
```

## Services

- **dashboard** - Trust metrics dashboard (port 5055)
- **discord-bot** - Discord bot with trust commands
- **trust-rollup** - Aggregates trust events hourly

## Common Commands

```bash
# View logs
docker-compose logs -f dashboard
docker-compose logs -f discord-bot

# Restart a service
docker-compose restart dashboard

# Rebuild after code changes
docker-compose build dashboard
docker-compose up -d dashboard

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Update to latest images
docker-compose pull
docker-compose up -d
```

## Production Deployment

### 1. Using Docker Hub Images

```bash
# Tag and push (CI/CD does this automatically)
docker tag tiltcheck-dashboard:latest username/tiltcheck-dashboard:latest
docker push username/tiltcheck-dashboard:latest

# On production server
docker pull username/tiltcheck-dashboard:latest
docker-compose up -d
```

### 2. Environment Variables

Required for bot:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`

Optional for alerts:
- `DISCORD_WEBHOOK_URL`

### 3. Data Persistence

Data is stored in:
- `./data` - Shared volume for all services
- `dashboard-events` - Named volume for event logs

Backup regularly:
```bash
tar -czf tiltcheck-backup-$(date +%Y%m%d).tar.gz ./data
```

### 4. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name dashboard.example.com;

    location / {
        proxy_pass http://localhost:5055;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE support
    location /events {
        proxy_pass http://localhost:5055/events;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

## Monitoring

### Health Checks

```bash
# Dashboard health
curl http://localhost:5055/api/health

# Container health
docker-compose ps
docker inspect tiltcheck-dashboard --format='{{.State.Health.Status}}'
```

### Resource Usage

```bash
docker stats tiltcheck-dashboard tiltcheck-bot
```

### Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f dashboard
```

## Troubleshooting

### Bot not connecting
```bash
# Check logs
docker-compose logs discord-bot

# Verify env vars
docker-compose exec discord-bot env | grep DISCORD

# Restart
docker-compose restart discord-bot
```

### Dashboard not accessible
```bash
# Check if running
docker-compose ps dashboard

# Check port mapping
docker port tiltcheck-dashboard

# View logs
docker-compose logs dashboard
```

### Out of disk space
```bash
# Clean up unused images
docker system prune -a

# Remove old event files
docker-compose exec dashboard sh -c "find /app/data/events -name '*.json' -mtime +30 -delete"
```

## CI/CD Integration

GitHub Actions workflows automatically:
1. Run tests on PR
2. Build Docker images on merge to main
3. Push to Docker Hub
4. Deploy to production server

Required secrets:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup.
