/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { describe, it, expect } from 'vitest';
import { LinkScanner } from '../src/scanner.js';

describe('LinkScanner extras', () => {
  const scanner = new LinkScanner();

  it('detects impersonation patterns', async () => {
    const res = await scanner.scan('https://stake-free.com/win');
    expect(['suspicious', 'high', 'critical']).toContain(res.riskLevel);
    expect(res.reason).toMatch(/impersonation|High-risk|Suspicious/i);
  });

  it('flags very long URLs', async () => {
    const longPath = 'a'.repeat(210);
    const res = await scanner.scan(`https://example.com/${longPath}`);
    expect(['suspicious', 'high', 'critical']).toContain(res.riskLevel);
    expect(res.reason).toMatch(/long URL/i);
  });

  it('flags suspicious subdomains', async () => {
    const res = await scanner.scan('https://login.bad.host.example.xyz');
    expect(['suspicious', 'high', 'critical']).toContain(res.riskLevel);
    expect(res.reason).toMatch(/subdomain|Multiple subdomains/i);
  });

  it('rejects non-http protocols with graceful reason', async () => {
    const res = await scanner.scan('javascript:alert(1)');
    expect(res.riskLevel).toBe('critical');
    expect(res.reason).toMatch(/http\(s\)/i);
  });

  it('rejects embedded credentials in URL', async () => {
    const res = await scanner.scan('https://user:pass@example.com/login');
    expect(res.riskLevel).toBe('critical');
    expect(res.reason).toMatch(/embedded credentials/i);
  });

  it('rejects oversized URL payloads', async () => {
    const long = `https://example.com/${'a'.repeat(2100)}`;
    const res = await scanner.scan(long);
    expect(res.riskLevel).toBe('critical');
    expect(res.reason).toMatch(/maximum length/i);
  });
});
