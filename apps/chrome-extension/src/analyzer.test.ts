/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Analyzer } from './analyzer.js';

// Mock the FairnessService to avoid crypto dependencies in DOM tests
vi.mock('../../../packages/utils/src/FairnessService', () => {
  return {
    FairnessService: class {
      async generateHash() { return 'mocked-hash'; }
      hashToFloat() { return 0.5; }
    }
  };
});

describe('Analyzer', () => {
  let analyzer: Analyzer;

  beforeEach(() => {
    // Clean up DOM before each test
    document.body.innerHTML = '';
    analyzer = new Analyzer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve immediately if the element already exists', async () => {
    // Setup DOM
    const div = document.createElement('div');
    div.id = 'result-display';
    div.setAttribute('data-value', '100.00');
    document.body.appendChild(div);

    const parser = (el: Element) => ({ value: parseFloat(el.getAttribute('data-value') || '0') });

    const result = await analyzer.waitForResult('#result-display', parser);
    
    expect(result.value).toBe(100.00);
  });

  it('should wait for MutationObserver to detect a new element', async () => {
    const parser = (el: Element) => ({ value: 42 });
    
    // Start waiting (promise is pending)
    const resultPromise = analyzer.waitForResult('.dynamic-result', parser);

    // Simulate async DOM update
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'dynamic-result';
      document.body.appendChild(div);
    }, 50);

    const result = await resultPromise;
    expect(result.value).toBe(42);
  });

  it('should timeout if the element never appears', async () => {
    const parser = (el: Element) => ({ value: 0 });
    
    // Set a short timeout for testing
    await expect(analyzer.waitForResult('.non-existent', parser, 100))
      .rejects
      .toThrow('Timeout waiting for game result');
  });

  it('should verify a result correctly', async () => {
    const mockCommitment = {
      blockHash: 'solana-hash',
      discordId: 'user-123',
      clientSeed: 'seed-abc'
    };

    const result = {
      value: 0.5, // Matches the mocked hashToFloat return
      rawHash: 'mocked-hash' // Matches the mocked generateHash return
    };

    const verification = await analyzer.verify(result, mockCommitment);
    
    expect(verification.isValid).toBe(true);
    expect(verification.expectedHash).toBe('mocked-hash');
  });
});
