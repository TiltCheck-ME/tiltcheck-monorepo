/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect } from 'vitest';
import {
  formatUrl,
  formatTimestamp,
  formatCurrency,
  formatPercentage,
  createProgressBar,
  truncate,
  bulletList,
  numberedList,
  mentionUser,
  mentionChannel,
  mentionRole,
  codeBlock,
  inlineCode,
  bold,
  italic,
  underline,
  strikethrough,
  quote,
  spoiler,
} from '../src/formatters.js';

describe('discord-utils/formatters', () => {
  it('formatUrl truncates long urls', () => {
    const long = 'https://example.com/' + 'a'.repeat(100);
    const out = formatUrl(long, 20);
    expect(out.endsWith('...')).toBe(true);
    expect(out.length).toBe(20);
  });

  it('formatTimestamp creates discord timestamp', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    const out = formatTimestamp(d, 'R');
    expect(out).toMatch(/^<t:\d+:R>$/);
  });

  it('formatCurrency formats USD values', () => {
    const out = formatCurrency(12.5, 'USD');
    expect(out).toMatch(/\$12\.50/);
  });

  it('formatPercentage respects decimals', () => {
    expect(formatPercentage(12.3456, 2)).toBe('12.35%');
  });

  it('createProgressBar reflects current vs total', () => {
    const bar = createProgressBar(5, 10, 10, '#', '-');
    expect(bar).toBe('#####-----');
    expect(createProgressBar(0, 10)).toHaveLength(10);
    expect(createProgressBar(10, 10)).toHaveLength(10);
  });

  it('truncate short-circuits when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('lists and mentions and styles', () => {
    expect(bulletList(['a', 'b'])).toBe('• a\n• b');
    expect(numberedList(['a', 'b'])).toBe('1. a\n2. b');
    expect(mentionUser('123')).toBe('<@123>');
    expect(mentionChannel('456')).toBe('<#456>');
    expect(mentionRole('789')).toBe('<@&789>');
    expect(codeBlock('x', 'ts')).toBe('```ts\nx\n```');
    expect(inlineCode('y')).toBe('`y`');
    expect(bold('z')).toBe('**z**');
    expect(italic('z')).toBe('*z*');
    expect(underline('z')).toBe('__z__');
    expect(strikethrough('z')).toBe('~~z~~');
    expect(quote('a\nb')).toBe('> a\n> b');
    expect(spoiler('secret')).toBe('||secret||');
  });
});
