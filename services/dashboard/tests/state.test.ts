import { describe, it, expect } from 'vitest';
import { dashboardState, pushEvent, getSparklineData } from '../src/state';

describe('dashboard state', () => {
  it('increments severity buckets', () => {
    const before = { ...dashboardState.severityBuckets };
    pushEvent({ id: '1', type: 'trust.domain.updated', timestamp: Date.now(), source: 'suslink', data: { domain: 'x', delta: -10, severity: 3, reason: 'risk:suspicious' } });
    expect(dashboardState.severityBuckets[3]).toBe(before[3] + 1);
    expect(dashboardState.events.length).toBeGreaterThan(0);
  });
  it('records sparkline data for domain', () => {
    for (let i=0;i<6;i++) {
      pushEvent({ id: 'd'+i, type: 'trust.domain.updated', timestamp: Date.now(), source: 'suslink', data: { domain: 'spark.example', delta: i-3, severity: 2, reason: 'risk:safe' } });
    }
    const spark = getSparklineData();
    const target = spark.domains.find(d => d.entity === 'spark.example');
    expect(target).toBeTruthy();
    expect(target!.deltas.length).toBeGreaterThanOrEqual(6);
  });
});
