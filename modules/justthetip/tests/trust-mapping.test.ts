/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect } from 'vitest';
import { justthetip } from '../src/index.js';
import { eventRouter } from '@tiltcheck/event-router';

describe('JustTheTip trust mapping', () => {
  it('emits trust.casino.updated events on tip completion', async () => {
    eventRouter.clearHistory();
    await justthetip.registerWallet('sender', 'SenderWalletAddress', 'phantom');
    await justthetip.registerWallet('recipient', 'RecipientWalletAddress', 'magic');
    const tip = await justthetip.initiateTip('sender', 'recipient', 1.00);
    await justthetip.completeTip(tip.id, 'TestSignature');
    const trustEvents = eventRouter.getHistory({ eventType: 'trust.casino.updated' });
    expect(trustEvents.length).toBeGreaterThanOrEqual(2); // sender + recipient
    const payloads = trustEvents.map((e: any) => e.data as any);
    const senderEvt = payloads.find((p: any) => p.metadata?.userId === 'sender');
    const recipientEvt = payloads.find((p: any) => p.metadata?.userId === 'recipient');
    expect(senderEvt?.delta).toBe(1);
    expect(recipientEvt?.delta).toBe(2);
  });
});
