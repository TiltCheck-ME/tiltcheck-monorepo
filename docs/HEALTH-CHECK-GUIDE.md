# TiltCheck Health Check System

**Last Updated:** December 6, 2025  
**Status:** Production Ready ✅

## Overview

TiltCheck includes comprehensive health check systems for monitoring service health in development, staging, and production environments.

## Health Check Endpoints

All TiltCheck services expose standardized health check endpoints:

### Landing Page

**Endpoint:** `GET /health`  
**Port:** 8080  
**Response:**
```json
{
  "status": "ok",
  "ready": true,
  "service": "landing",
  "version": "0.1.0",
  "timestamp": "2025-12-06T20:00:00.000Z"
}
```

### Dashboard

**Endpoint:** `GET /api/health`  
**Port:** 5055  
**Response:**
```json
{
  "status": "ok",
  "ready": true,
  "service": "dashboard",
  "version": "0.1.0",
  "timestamp": "2025-12-06T20:00:00.000Z"
}
```

### Discord Bot

**Endpoint:** `GET /health`  
**Port:** 8081  
**Response:**
```json
{
  "status": "ok",
  "ready": true,
  "service": "discord-bot",
  "connected": true,
  "timestamp": "2025-12-06T20:00:00.000Z"
}
```

### Trust Rollup

**Endpoint:** `GET /health`  
**Port:** 8082  
**Response:**
```json
{
  "status": "ok",
  "ready": true,
  "service": "trust-rollup",
  "dataSource": "api",
  "casinos": 6,
  "lastUpdate": "2025-12-06T19:00:00.000Z",
  "timestamp": "2025-12-06T20:00:00.000Z"
}
```

## Health Check Scripts

### Basic Health Check

Checks all services and verifies they're ready:

```bash
bash scripts/check-health.sh
```

**Configuration:**
```bash
# Customize URLs
LANDING_URL=http://localhost:8080/health
BOT_URL=http://localhost:8081/health
ROLLUP_URL=http://localhost:8082/health

# Require services to be ready
REQUIRE_READY=true

# Polling settings
WAIT_ATTEMPTS=30      # Max attempts (default: 30)
WAIT_INTERVAL=2       # Seconds between attempts (default: 2)

# Run with custom settings
REQUIRE_READY=true WAIT_ATTEMPTS=60 bash scripts/check-health.sh
```

**Exit Codes:**
- `0` - All services healthy
- `1` - Service unreachable
- `2` - Service not ready

### Railway Deployment Verification

Comprehensive verification for Railway deployments:

```bash
bash scripts/verify-railway-deployment.sh
```

**Features:**
- ✅ Checks all service health endpoints
- ✅ Verifies environment variables
- ✅ Tests Discord bot connectivity
- ✅ Validates data source configuration
- ✅ Color-coded output
- ✅ Detailed failure diagnostics

**Configuration:**
```bash
# Railway domain (auto-detected if railway CLI installed)
RAILWAY_DOMAIN=your-app.railway.app

# Require production mode
REQUIRE_PRODUCTION=true

# Enable verbose output
VERBOSE=true

# Run with custom settings
RAILWAY_DOMAIN=myapp.railway.app VERBOSE=true bash scripts/verify-railway-deployment.sh
```

## GitHub Actions Health Checks

### Health Check Workflow

Runs comprehensive health checks on every push and PR:

**Workflow:** `.github/workflows/health-check.yml`

**What it does:**
1. Builds Discord bot and trust rollup Docker images
2. Starts services with docker-compose
3. Waits for startup
4. Runs health check script
5. Validates trust rollup snapshot
6. Dumps logs on failure

