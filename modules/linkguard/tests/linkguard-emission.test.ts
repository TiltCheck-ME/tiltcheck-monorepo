import { describe, it, expect } from 'vitest';
import { emitDomainTrustFromLinkGuard, overrideLinkGuardDomain } from '../src/index';
import { eventRouter } from '@tiltcheck/event-router';

describe('LinkGuard emission helper', () => {
  it('emits trust.domain.updated with negative delta for malicious', async () => {
    eventRouter.clearHistory();
    await emitDomainTrustFromLinkGuard({ domain: 'evil.example', category: 'malicious', actor: 'tester' });
    const events = eventRouter.getHistory({ eventType: 'trust.domain.updated' });
    expect(events.length).toBe(1);
    const evt: any = events[0].data;
    expect(evt.domain).toBe('evil.example');
    expect(evt.delta).toBeLessThan(0);
    expect(evt.source).toBe('linkguard');
    expect(evt.category).toBe('malicious');
  });

  it('skips unknown with zero delta', async () => {
    eventRouter.clearHistory();
    await emitDomainTrustFromLinkGuard({ domain: 'neutral.example', category: 'unknown' });
    const events = eventRouter.getHistory({ eventType: 'trust.domain.updated' });
    expect(events.length).toBe(0);
  });

  it('applies override classification', async () => {
    eventRouter.clearHistory();
    await overrideLinkGuardDomain('override.example', 'unsafe', 'adminUser');
    const events = eventRouter.getHistory({ eventType: 'trust.domain.updated' });
    expect(events.length).toBe(1);
    const evt: any = events[0].data;
    expect(evt.reason).toContain('override:unsafe');
    expect(evt.metadata.actor).toBe('adminUser');
  });
});