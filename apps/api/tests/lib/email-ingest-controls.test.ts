// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06

import { describe, expect, it } from 'vitest';
import {
  evaluateEmailIngestSenderPolicy,
  extractQuickSenderDomain,
  isSenderDomainDenied,
  mergeSenderDomainsForPolicy,
} from '../../src/lib/email-ingest-controls.js';

describe('email-ingest-controls', () => {
  it('extractQuickSenderDomain reads From header', () => {
    const raw = 'From: Promo <promo@chumba.example>\nSubject: Hi\n\nBody';
    expect(extractQuickSenderDomain(raw)).toBe('chumba.example');
  });

  it('isSenderDomainDenied matches subdomains', () => {
    const deny = new Set(['bad.com']);
    expect(isSenderDomainDenied('evil.bad.com', deny)).toBe(true);
    expect(isSenderDomainDenied('good.com', deny)).toBe(false);
  });

  it('evaluateEmailIngestSenderPolicy enforces allowlist when set', () => {
    const deny = new Set<string>();
    const allow = new Set(['trusted.example']);
    expect(
      evaluateEmailIngestSenderPolicy(mergeSenderDomainsForPolicy('trusted.example', null), deny, allow),
    ).toBe('ok');
    expect(
      evaluateEmailIngestSenderPolicy(mergeSenderDomainsForPolicy('other.com', null), deny, allow),
    ).toBe('allowlist_block');
  });

  it('evaluateEmailIngestSenderPolicy blocks empty domains under allowlist', () => {
    const deny = new Set<string>();
    const allow = new Set(['trusted.example']);
    expect(evaluateEmailIngestSenderPolicy([], deny, allow)).toBe('allowlist_block');
  });
});
