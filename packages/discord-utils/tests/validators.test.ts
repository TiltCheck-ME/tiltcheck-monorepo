import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  isValidUserId,
  isValidChannelId,
  isValidRoleId,
  isValidAmount,
  sanitizeInput,
  isKnownCasino,
  extractUrls,
  containsMentions,
  validateArgs,
} from '../src/validators.js';

describe('discord-utils/validators', () => {
  it('validates urls', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('validates discord ids', () => {
    const id = '12345678901234567';
    expect(isValidUserId(id)).toBe(true);
    expect(isValidChannelId(id)).toBe(true);
    expect(isValidRoleId(id)).toBe(true);
    expect(isValidUserId('short')).toBe(false);
  });

  it('parses and bounds amounts', () => {
    expect(isValidAmount('10', 5, 20)).toEqual({ valid: true, value: 10 });
    expect(isValidAmount('x', 0, 10).valid).toBe(false);
    expect(isValidAmount('1', 5).valid).toBe(false);
    expect(isValidAmount('100', 0, 50).valid).toBe(false);
  });

  it('sanitizes input and disables everyone/here', () => {
    const s = sanitizeInput('**hi** @_ here @everyone');
    expect(s.includes('*')).toBe(false);
    expect(s).toContain('@ everyone');
  });

  it('detects known casinos', () => {
    expect(isKnownCasino('https://stake.com')).toBe(true);
    expect(isKnownCasino('https://unknown.example')).toBe(false);
  });

  it('extracts urls and detects mentions', () => {
    const text = 'check https://a.com and <@123> and @here';
    expect(extractUrls(text)).toContain('https://a.com');
    expect(containsMentions(text)).toBe(true);
  });

  it('validates arg counts', () => {
    expect(validateArgs(['a', 'b'], 1, 2).valid).toBe(true);
    expect(validateArgs(['a'], 2).valid).toBe(false);
    expect(validateArgs(['a', 'b', 'c'], 1, 2).valid).toBe(false);
  });
});
