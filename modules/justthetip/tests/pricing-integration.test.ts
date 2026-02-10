import { describe, it, expect, beforeEach } from 'vitest';
import { JustTheTipModule } from '../src/index.js';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { eventRouter } from '@tiltcheck/event-router';
import { clearWallets } from '../src/wallet-manager.js';

describe('JustTheTip Pricing Integration', () => {
  let mod: JustTheTipModule;

  beforeEach(() => {
    clearWallets(); // Clear wallets from previous tests
    mod = new JustTheTipModule();
    eventRouter.clearHistory();
    pricingOracle.setUsdPrice('SOL', 200);
    pricingOracle.setUsdPrice('USDC', 1);
    mod.registerWallet('sender', 'senderWallet', 'phantom');
    mod.registerWallet('recipient', 'recipientWallet', 'magic');
  });

  it('uses oracle SOL price to compute solAmount for USD tip', async () => {
    const tip = await mod.initiateTip('sender', 'recipient', 20, 'USD'); // $20
    // SOL price 200 => 0.10 SOL
    expect(tip.solAmount).toBeCloseTo(0.1);

    // Change SOL price
    pricingOracle.setUsdPrice('SOL', 250);
    const tip2 = await mod.initiateTip('sender', 'recipient', 20, 'USD');
    // SOL price 250 => 0.08 SOL
    expect(tip2.solAmount).toBeCloseTo(0.08);
  });

  it('reflects oracle price changes in token tipping swap quote', async () => {
    const { tip } = await mod.initiateTokenTip('sender', 'recipient', 10, 'USDC'); // $10
    expect(tip.solAmount).toBeCloseTo(0.05); // 10 / 200

    pricingOracle.setUsdPrice('SOL', 250);
    const { tip: tip2 } = await mod.initiateTokenTip('sender', 'recipient', 10, 'USDC');
    expect(tip2.solAmount).toBeCloseTo(0.04); // 10 / 250
  });
});
