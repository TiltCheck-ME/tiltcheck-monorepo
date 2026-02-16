# Implementation Plan - TiltCheck Missing Items

## Overview
This document outlines the implementation plan for completing the missing TODOs identified in the TiltCheck codebase. Based on the requirements from the Implementation Agent and the 134 TODOs found, this plan focuses on the high-priority items.

## Types
No new types needed - using existing TypeScript interfaces.

## Files

### New Files to Create
1. `packages/monitoring/src/logflare.ts` - Implement Logflare integration
2. `packages/monitoring/src/metrics.ts` - Implement metrics collection
3. `packages/monitoring/src/sentry.ts` - Implement Sentry integration
4. `packages/api-response-types/src/index.ts` - Implement API response types
5. `packages/retry-utility/src/index.ts` - Implement retry utility

### Existing Files to Modify

1. **services/telegram-code-ingest/src/telegram-client.ts**
   - Remove TODO comment
   - Implement event-router integration

2. **services/telegram-code-ingest/src/telegram-monitor.ts**
   - Remove TODO comment
   - Implement event-router integration

3. **modules/suslink/src/scanner.ts**
   - Remove TODO comment
   - Enable AI client integration

4. **modules/justthetip/src/tip-engine.ts**
   - Remove TODO comment
   - Implement auto-processing for valid tips

5. **bot/src/handlers/events.ts**
   - Remove TODO comment
   - Implement mod notification system

## Functions

### New Functions to Create

1. **Logflare Integration** (`packages/monitoring/src/logflare.ts`)
   - `sendToLogflare(event: LogEvent)` - Send events to Logflare
   - `flush()` - Flush buffered logs

2. **Metrics Collection** (`packages/monitoring/src/metrics.ts`)
   - `increment(metric: string, value?: number)` - Increment counter
   - `gauge(metric: string, value: number)` - Set gauge value
   - `timing(metric: string, duration: number)` - Record timing
   - `flush()` - Send metrics to endpoint

3. **Sentry Integration** (`packages/monitoring/src/sentry.ts`)
   - `initSentry(serviceName: string)` - Initialize Sentry
   - `captureException(error: Error, context?: Record)` - Capture exception
   - `captureMessage(message: string, level?: string)` - Capture message
   - `setUser(userId: string, additional?: Record)` - Set user context
   - `clearUser()` - Clear user context

4. **Retry Utility** (`packages/retry-utility/src/index.ts`)
   - `withRetry<T>(fn: () => Promise<T>, options?)` - Retry with backoff

5. **API Response Types** (`packages/api-response-types/src/index.ts`)
   - Define response type interfaces

### Functions to Modify

1. **telegram-client.ts**
   - `handleMessage()` - Emit events to event-router

2. **telegram-monitor.ts**
   - `startMonitoring()` - Emit code.detected events

3. **scanner.ts**
   - `scanUrl()` - Use AI client for analysis

4. **tip-engine.ts**
   - `processPendingTips()` - Auto-process valid tips

5. **events.ts**
   - `handleModAction()` - Send mod notifications

## Classes

### New Classes to Create

1. **LogflareClient** (`packages/monitoring/src/logflare.ts`)
   - Methods: send(), flush(), buffer events

2. **MetricsCollector** (`packages/monitoring/src/metrics.ts`)
   - Methods: increment(), gauge(), timing(), flush()
   - Properties: buffer, endpoint, flushInterval

3. **SentryMonitor** (`packages/monitoring/src/sentry.ts`)
   - Methods: init(), captureException(), captureMessage(), setUser(), clearUser()
   - Properties: dsn, environment, serviceName

4. **RetryHandler** (`packages/retry-utility/src/index.ts`)
   - Methods: withRetry(), calculateBackoff()
   - Properties: maxRetries, baseDelay, maxDelay

5. **ApiResponse** (`packages/api-response-types/src/index.ts`)
   - Properties: success, data, error, metadata

## Dependencies

### New Dependencies
- `@sentry/node` - For error tracking
- `logflare` - For log aggregation
- `prom-client` - For metrics collection

### Version Changes
No version changes required - adding new packages only.

## Testing

### Test Files to Create
1. `packages/monitoring/tests/logflare.test.ts`
2. `packages/monitoring/tests/metrics.test.ts`
3. `packages/monitoring/tests/sentry.test.ts`
4. `packages/retry-utility/tests/index.test.ts`

### Test Strategy
- Unit tests for each new function/class
- Integration tests for event-router
- Mock external services (Logflare, Sentry)

## Implementation Order

### Phase 1: Core Infrastructure (Priority: HIGH)
1. Implement `packages/retry-utility/src/index.ts` - Base utility
2. Implement `packages/api-response-types/src/index.ts` - Type definitions
3. Implement `packages/monitoring/src/sentry.ts` - Error tracking

### Phase 2: Monitoring & Logging (Priority: MEDIUM)
4. Implement `packages/monitoring/src/logflare.ts` - Log aggregation
5. Implement `packages/monitoring/src/metrics.ts` - Metrics collection

### Phase 3: Integration (Priority: HIGH)
6. Update `services/telegram-code-ingest/` - Event-router integration
7. Update `modules/suslink/src/scanner.ts` - AI client integration
8. Update `modules/justthetip/src/tip-engine.ts` - Auto-processing
9. Update `bot/src/handlers/events.ts` - Mod notifications

### Phase 4: Testing (Priority: LOW)
10. Add unit tests for all new code
11. Run integration tests
