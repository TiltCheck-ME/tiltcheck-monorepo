import { describe, it, expect } from 'vitest';
import { autoFilter } from '../src/index.js';

describe('triviadrops autoFilter', () => {
  it('approves clean questions', () => {
    const candidate = { text: 'What is RTP?', explanation: 'Return to Player explained.' };
    const result = autoFilter(candidate);
    expect(result.isSafe).toBe(true);
    expect(result.recommendation).toBe('approve');
  });

  it('flags profanity and recommends review or reject', () => {
    const candidate = { text: 'This is fucked up', explanation: 'Contains bad word.' };
    const result = autoFilter(candidate);
    expect(result.flaggedTerms.length).toBeGreaterThan(0);
    expect(['review','reject']).toContain(result.recommendation);
  });
});
