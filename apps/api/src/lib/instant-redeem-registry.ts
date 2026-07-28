/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Durable Instant Redeem capability registry.
 * File-backed so enablement survives API restarts and can scale beyond one-off casino sales.
 * Processor partners can cover many casino domains under one commercial identity.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type InstantRedeemPartnerType = 'operator' | 'processor';

export type InstantRedeemCapability = {
  domain: string;
  partnerId: string;
  partnerAppId: string;
  partnerType: InstantRedeemPartnerType;
  mode: string;
  enabledAt: string;
  rebuyCooloffDefaultHours: number;
  trustBoostApplied: boolean;
};

export type InstantRedeemRegistry = {
  updatedAt: string | null;
  capabilities: InstantRedeemCapability[];
};

const EMPTY_REGISTRY: InstantRedeemRegistry = {
  updatedAt: null,
  capabilities: [],
};

export function getInstantRedeemRegistryPath(): string {
  return (
    process.env.INSTANT_REDEEM_REGISTRY_PATH?.trim() ||
    path.join(process.cwd(), 'data', 'instant-redeem-capabilities.json')
  );
}

export function normalizeCapabilityDomain(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  const host = withoutProtocol.split('/')[0] ?? '';
  // Drop userinfo and port noise; keep hostname only.
  const hostname = host.includes('@') ? host.split('@').pop()! : host;
  return hostname.split(':')[0]!.toLowerCase();
}

export function readInstantRedeemRegistry(): InstantRedeemRegistry {
  const registryPath = getInstantRedeemRegistryPath();
  if (!existsSync(registryPath)) {
    return { ...EMPTY_REGISTRY, capabilities: [] };
  }

  try {
    const raw = JSON.parse(readFileSync(registryPath, 'utf8')) as InstantRedeemRegistry;
    if (!raw || !Array.isArray(raw.capabilities)) {
      return { ...EMPTY_REGISTRY, capabilities: [] };
    }
    return {
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
      capabilities: raw.capabilities
        .filter((entry) => entry && typeof entry.domain === 'string')
        .map((entry) => ({
          ...entry,
          domain: normalizeCapabilityDomain(entry.domain),
        })),
    };
  } catch {
    return { ...EMPTY_REGISTRY, capabilities: [] };
  }
}

export function writeInstantRedeemRegistry(registry: InstantRedeemRegistry): void {
  const registryPath = getInstantRedeemRegistryPath();
  const dir = path.dirname(registryPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

export function listInstantRedeemCapabilities(): InstantRedeemCapability[] {
  return readInstantRedeemRegistry().capabilities;
}

export function getInstantRedeemCapability(domain: string): InstantRedeemCapability | null {
  const normalized = normalizeCapabilityDomain(domain);
  return listInstantRedeemCapabilities().find((entry) => entry.domain === normalized) ?? null;
}

export function upsertInstantRedeemCapabilities(
  entries: InstantRedeemCapability[],
): InstantRedeemCapability[] {
  const registry = readInstantRedeemRegistry();
  const byDomain = new Map(registry.capabilities.map((entry) => [entry.domain, entry]));

  for (const entry of entries) {
    const domain = normalizeCapabilityDomain(entry.domain);
    byDomain.set(domain, { ...entry, domain });
  }

  const next: InstantRedeemRegistry = {
    updatedAt: new Date().toISOString(),
    capabilities: [...byDomain.values()].sort((a, b) => a.domain.localeCompare(b.domain)),
  };
  writeInstantRedeemRegistry(next);
  return entries.map((entry) => byDomain.get(normalizeCapabilityDomain(entry.domain))!);
}

/** Test helper — wipe registry file contents without deleting path config. */
export function __resetInstantRedeemRegistryForTests(registryPath?: string): void {
  const target = registryPath || getInstantRedeemRegistryPath();
  const dir = path.dirname(target);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(target, JSON.stringify({ ...EMPTY_REGISTRY, capabilities: [] }, null, 2), 'utf8');
}
