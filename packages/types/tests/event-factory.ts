// Test event factory utilities for TiltCheck
import type { TiltCheckEvent, EventType, ModuleId } from '../src/index.js';

export function makeEvent<T = any>(type: EventType, source: ModuleId, data: T, userId?: string): TiltCheckEvent<T> {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    type,
    timestamp: Date.now(),
    source,
    userId,
    data,
    metadata: {},
  };
}

// Example: makeEvent('tip.completed', 'justthetip', { amount: 1, token: 'SOL' }, 'user-1')