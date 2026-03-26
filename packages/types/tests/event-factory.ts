/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// Test event factory utilities for TiltCheck
import type { TiltCheckEvent, EventType, ModuleId } from '../src/index.js';

export function makeEvent<K extends EventType>(type: K, source: ModuleId, data: K extends keyof EventDataMap ? EventDataMap[K] : unknown, userId?: string): TiltCheckEvent<K> {
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