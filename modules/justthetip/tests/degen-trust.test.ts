import { describe, it, expect } from 'vitest';
import { justthetip } from '../src/index';
import { eventRouter } from '@tiltcheck/event-router';

describe('JustTheTip degen trust events', () => {
  it('emits trust.degen.updated alongside casino trust on tip completion', async () => {
    eventRouter.clearHistory();
    await justthetip.registerWallet('senderDegen', 'SenderWalletAddr', 'phantom');
    await justthetip.registerWallet('recipientDegen', 'RecipientWalletAddr', 'magic');
    const tip = await justthetip.initiateTip('senderDegen', 'recipientDegen', 2.00);
    await justthetip.completeTip(tip.id, 'SigDegen');
    const casinoEvents = eventRouter.getHistory({ eventType: 'trust.casino.updated' });
    const degenEvents = eventRouter.getHistory({ eventType: 'trust.degen.updated' });
    expect(casinoEvents.length).toBeGreaterThanOrEqual(2);
    expect(degenEvents.length).toBeGreaterThanOrEqual(2);
    const senderDegenEvt = degenEvents.map(e => e.data as any).find(p => p.userId === 'senderDegen');
    const recipientDegenEvt = degenEvents.map(e => e.data as any).find(p => p.userId === 'recipientDegen');
    expect(senderDegenEvt?.delta).toBe(1);
    expect(recipientDegenEvt?.delta).toBe(2);
  });
});
