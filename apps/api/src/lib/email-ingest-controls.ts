// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16
/**
 * Abuse controls for POST /rgaas/email-ingest: optional shared secret, payload
 * size cap, sender allow/deny lists (domain-level), and structured log helpers.
 *
 * Risk: misconfigured allowlists block legitimate mail; keep lists short and
 * test in staging. Rollback: unset EMAIL_INGEST_* env vars and redeploy.
 */

import type { Request } from 'express';

export const DEFAULT_EMAIL_INGEST_MAX_BYTES = 512 * 1024;

function parseDomainList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getEmailIngestDenyDomains(): Set<string> {
  return new Set(parseDomainList(process.env.EMAIL_INGEST_SENDER_DENYLIST));
}

/** Returns null when allowlist is disabled (empty env). */
export function getEmailIngestAllowDomains(): Set<string> | null {
  const list = parseDomainList(process.env.EMAIL_INGEST_SENDER_ALLOWLIST);
  if (list.length === 0) return null;
  return new Set(list);
}

export function getEmailIngestMaxBytes(): number {
  const raw = process.env.EMAIL_INGEST_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_EMAIL_INGEST_MAX_BYTES;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EMAIL_INGEST_MAX_BYTES;
}

/**
 * Cheap sender-domain extraction from the first chunk of raw mail (From header).
 * Used for early deny hits; post-parse policy still merges intel.senderDomain.
 */
export function extractQuickSenderDomain(raw: string): string | null {
  const slice = raw.slice(0, Math.min(raw.length, 12_288));
  const angle =
    slice.match(/^From:\s*.+?<([a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))>/im) ||
    slice.match(/^From:\s*.*?([a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))/im);
  const domain = angle?.[2]?.toLowerCase() ?? null;
  return domain;
}

function domainMatchesEntry(domain: string, entry: string): boolean {
  const d = domain.toLowerCase();
  const e = entry.toLowerCase();
  return d === e || d.endsWith(`.${e}`);
}

export function isSenderDomainDenied(domain: string | null, deny: Set<string>): boolean {
  if (!domain || deny.size === 0) return false;
  for (const entry of deny) {
    if (domainMatchesEntry(domain, entry)) return true;
  }
  return false;
}

export function isSenderDomainAllowed(domain: string | null, allow: Set<string> | null): boolean {
  if (allow === null) return true;
  if (!domain) return false;
  for (const entry of allow) {
    if (domainMatchesEntry(domain, entry)) return true;
  }
  return false;
}

export function mergeSenderDomainsForPolicy(
  intelSender: string | null,
  quickSender: string | null,
): string[] {
  const out = new Set<string>();
  if (intelSender) out.add(intelSender.toLowerCase());
  if (quickSender) out.add(quickSender.toLowerCase());
  return [...out];
}

export function evaluateEmailIngestSenderPolicy(
  domains: string[],
  deny: Set<string>,
  allow: Set<string> | null,
): 'ok' | 'denied' | 'allowlist_block' {
  for (const d of domains) {
    if (isSenderDomainDenied(d, deny)) return 'denied';
  }
  if (allow === null) return 'ok';
  if (domains.length === 0) return 'allowlist_block';
  for (const d of domains) {
    if (isSenderDomainAllowed(d, allow)) return 'ok';
  }
  return 'allowlist_block';
}

export type EmailIngestSecretResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'invalid_credential' };

/**
 * Production requires EMAIL_INGEST_SECRET; dev/test may omit it for local workflows.
 * Rollback: set EMAIL_INGEST_SECRET in production env and redeploy.
 */
export function assertEmailIngestSecret(req: Request): EmailIngestSecretResult {
  const secret = process.env.EMAIL_INGEST_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'not_configured' };
    }
    return { ok: true };
  }
  const auth = req.get('authorization');
  const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const headerKey = req.get('x-email-ingest-key')?.trim() ?? '';
  if (bearer === secret || headerKey === secret) return { ok: true };
  return { ok: false, reason: 'invalid_credential' };
}

export function logEmailIngestEvent(event: string, fields: Record<string, unknown>): void {
  console.warn(
    '[email-ingest]',
    JSON.stringify({ event, ts: new Date().toISOString(), ...fields }),
  );
}
