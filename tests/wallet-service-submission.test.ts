/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */

import { beforeEach, describe, expect, it } from 'vitest';
import { eventRouter } from '@tiltcheck/event-router';
import { WalletService as DiscordWalletService } from '../apps/discord-bot/src/services/tipping/wallet-service.js';
import { WalletService as JustTheTipWalletService } from '../apps/justthetip-bot/src/services/tipping/wallet-service.js';

type WalletServiceFactory = {
  label: string;
  create: () => DiscordWalletService | JustTheTipWalletService;
};

const factories: WalletServiceFactory[] = [
  {
    label: 'discord-bot',
    create: () => new DiscordWalletService(),
  },
  {
    label: 'justthetip-bot',
    create: () => new JustTheTipWalletService(),
  },
];

describe.each(factories)('$label wallet-service submission gating', ({ create }) => {
  beforeEach(() => {
    eventRouter.clearHistory();
  });

  it('keeps signed user tips execution-pending without fake submission artifacts', async () => {
    const walletService = create();

    await walletService.registerWallet('sender', 'SENDER_ADDRESS', 'x402');
    await walletService.registerWallet('recipient', 'RECIPIENT_ADDRESS', 'phantom');
    const tx = await walletService.createTipTransaction('sender', 'recipient', 5);
    await walletService.approveTransaction(tx.id, 'sender');

    eventRouter.clearHistory();
    await walletService.submitSignedTransaction(tx.id, 'REAL_USER_SIGNATURE');

    const updatedTx = walletService.getTransaction(tx.id);
    expect(updatedTx?.status).toBe('execution-pending');
    expect(updatedTx?.signature).toBe('REAL_USER_SIGNATURE');
    expect(updatedTx?.transactionHash).toBeUndefined();
    expect(updatedTx?.explorerUrl).toBeUndefined();
    expect(updatedTx?.metadata?.execution).toMatchObject({
      state: 'disabled',
      stage: 'user-submission',
    });
    expect(walletService.getUserTransactionReceipts('sender')).toEqual([]);

    const emittedTypes = eventRouter.getHistory().map((event) => event.type);
    expect(emittedTypes).toContain('transaction.failed');
    expect(emittedTypes).not.toContain('transaction.submitted');
    expect(emittedTypes).not.toContain('transaction.confirmed');
  });

  it('keeps treasury withdrawals execution-pending without fabricated treasury signatures', async () => {
    const walletService = create();

    await walletService.registerWallet('user123', 'USER_ADDRESS', 'x402');

    eventRouter.clearHistory();
    const tx = await walletService.createWithdrawalTransaction('user123', 25);

    expect(tx.status).toBe('execution-pending');
    expect(tx.approvedAt).toBeTypeOf('number');
    expect(tx.signature).toBeUndefined();
    expect(tx.transactionHash).toBeUndefined();
    expect(tx.explorerUrl).toBeUndefined();
    expect(tx.metadata?.execution).toMatchObject({
      state: 'disabled',
      stage: 'treasury-submission',
    });
    expect(walletService.getUserTransactionReceipts('user123')).toEqual([]);

    const emittedTypes = eventRouter.getHistory().map((event) => event.type);
    expect(emittedTypes).toContain('transaction.created');
    expect(emittedTypes).toContain('transaction.failed');
    expect(emittedTypes).not.toContain('transaction.submitted');
    expect(emittedTypes).not.toContain('transaction.confirmed');
  });
});