**Badge:** ![Health Check](https://github.com/jmenichole/tiltcheck-monorepo/actions/workflows/health-check.yml/badge.svg)

### Deployment Health Workflow

Monitors production deployments:

**Workflow:** `.github/workflows/deployment-health.yml`

**What it does:**
1. Runs every 6 hours
2. Checks production endpoints
3. Sends alerts on failures
4. Tracks uptime metrics

## Docker Compose Health Checks

All services in `docker-compose.yml` include Docker health checks:

### Landing Service

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 20s
```

### Dashboard Service

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5055/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Reverse Proxy

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/proxy-health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

## Manual Health Checks

### Local Development

```bash
# Check all services
curl http://localhost:8080/health | jq
curl http://localhost:5055/api/health | jq
curl http://localhost:8081/health | jq
curl http://localhost:8082/health | jq

# Quick status
curl -s http://localhost:8080/health | jq -r '.status'
```

### Production (Railway)

```bash
# Using Railway CLI
railway run curl http://localhost:8080/health

# Using domain
curl https://your-app.railway.app/health | jq
curl https://your-app.railway.app:5055/api/health | jq
curl https://your-app.railway.app:8081/health | jq
curl https://your-app.railway.app:8082/health | jq
```

### Docker Compose

```bash
# Check service health status
docker-compose ps

# Expected output:
# NAME                  STATUS
# tiltcheck-landing     Up (healthy)
# tiltcheck-dashboard   Up (healthy)
# tiltcheck-bot         Up
# tiltcheck-rollup      Up

# Manual health check
docker exec tiltcheck-landing wget -qO- http://localhost:8080/health
docker exec tiltcheck-dashboard wget -qO- http://localhost:5055/api/health
docker exec tiltcheck-rollup wget -qO- http://localhost:8082/health
```

## Monitoring Best Practices

### Development

```bash
# Watch logs while developing
docker-compose logs -f

# Check health periodically
watch -n 5 'bash scripts/check-health.sh'

# Monitor specific service
docker-compose logs -f discord-bot
```

### Staging

```bash
# Automated health checks every minute
*/1 * * * * bash /path/to/check-health.sh || echo "Health check failed"

# Monitor with Railway
railway logs --follow
```

### Production

**External Monitoring:**
1. UptimeRobot - Ping endpoints every 5 minutes
2. Pingdom - Global availability monitoring
3. StatusCake - Performance monitoring

**Internal Monitoring:**
1. GitHub Actions - Every 6 hours
2. Railway metrics - Built-in
3. Custom alerts - Discord webhooks

## Health Check Troubleshooting

### Service Not Responding

**Symptoms:**
```bash
$ curl http://localhost:8080/health
curl: (7) Failed to connect to localhost port 8080: Connection refused
```

**Solutions:**
1. Check if service is running: `docker-compose ps`
2. Check logs: `docker-compose logs landing`
3. Restart service: `docker-compose restart landing`
4. Check port availability: `lsof -i :8080`

### Service Returns `ready: false`

**Symptoms:**
```json
{
  "status": "ok",
  "ready": false
}
```

**Solutions:**
1. Wait for startup - services may need time to initialize
2. Check dependencies - service may be waiting for database, etc.
3. Review logs for errors
4. Verify environment variables

### Intermittent Failures

**Symptoms:**
- Health checks pass sometimes, fail other times
- Random timeouts

**Solutions:**
1. Increase timeout: `WAIT_ATTEMPTS=60 WAIT_INTERVAL=5 bash scripts/check-health.sh`
2. Check resource usage: `docker stats`
3. Monitor network issues
4. Review rate limiting

### All Health Checks Fail

**Symptoms:**
- All services return errors
- Network issues

**Solutions:**
1. Check Docker daemon: `docker ps`
2. Restart Docker: `sudo systemctl restart docker`
3. Check DNS resolution: `ping localhost`
4. Verify firewall settings
5. Check Railway status: https://railway.app/status

## Custom Health Checks

### Adding New Service

1. **Implement health endpoint:**

```typescript
// src/health.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ready: true,
    service: 'my-service',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString()
  });
});
```

2. **Add to health check script:**

```bash
# scripts/check-health.sh
check "my-service" "$MY_SERVICE_URL" || overall_rc=$?
```

3. **Add Docker health check:**

```yaml
# docker-compose.yml
my-service:
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8083/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 20s
```

## Health Check Metrics

### Key Metrics to Track

| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Uptime | >99.9% | Investigate root cause |
| Response time | <500ms | Optimize service |
| Success rate | >99% | Review error logs |
| Start time | <30s | Optimize startup |

### Monitoring Dashboard

Create custom dashboard tracking:
- Service uptime
- Health check success rate
- Average response time
- Failed health checks per day
- Time to recovery

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Health Check
  run: |
    bash scripts/check-health.sh
    if [ $? -ne 0 ]; then
      echo "Health check failed - rolling back"
      railway rollback
      exit 1
    fi
```

### Monitoring Alert

```bash
#!/bin/bash
# monitor.sh - Send alert if health check fails

if ! bash scripts/check-health.sh; then
  # Send Discord webhook
  curl -X POST $DISCORD_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{
      "content": "🚨 TiltCheck health check failed!",
      "username": "Health Monitor"
    }'
fi
```

### Load Balancer

```nginx
# nginx.conf
upstream tiltcheck {
  server localhost:8080 max_fails=3 fail_timeout=30s;
  
  # Health check
  check interval=5000 rise=2 fall=3 timeout=1000 type=http;
  check_http_send "GET /health HTTP/1.0\r\n\r\n";
  check_http_expect_alive http_2xx http_3xx;
}
```

## Support

### Getting Help

1. Check this guide
2. Review service logs: `railway logs --service=<name>`
3. Run verification script: `bash scripts/verify-railway-deployment.sh`
4. Check GitHub Issues
5. Contact support with logs

### Useful Commands

```bash
# Quick health check
bash scripts/check-health.sh

# Verbose health check
VERBOSE=true bash scripts/check-health.sh

# Railway verification
bash scripts/verify-railway-deployment.sh

# Monitor continuously
watch -n 10 'bash scripts/check-health.sh'
```

---

**Health monitoring is critical for production reliability!** ✅
