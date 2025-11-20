import { describe, it, expect } from 'vitest';
import { dashboardState, pushEvent } from '../src/state';

describe('domain anomaly detection', () => {
  it('flags a domain-anomaly after baseline established', () => {
    const domain = 'anomaly.example';
    // Establish baseline with small negative deltas (severity below anomaly threshold)
    for (let i = 0; i < 6; i++) {
      pushEvent({
        id: 'base' + i,
        type: 'trust.domain.updated',
        timestamp: Date.now(),
        source: 'suslink',
        data: { domain, delta: -5 - (i % 2), severity: 2, reason: 'baseline' }
      });
    }
    const before = dashboardState.riskAlerts.filter(a => a.kind === 'domain-anomaly' && a.entity === domain).length;
    // Outlier with large negative delta and sufficient severity
    pushEvent({
      id: 'outlier1',
      type: 'trust.domain.updated',
      timestamp: Date.now(),
      source: 'suslink',
      data: { domain, delta: -60, severity: 4, reason: 'sudden-drop' }
    });
    const after = dashboardState.riskAlerts.filter(a => a.kind === 'domain-anomaly' && a.entity === domain).length;
    expect(after).toBe(before + 1);
    // Second similar outlier should not duplicate alert
    pushEvent({
      id: 'outlier2',
      type: 'trust.domain.updated',
      timestamp: Date.now(),
      source: 'suslink',
      data: { domain, delta: -70, severity: 4, reason: 'continued-drop' }
    });
    const final = dashboardState.riskAlerts.filter(a => a.kind === 'domain-anomaly' && a.entity === domain).length;
    expect(final).toBe(after); // no duplicate
  });
  it('does not flag anomaly without sufficient baseline', () => {
    const domain = 'shortbaseline.example';
    const before = dashboardState.riskAlerts.filter(a => a.kind === 'domain-anomaly' && a.entity === domain).length;
    // Fewer than required baseline events (<5)
    for (let i = 0; i < 3; i++) {
      pushEvent({
        id: 'pre' + i,
        type: 'trust.domain.updated',
        timestamp: Date.now(),
        source: 'suslink',
        data: { domain, delta: -4, severity: 2, reason: 'baseline' }
      });
    }
    // Large drop but before baseline threshold
    pushEvent({
      id: 'premature-outlier',
      type: 'trust.domain.updated',
      timestamp: Date.now(),
      source: 'suslink',
      data: { domain, delta: -80, severity: 5, reason: 'huge-drop' }
    });
    const after = dashboardState.riskAlerts.filter(a => a.kind === 'domain-anomaly' && a.entity === domain).length;
    expect(after).toBe(before); // still no anomaly alert
  });
});
