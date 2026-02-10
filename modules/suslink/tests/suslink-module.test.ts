import { describe, it, expect, beforeEach } from 'vitest';
import { SusLinkModule } from '../src/suslink.js';
import { eventRouter } from '@tiltcheck/event-router';

describe('SusLinkModule', () => {
  let module: SusLinkModule;

  beforeEach(() => {
    module = new SusLinkModule();
    eventRouter.clearHistory();
  });

  it('publishes link.scanned for scanUrl', async () => {
    const url = 'https://example.com';
    await module.scanUrl(url, 'user-1');
    const history = eventRouter.getHistory({ eventType: 'link.scanned' });
    expect(history.length).toBe(1);
    expect(history[0].data.url).toBe(url);
    expect(history[0].userId).toBe('user-1');
  });

  it('publishes link.flagged for risky URL (via promo.submitted)', async () => {
    const url = 'https://stake-free.xyz/free-money';
    await eventRouter.publish('promo.submitted', 'test-suite', { url }, 'user-2');
    await new Promise((r) => setTimeout(r, 0));
    const flagged = eventRouter.getHistory({ eventType: 'link.flagged' });
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    const last = flagged[flagged.length - 1];
    expect(last.data.url).toBe(url);
    expect(['high', 'critical']).toContain(last.data.riskLevel);
    expect(last.userId).toBe('user-2');
  });
});