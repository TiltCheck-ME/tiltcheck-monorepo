/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { getDiscordLoginUrl } from '../../src/config.ts';

describe('extension auth URL builder', () => {
  it('includes trusted extension opener origin for extension login', () => {
    (globalThis as any).chrome = { runtime: { id: 'abc123extid' } };
    const url = new URL(getDiscordLoginUrl('extension'));

    expect(url.searchParams.get('source')).toBe('extension');
    expect(url.searchParams.get('opener_origin')).toBe('chrome-extension://abc123extid');
  });

  it('does not include opener origin for non-extension source', () => {
    (globalThis as any).chrome = { runtime: { id: 'abc123extid' } };
    const url = new URL(getDiscordLoginUrl('web'));

    expect(url.searchParams.get('source')).toBe('web');
    expect(url.searchParams.get('opener_origin')).toBeNull();
    expect(url.searchParams.get('source_detail')).toBe('web');
  });
});
