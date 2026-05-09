// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09

import { describe, expect, it } from 'vitest';
import { MockEventRouter } from '../src/index.js';

describe('@tiltcheck/test-utils', () => {
  it('exports MockEventRouter for dependent test suites', () => {
    const router = new MockEventRouter();
    expect(router.publish).toBeDefined();
    expect(router.publishedEvents).toEqual([]);
  });
});
