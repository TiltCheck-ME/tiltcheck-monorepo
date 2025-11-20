import { describe, it, expect } from 'vitest';
import { addRiskAlert, dashboardState } from '../src/state';

describe('risk alerts', () => {
  it('adds domain-delta alert when threshold met', () => {
    const before = dashboardState.riskAlerts.length;
    addRiskAlert({ kind: 'domain-delta', entity: 'evil.example', totalDelta: -45, firstSeenTs: Date.now() });
    expect(dashboardState.riskAlerts.length).toBe(before + 1);
  });
  it('avoids duplicates', () => {
    const before = dashboardState.riskAlerts.length;
    addRiskAlert({ kind: 'domain-delta', entity: 'evil.example', totalDelta: -50, firstSeenTs: Date.now() });
    expect(dashboardState.riskAlerts.length).toBe(before); // duplicate not added
  });
});
