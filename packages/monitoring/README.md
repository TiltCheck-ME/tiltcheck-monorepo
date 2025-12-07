# @tiltcheck/monitoring

Unified monitoring, error tracking, and logging utilities for TiltCheck services.

## Overview

This package provides a consistent interface for monitoring, error tracking, and logging across all TiltCheck services. It includes:

- **Sentry Integration** - Error tracking and reporting
- **Metrics Collection** - Custom application metrics
- **Logflare Integration** - Log aggregation and analysis
- **Correlation IDs** - Request tracing across services

## Installation

```bash
pnpm add @tiltcheck/monitoring
```

### Optional Peer Dependencies

```bash
# For Sentry error tracking
pnpm add @sentry/node

# For logging (if using Pino)
pnpm add pino
```

## Quick Start

### 1. Initialize Monitoring in Your Service

```typescript
// apps/discord-bot/src/index.ts
import { initSentry } from '@tiltcheck/monitoring';
import { createMetricsCollector } from '@tiltcheck/monitoring/metrics';

// Initialize Sentry (reads SENTRY_DSN from env)
initSentry('discord-bot');

// Create metrics collector
const metrics = createMetricsCollector('discord-bot');

// Your service code...
```

### 2. Add Correlation ID Middleware (Express Services)

```typescript
// apps/api/src/index.ts
import express from 'express';
import { correlationIdMiddleware } from '@tiltcheck/monitoring/correlation-id';

const app = express();

// Add correlation ID middleware EARLY in the chain
app.use(correlationIdMiddleware());

// Your routes...
app.get('/api/example', (req, res) => {
  console.log('Request ID:', req.id);
  res.json({ requestId: req.id });
});
```

### 3. Capture Errors

```typescript
import { captureException } from '@tiltcheck/monitoring';

try {
  // Your code that might fail
  await riskyOperation();
} catch (error) {
  // Capture error with context
  captureException(error, {
    userId: user.id,
    operation: 'riskyOperation',
    additionalData: { ... },
  });
  
  // Re-throw or handle as needed
  throw error;
}
```

### 4. Collect Metrics

```typescript
import { MetricsCollector } from '@tiltcheck/monitoring/metrics';

const metrics = new MetricsCollector('my-service');

// Increment counters
metrics.increment('commands.executed');
metrics.increment('errors.rate', 1);

// Set gauge values
metrics.gauge('memory.usage', process.memoryUsage().heapUsed);
metrics.gauge('active.connections', activeConnections);

// Record timings
const startTime = Date.now();
// ... operation ...
metrics.timing('operation.duration', Date.now() - startTime);

// Flush metrics periodically (e.g., every 30 seconds)
setInterval(() => metrics.flush(), 30000);
```

## Environment Variables

Configure monitoring behavior with these environment variables:

```bash
# Sentry (optional)
SENTRY_DSN=https://...@sentry.io/...

# Logflare (optional)
LOGFLARE_API_KEY=your_api_key
LOGFLARE_SOURCE_ID=your_source_id

# Metrics endpoint (optional)
METRICS_ENDPOINT=https://metrics.tiltcheck.me/ingest

# Node environment (affects error detail level)
NODE_ENV=production
```

## Service Integration Guide

### Discord Bot

```typescript
// apps/discord-bot/src/index.ts
import { Client } from 'discord.js';
import { initSentry, captureException } from '@tiltcheck/monitoring';
import { createMetricsCollector } from '@tiltcheck/monitoring/metrics';

initSentry('discord-bot');
const metrics = createMetricsCollector('discord-bot');

const client = new Client({ ... });

client.on('interactionCreate', async (interaction) => {
  const startTime = Date.now();
  
  try {
    // Handle interaction
    await handleInteraction(interaction);
    
    metrics.increment('commands.success');
    metrics.timing('command.latency', Date.now() - startTime);
  } catch (error) {
    metrics.increment('commands.error');
    
    captureException(error, {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      commandName: interaction.commandName,
    });
    
    // Send user-friendly error message
    await interaction.reply({
      content: 'Something went wrong!',
      ephemeral: true,
    });
  }
});

// Flush metrics every minute
setInterval(() => metrics.flush(), 60000);
```

### API Gateway

```typescript
// apps/api/src/index.ts
import express from 'express';
import { initSentry, captureException } from '@tiltcheck/monitoring';
import { correlationIdMiddleware } from '@tiltcheck/monitoring/correlation-id';
import { createMetricsCollector } from '@tiltcheck/monitoring/metrics';

const app = express();
const metrics = createMetricsCollector('api-gateway');

// Initialize Sentry
initSentry('api-gateway');

// Add correlation ID middleware
app.use(correlationIdMiddleware());

// Metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    metrics.increment(`requests.${res.statusCode}`);
    metrics.timing('request.duration', Date.now() - startTime);
  });
  
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  captureException(err, {
    path: req.path,
    method: req.method,
    requestId: req.id,
  });
  
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id,
  });
});
```

### Dashboard Service

