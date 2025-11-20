# CollectClock Module

This module provides the `CollectClockModule` class for tracking bonus events in the TiltCheck ecosystem. It is event-driven, modular, and ready for migration and expansion.

## API

### `CollectClockModule`
- `constructor()`
  - Subscribes to `bonus.earned` events and binds the handler.

## Event Flow
- On `bonus.earned`, the module logs the event as a placeholder for future bonus tracking and notification logic.

## Usage
```ts
import { collectclock } from './src/index';
// Bonus events are handled automatically via EventRouter subscription
```

## Migration Notes
- All logic is placeholder; replace with real bonus tracking and notification flows as code is migrated.
- Non-custodial flow enforced—no funds are held by the module.

## Test Coverage
- Minimal smoke test ensures event subscription and constructibility.
- Ready for expansion as real bonus logic is added.

---
TiltCheck Ecosystem © 2024–2025. For architecture and migration details, see `/docs/tiltcheck/`.
