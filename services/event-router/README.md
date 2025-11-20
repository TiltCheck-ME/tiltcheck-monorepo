# Event Router

The **Event Router** is the central nervous system of the TiltCheck ecosystem. All modules communicate through events, not direct function calls. This keeps modules independent and prevents tight coupling.

## Core Philosophy

1. **Loose Coupling** — Modules never call each other directly
2. **Async First** — All event handlers are async-safe
3. **Fault Tolerant** — One failing handler doesn't crash the system
4. **Observable** — Event history for debugging and monitoring
5. **Simple** — Easy to understand, test, and extend

---

## How It Works

### Publishing Events

Modules publish events when something happens:

```typescript
import { eventRouter } from '@tiltcheck/event-router';

// JustTheTip publishes when a tip completes
await eventRouter.publish(
  'tip.completed',
  'justthetip',
  {
    fromUser: '123',
    toUser: '456',
    amount: 1.0,
    token: 'SOL',
    txSignature: 'abc...'
  },
  '123' // userId
);
```

### Subscribing to Events

Modules subscribe to events they care about:

```typescript
import { eventRouter } from '@tiltcheck/event-router';

// Trust Engine subscribes to tip events
eventRouter.subscribe(
  'tip.completed',
  async (event) => {
    console.log('Tip completed:', event.data);
    // Update trust score based on tipping behavior
    await updateDegenTrust(event.userId, +2);
  },
  'trust-engine-degen'
);
```

---

## Event Types

All event types are defined in `@tiltcheck/types`:

### Financial Events
- `tip.requested`
- `tip.completed`
- `tip.failed`
- `airdrop.requested`
- `airdrop.completed`
- `swap.requested`
- `swap.completed`

### Link Scanning Events
- `link.scanned`
- `link.flagged`

### Promo Events
- `promo.submitted`
- `promo.approved`
- `promo.denied`

### Bonus Events
- `bonus.logged`
- `bonus.nerfed`

### Trust Events
- `trust.casino.updated`
- `trust.degen.updated`

### Tilt Events
- `tilt.detected`
- `tilt.cooldown.requested`

### Survey & Game Events
- `survey.matched`
- `game.started`
- `game.completed`

---

## Usage Example

### Complete Flow: Link Scanning → Trust Update

```typescript
// In FreeSpinScan module
import { eventRouter } from '@tiltcheck/event-router';

async function submitPromo(url: string, userId: string) {
  // Publish that a link needs scanning
  await eventRouter.publish(
    'link.scanned',
    'freespinscan',
    { url, userId },
    userId
  );
}

// In SusLink module
eventRouter.subscribe(
  'link.scanned',
  async (event) => {
    const { url, userId } = event.data;
    
    // Scan the link
    const result = await scanLink(url);
    
    // If risky, flag it
    if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
      await eventRouter.publish(
        'link.flagged',
        'suslink',
        { url, riskLevel: result.riskLevel, reason: result.reason },
        userId
      );
    }
  },
  'suslink'
);

// In Casino Trust Engine
eventRouter.subscribe(
  'link.flagged',
  async (event) => {
    const { url, riskLevel } = event.data;
    
    // If it's a casino domain, lower trust
    const casino = extractCasino(url);
    if (casino) {
      await updateCasinoTrust(casino, -5, 'Flagged risky link');
    }
  },
  'trust-engine-casino'
);
```

---

## Benefits

### 1. **Modules Stay Independent**
Each module can be developed, tested, and deployed separately.

### 2. **Easy to Add New Modules**
New modules just subscribe to events — no refactoring needed.

### 3. **Observable System**
Event history lets you debug issues and understand system flow.

### 4. **Scalable**
Events can be routed to queues (Cloudflare Queues, Redis, etc.) for async processing.

### 5. **Testable**
Mock the event router to test modules in isolation.

---

## API Reference

### `eventRouter.publish(type, source, data, userId?, metadata?)`

Publish an event to all subscribers.

**Parameters:**
- `type` — Event type from `EventType`
- `source` — Module publishing the event
- `data` — Event payload
- `userId` — Optional user ID
- `metadata` — Optional metadata

### `eventRouter.subscribe(type, handler, moduleId)`

Subscribe to an event type.

**Parameters:**
- `type` — Event type to listen for
- `handler` — Async function that handles the event
- `moduleId` — ID of the subscribing module

**Returns:** Unsubscribe function

### `eventRouter.getHistory(filter?)`

Get event history with optional filtering.

**Filter options:**
- `eventType` — Filter by event type
- `source` — Filter by source module
- `userId` — Filter by user
- `limit` — Max number of events

### `eventRouter.getStats()`

Get router statistics (subscriptions, history size, etc.)

---

## Future Enhancements

- **Persistent Queue** — Store events in database/queue for reliability
- **Dead Letter Queue** — Capture failed events for retry
- **Rate Limiting** — Prevent event spam
- **Event Replay** — Replay events for debugging
- **Metrics** — Track event volumes and handler performance

---

## Built for TiltCheck

The Event Router follows TiltCheck principles:

- **Simple** — Easy to understand
- **Cheap** — No external dependencies required
- **Modular** — Perfect for independent module development
- **Degen-Friendly** — Practical, not over-engineered

---

**TiltCheck Event Router — Making modules talk without talking.**
