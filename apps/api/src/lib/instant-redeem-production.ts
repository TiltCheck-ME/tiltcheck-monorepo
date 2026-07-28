/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Instant Redeem Phase 5 production grants.
 * Processor/operator holds float. TiltCheck stores orchestration approval only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { InstantRedeemPartnerType } from './instant-redeem-registry.js';
import { normalizeCapabilityDomain } from './instant-redeem-registry.js';

export type FloatHolder = 'processor' | 'operator';
export type ProductionGrantStatus = 'requested' | 'approved' | 'rejected' | 'suspended';
export type SettlementRail = 'ach' | 'interac' | 'crypto' | 'card' | 'wallet';

export type InstantRedeemFloatDesk = {
  holder: FloatHolder;
  currency: string;
  softCapUsd: number;
  hardCapUsd: number;
};

export type InstantRedeemProductionGrant = {
  partnerId: string;
  partnerAppId: string;
  partnerType: InstantRedeemPartnerType;
  status: ProductionGrantStatus;
  coveredDomains: string[];
  float: InstantRedeemFloatDesk;
  rails: SettlementRail[];
  feeShareBps: number;
  rebuyCooloffHours: number;
  contractRef: string;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
};

export type InstantRedeemProductionStore = {
  updatedAt: string | null;
  grants: InstantRedeemProductionGrant[];
};

const EMPTY_STORE: InstantRedeemProductionStore = {
  updatedAt: null,
  grants: [],
};

export function getInstantRedeemProductionPath(): string {
  return (
    process.env.INSTANT_REDEEM_PRODUCTION_PATH?.trim() ||
    path.join(process.cwd(), 'data', 'instant-redeem-production-grants.json')
  );
}

export function readInstantRedeemProductionStore(): InstantRedeemProductionStore {
  const filePath = getInstantRedeemProductionPath();
  if (!existsSync(filePath)) {
    return { ...EMPTY_STORE, grants: [] };
  }
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as InstantRedeemProductionStore;
    if (!raw || !Array.isArray(raw.grants)) {
      return { ...EMPTY_STORE, grants: [] };
    }
    return {
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
      grants: raw.grants,
    };
  } catch {
    return { ...EMPTY_STORE, grants: [] };
  }
}

export function writeInstantRedeemProductionStore(store: InstantRedeemProductionStore): void {
  const filePath = getInstantRedeemProductionPath();
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf8');
}

export function getProductionGrantForPartner(partnerId: string): InstantRedeemProductionGrant | null {
  return readInstantRedeemProductionStore().grants.find((grant) => grant.partnerId === partnerId) ?? null;
}

export function partnerHasApprovedProductionRedeem(partnerId: string): boolean {
  const grant = getProductionGrantForPartner(partnerId);
  return grant?.status === 'approved';
}

export function upsertProductionGrant(grant: InstantRedeemProductionGrant): InstantRedeemProductionGrant {
  const store = readInstantRedeemProductionStore();
  const nextGrants = store.grants.filter((entry) => entry.partnerId !== grant.partnerId);
  nextGrants.push({
    ...grant,
    coveredDomains: [...new Set(grant.coveredDomains.map((domain) => normalizeCapabilityDomain(domain)))],
  });
  nextGrants.sort((a, b) => a.partnerAppId.localeCompare(b.partnerAppId));
  writeInstantRedeemProductionStore({
    updatedAt: new Date().toISOString(),
    grants: nextGrants,
  });
  return grant;
}

export function __resetInstantRedeemProductionForTests(filePath?: string): void {
  const target = filePath || getInstantRedeemProductionPath();
  const dir = path.dirname(target);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(target, JSON.stringify({ ...EMPTY_STORE, grants: [] }, null, 2), 'utf8');
}
