import { describe, it, expect, beforeEach } from 'vitest';
import { justthetip, JustTheTipModule } from '../src/index';
import { eventRouter } from '@tiltcheck/event-router';

// Reinstantiate module for isolation (avoid state bleed from singleton in this test file)
let moduleInstance: JustTheTipModule;

describe('JustTheTipModule - Jupiter Swap Integration (Stub)', () => {
  beforeEach(() => {
    moduleInstance = new JustTheTipModule();
    eventRouter.clearHistory();
    // Register sender & recipient wallets
    moduleInstance.registerWallet('senderSwap', 'senderWalletAddress', 'phantom');
    moduleInstance.registerWallet('recipientSwap', 'recipientWalletAddress', 'magic');
  });

  it('generates a swap quote and publishes swap.quote event', async () => {
    const { quote } = await moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 10, 'USDC'); // $10 USDC
    expect(quote.inputMint).toBe('USDC');
    expect(quote.outputMint).toBe('SOL');
    expect(quote.inputAmount).toBe(10);
    expect(quote.estimatedOutputAmount).toBeGreaterThan(0);

    const history = eventRouter.getHistory({ eventType: 'swap.quote' });
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].data.inputMint).toBe('USDC');
  });

  it('creates a token tip with swap metadata', async () => {
    const { tip } = await moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 5, 'USDC'); // $5

    expect(tip.originalMint).toBe('USDC');
    expect(tip.originalAmount).toBe(5);
    expect(tip.swapRate).toBeGreaterThan(0);
    expect(tip.solAmount).toBeGreaterThan(0);
    // tip should be stored in module
    const stored = moduleInstance.getTipsForUser('senderSwap');
    expect(stored.find(t => t.id === tip.id)).toBeDefined();
  });

  it('executes a swap and publishes swap.completed event', async () => {
    const { quote } = await moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 2, 'USDC');
    const execution = await moduleInstance.executeSwap('senderSwap', quote.id);

    expect(execution.status).toBe('completed');
    expect(execution.quote.inputMint).toBe('USDC');
    expect(execution.txId).toBeDefined();

    const completedEvents = eventRouter.getHistory({ eventType: 'swap.completed' });
    expect(completedEvents.length).toBeGreaterThan(0);
    expect(completedEvents[0].data.quote.id).toBe(quote.id);
  });

  it('rejects unsupported tokens', async () => {
    await expect(
      moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 1, 'UNKNOWN')
    ).rejects.toThrow('Unsupported token');
  });

  it('enforces USD min/max via token conversion', async () => {
    // Too small: BONK tiny amount (< $0.10 USD)
    await expect(
      moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 1000, 'BONK')
    ).rejects.toThrow('USD equivalent must be between');

    // Too large: WBTC amount that exceeds $100 limit
    await expect(
      moduleInstance.initiateTokenTip('senderSwap', 'recipientSwap', 0.01, 'WBTC')
    ).rejects.toThrow('USD equivalent must be between');
  });
});
