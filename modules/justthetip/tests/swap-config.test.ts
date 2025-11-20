import { describe, it, expect, beforeEach } from 'vitest';
import { JustTheTipModule } from '../src/index';
import { swapDefaults } from '../src/config';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { eventRouter } from '@tiltcheck/event-router';

let mod: JustTheTipModule;

describe('JustTheTip swap config defaults', () => {
  beforeEach(() => {
    mod = new JustTheTipModule();
    eventRouter.clearHistory();
    pricingOracle.setUsdPrice('SOL', 200);
    pricingOracle.setUsdPrice('USDC', 1);
    mod.registerWallet('senderCfg', 'senderWalletCfg', 'phantom');
    mod.registerWallet('recipientCfg', 'recipientWalletCfg', 'magic');
  });

  it('applies config defaults when opts not provided', async () => {
    const { quote } = await mod.initiateTokenTip('senderCfg', 'recipientCfg', 10, 'USDC');
    expect(quote.slippageBps).toBe(swapDefaults.slippageBps);
    expect(quote.platformFeeBps).toBe(swapDefaults.platformFeeBps);
    expect(quote.networkFeeLamports).toBe(swapDefaults.networkFeeLamports);
  });

  it('overrides config defaults with provided opts', async () => {
    const { quote } = await mod.initiateTokenTip('senderCfg', 'recipientCfg', 10, 'USDC', {
      slippageBps: swapDefaults.slippageBps + 10,
      platformFeeBps: swapDefaults.platformFeeBps + 5,
      networkFeeLamports: swapDefaults.networkFeeLamports + 1000,
    });
    expect(quote.slippageBps).toBe(swapDefaults.slippageBps + 10);
    expect(quote.platformFeeBps).toBe(swapDefaults.platformFeeBps + 5);
    expect(quote.networkFeeLamports).toBe(swapDefaults.networkFeeLamports + 1000);
  });
});
