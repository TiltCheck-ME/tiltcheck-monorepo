import { describe, it, expect } from 'vitest';
import { formatSnapshotSummary } from '../src/trust-consumer.js';

describe('FreeSpinsChannelBot snapshot formatter', () => {
  it('formats worst domains and top casinos', () => {
    const summary = formatSnapshotSummary({
      windowStart: Date.now(),
      domainAgg: {
        evil: { totalDelta: -40, events: 2 },
        meh: { totalDelta: -5, events: 1 },
        neutral: { totalDelta: 0, events: 1 },
        badish: { totalDelta: -15, events: 1 },
      },
      casinoAgg: {
        casinoA: { totalDelta: 10, events: 2 },
        casinoB: { totalDelta: -3, events: 1 },
        casinoC: { totalDelta: 25, events: 3 },
      }
    });
    expect(summary).toContain('worstDomains: evil(-40)');
    expect(summary).toContain('topCasinos: casinoC(+25)');
  });
});