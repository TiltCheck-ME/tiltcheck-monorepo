# @tiltcheck/express-utils

Shared Express middleware and utilities for TiltCheck microservices.

## Features

- **Request Logging** — NDJSON request logs with in-memory metrics
- **Admin Security** — IP allowlist middleware for protected routes
- **Metrics** — Lightweight request counters (paths, user-agents)

## Installation

```bash
pnpm install @tiltcheck/express-utils
```

## Usage

### Request Logging

```javascript
const { initLogging } = require('@tiltcheck/express-utils');

const { requestLogger, adminLogger, buildMetrics, pathCounters } = initLogging('/tmp/app.log');

app.use(requestLogger);

app.get('/metrics', (req, res) => {
  const metrics = buildMetrics();
  res.json(metrics);
});

app.get('/admin/panel', (req, res) => {
  adminLogger(req); // Log admin access
  res.send('Admin Panel');
});
```

### IP Allowlist Security

```javascript
const { buildAdminIPs, ipAllowlistMiddleware } = require('@tiltcheck/express-utils');

const ADMIN_IPS = buildAdminIPs(process.env);
const ipAllowlist = ipAllowlistMiddleware(ADMIN_IPS);

app.get('/admin/panel', ipAllowlist, (req, res) => {
  res.send('Protected Admin Panel');
});
```

## API

### `initLogging(logPath)`

Initialize logging system.

**Parameters:**
- `logPath` (string) — Path to NDJSON log file

**Returns:**
- `requestLogger` — Express middleware function
- `adminLogger(req)` — Synchronous admin event logger
- `buildMetrics()` — Returns `{ topPaths, topUAs, totalRequests }`
- `pathCounters` — Internal counter object (for custom metrics)

### `buildAdminIPs(env)`

Build IP allowlist from environment variables.

**Parameters:**
- `env` (object) — Environment variables (typically `process.env`)

**Returns:**
- Array of IP addresses (includes localhost + `ADMIN_IP_1`, `ADMIN_IP_2`, `ADMIN_IP_3`)

### `ipAllowlistMiddleware(allowedIPs)`

Create Express middleware to restrict access by IP.

**Parameters:**
- `allowedIPs` (string[]) — Array of allowed IP addresses

**Returns:**
- Express middleware function (403 on deny, next() on allow)

## Environment Variables

```bash
ADMIN_IP_1=your_public_ip_here
ADMIN_IP_2=optional_office_ip
ADMIN_IP_3=optional_vpn_ip
```

## License

UNLICENSED — TiltCheck internal package