```typescript
// services/dashboard/src/server.ts
import { initSentry } from '@tiltcheck/monitoring';
import { createMetricsCollector } from '@tiltcheck/monitoring/metrics';

initSentry('dashboard');
const metrics = createMetricsCollector('dashboard');

// Track dashboard metrics
setInterval(() => {
  metrics.gauge('events.count', eventStore.size());
  metrics.gauge('alerts.active', activeAlerts.length);
  metrics.flush();
}, 30000);
```

## API Reference

### Sentry Module

```typescript
import { initSentry, captureException, captureMessage, setUser, clearUser } from '@tiltcheck/monitoring/sentry';

// Initialize Sentry
initSentry(serviceName: string): void

// Capture an exception
captureException(error: Error, context?: Record<string, any>): void

// Capture a message
captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void

// Set user context
setUser(userId: string, additional?: Record<string, any>): void

// Clear user context
clearUser(): void
```

### Metrics Module

```typescript
import { MetricsCollector, createMetricsCollector } from '@tiltcheck/monitoring/metrics';

// Create metrics collector
const metrics = createMetricsCollector(serviceName: string): MetricsCollector

// Increment a counter
metrics.increment(metric: string, value?: number): void

// Set a gauge value
metrics.gauge(metric: string, value: number): void

// Record a timing
metrics.timing(metric: string, duration: number): void

// Flush metrics to endpoint
await metrics.flush(): Promise<void>

// Get current metrics snapshot
metrics.getMetrics(): Record<string, number>
```

### Logflare Module

```typescript
import { sendToLogflare, createLogflareLogger, BatchLogSender } from '@tiltcheck/monitoring/logflare';

// Send a log event
await sendToLogflare(event: LogEvent): Promise<void>

// Create service logger
const logger = createLogflareLogger(serviceName: string)
logger.info('message', { metadata })
logger.error('error message', { error, context })

// Batch log sender
const batchSender = new BatchLogSender(batchSize?, flushIntervalMs?)
batchSender.add(event)
await batchSender.flush()
batchSender.stop()
```

### Correlation ID Module

```typescript
import { 
  correlationIdMiddleware,
  attachCorrelationId,
  extractCorrelationId 
} from '@tiltcheck/monitoring/correlation-id';

// Express middleware
app.use(correlationIdMiddleware(options?))

// Attach to outgoing requests
const headers = attachCorrelationId(correlationId: string)

// Extract from headers
const id = extractCorrelationId(headers: Record<string, string>)
```

## Best Practices

### 1. Initialize Early

Initialize monitoring at the very beginning of your service, before any other code:

```typescript
import { initSentry } from '@tiltcheck/monitoring';

// FIRST thing in your main file
initSentry('my-service');

// Then import and initialize other modules
import { client } from './bot';
```

### 2. Add Context to Errors

Always include relevant context when capturing errors:

```typescript
captureException(error, {
  userId: '12345',
  action: 'tip_command',
  amount: 0.1,
  recipient: '67890',
});
```

### 3. Don't Leak Sensitive Data

Be careful not to include sensitive information in error context:

```typescript
// ❌ BAD - includes sensitive data
captureException(error, {
  password: userPassword,
  privateKey: wallet.privateKey,
});

// ✅ GOOD - sanitized context
captureException(error, {
  userId: user.id,
  action: 'authentication',
  // Don't include actual credentials
});
```

### 4. Flush Metrics Regularly

Set up automatic metric flushing:

```typescript
const metrics = createMetricsCollector('my-service');

// Flush every 30 seconds
const flushInterval = setInterval(() => {
  metrics.flush();
}, 30000);

// Clean up on shutdown
process.on('SIGTERM', () => {
  clearInterval(flushInterval);
  metrics.flush(); // Final flush
});
```

### 5. Use Correlation IDs

For Express services, always use correlation ID middleware to enable request tracing:

```typescript
import { correlationIdMiddleware } from '@tiltcheck/monitoring/correlation-id';

// Add early in middleware chain
app.use(correlationIdMiddleware());

// Now all requests have req.id
app.get('/api/endpoint', (req, res) => {
  console.log('Handling request:', req.id);
  // Pass to downstream services
});
```

## Troubleshooting

### Sentry not reporting errors

1. Check that `SENTRY_DSN` is set in your environment
2. Verify `initSentry()` is called before any error-prone code
3. Check Sentry dashboard for rejected events
4. Ensure network connectivity to Sentry

### Metrics not being sent

1. Verify `METRICS_ENDPOINT` is configured
2. Check that `flush()` is being called (not just collected)
3. Look for network errors in logs
4. Ensure metrics endpoint is accessible

### Correlation IDs not working

1. Ensure middleware is added before route handlers
2. Check that Express types are installed (`@types/express`)
3. Verify requests include `x-correlation-id` header

## Development

### Running Tests

```bash
pnpm test
```

### Building

```bash
pnpm build
```

### Type Checking

```bash
pnpm exec tsc --noEmit
```

## Contributing

This is an internal TiltCheck package. See main repository CONTRIBUTING.md for guidelines.

## License

UNLICENSED - Internal use only
