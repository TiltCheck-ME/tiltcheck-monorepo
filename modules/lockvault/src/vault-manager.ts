/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
import { eventRouter } from '@tiltcheck/event-router';
import { parseAmount } from '@tiltcheck/natural-language-parser';
import { db } from '@tiltcheck/database';
import { getUsdPriceSync } from '@tiltcheck/utils';
import fs from 'fs';
import path from 'path';
import { createDecipheriv } from 'crypto';

// Vault secret encryption key - REQUIRED in production, strongly recommended for dev/test
const VAULT_ENC_KEY_HEX = process.env.VAULT_ENCRYPTION_KEY || '';
const VAULT_ALLOW_PLAINTEXT = process.env.LOCKVAULT_ALLOW_PLAINTEXT === 'true';

function parseVaultEncryptionKey(hexKey: string): Buffer | null {
  if (!hexKey) return null;
  const normalized = hexKey.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('[LockVault] VAULT_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
  }
  return Buffer.from(normalized, 'hex');
}

const VAULT_ENC_KEY = parseVaultEncryptionKey(VAULT_ENC_KEY_HEX);

if (!VAULT_ENC_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[LockVault] VAULT_ENCRYPTION_KEY must be set in production (32-byte hex).');
  } else if (process.env.NODE_ENV !== 'test') {
    // Warn unless explicitly opted into plaintext mode
    if (!VAULT_ALLOW_PLAINTEXT) {
      console.warn('[LockVault] WARNING: VAULT_ENCRYPTION_KEY not set. Vault secrets will be stored unencrypted.');
      console.warn('[LockVault] To use plaintext secrets for local dev only, set: LOCKVAULT_ALLOW_PLAINTEXT=true');
      console.warn('[LockVault] To generate a key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    } else {
      console.warn('[LockVault] NOTE: Plaintext vault secrets enabled (LOCKVAULT_ALLOW_PLAINTEXT=true). This is dev-only.');
    }
  }
}

function decryptSecret(stored: string): string {
  if (!VAULT_ENC_KEY || !stored.includes(':')) return stored; // unencrypted passthrough
  const parts = stored.split(':');
  if (parts.length !== 3) return stored;
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', VAULT_ENC_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

export interface LockVaultInput {
  userId: string;
  amountRaw: string; // e.g. "$100", "5 sol", "all"
  durationRaw: string; // e.g. "24h", "3d", "90m"
  reason?: string;
  currencyHint?: 'USD' | 'SOL';
  autoWithdraw?: boolean; // If true, auto-send funds to user's registered wallet when lock expires
  disclaimerAccepted: boolean; // MUST be true for crypto compliance
  unlockSchedule?: LockVaultTrancheInput[];
}

export interface LockVaultTrancheInput {
  amountRaw: string;
  offsetMinutes: number;
  label?: string;
}

export interface LockVaultTrancheRecord {
  id: string;
  amountSOL: number;
  unlockAt: number;
  offsetMs: number;
  status: 'pending' | 'released';
  releasedAt?: number;
  label?: string;
}

export interface WithdrawalGuardianApproval {
  guardianId: string;
  approvedAt: number;
}

type WithdrawalProposalStatus = 'pending' | 'approved' | 'execution-pending' | 'executed';

export interface LockVaultRecord {
  id: string;
  userId: string;
  vaultAddress: string;
  vaultType: 'disposable' | 'linked' | 'magic';
  createdAt: number;
  unlockAt: number;
  lockedAmountSOL: number; // current remaining vault balance (locked + released - executed withdrawals)
  originalLockedAmountSOL: number; // original deposit amount before staged releases/withdrawals
  releasedAmountSOL: number; // currently released and eligible for withdrawal
  withdrawnAmountSOL: number; // executed withdrawals debited from the vault balance
  originalInput: string;
  status: 'locked' | 'unlock-requested' | 'unlocked' | 'extended' | 'emergency-unlocked' | 'partially-unlocked';
  history: { ts: number; action: string; note?: string }[];
  reason?: string;
  extendedCount: number;
  vaultSecret?: string; // AES-256-GCM encrypted for legacy disposable vaults only
  autoWithdraw?: boolean; // If true, auto-send to user's wallet on timer expiry
  guardianIds?: string[];
  approvalThreshold?: number;
  secondOwnerId?: string; // legacy alias for the first configured guardian
  unlockSchedule?: LockVaultTrancheRecord[];
  withdrawalProposal?: {
    amountSOL: number;
    initiatedBy: string;
    initiatedAt: number;
    guardianIds?: string[];
    approvalThreshold?: number;
    approvals?: WithdrawalGuardianApproval[];
    approvedAt?: number;
    approvedBy?: string;
    executionRequestedAt?: number;
    executionRequestId?: string;
    executionTimeoutAt?: number;
    executionAttempts?: number;
    lastRecoveryAt?: number;
    lastRecoveryReason?: 'execution-timeout';
    executedAt?: number;
    executedBy?: string;
    status: WithdrawalProposalStatus;
  };
}

export interface AutoVaultSettings {
  percentage?: number; // % of wins
  threshold?: number; // vault everything over this balance
  currency: 'USD' | 'SOL';
  saveForNft: boolean; // if true, contribute to NFT savings goal
  apiKey: string;
}

export interface ReloadSchedule {
  amountRaw: string;
  interval: 'daily' | 'weekly' | 'monthly';
  lastRunAt?: number;
}

export interface WalletActionLock {
  userId: string;
  lockUntil: number;
  createdAt: number;
  reason?: string;
  earlyUnlockRequest?: {
    mode: 'admin_approval' | 'paid_early_unlock';
    status: 'pending' | 'approved' | 'completed';
    requestedAt: number;
    requestedBy: string;
    feePercentage?: number;
    feeAmountSOL?: number;
    approvedBy?: string;
    approvedAt?: number;
    completedAt?: number;
  };
}

function now() { return Date.now(); }
function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function normalizeSolAmount(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

function isPositiveSolAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0.0000000005;
}

function normalizeUserIdList(values: unknown): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  const entries = Array.isArray(values) ? values : [];
  for (const value of entries) {
    const userId = typeof value === 'string'
      ? value.trim()
      : value && typeof value === 'object' && typeof (value as { userId?: unknown }).userId === 'string'
        ? (value as { userId: string }).userId.trim()
        : '';
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    normalized.push(userId);
  }
  return normalized;
}

function normalizeGuardianIds(rawGuardianIds: unknown, legacySecondOwnerId?: unknown): string[] {
  const guardianIds = normalizeUserIdList(rawGuardianIds);
  if (guardianIds.length > 0) {
    return guardianIds;
  }
  if (typeof legacySecondOwnerId === 'string' && legacySecondOwnerId.trim()) {
    return [legacySecondOwnerId.trim()];
  }
  return [];
}

function getDefaultApprovalThreshold(
  guardianIds: string[],
  legacySecondOwnerId?: unknown,
): number {
  if (guardianIds.length === 0) return 0;
  if (guardianIds.length === 1) return 1;
  if (typeof legacySecondOwnerId === 'string' && legacySecondOwnerId.trim()) {
    return 1;
  }
  return guardianIds.length;
}

function normalizeApprovalThreshold(value: unknown, guardianCount: number, fallback: number): number {
  if (guardianCount <= 0) return 0;
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
  return Math.max(1, Math.min(guardianCount, normalized));
}

function normalizeGuardianApprovals(
  rawApprovals: unknown,
  guardianIds: string[],
  proposalStatus: WithdrawalProposalStatus,
  fallbackApprovedBy?: unknown,
  fallbackApprovedAt?: unknown,
  fallbackInitiatedAt?: unknown,
): WithdrawalGuardianApproval[] {
  const approvals = Array.isArray(rawApprovals) ? rawApprovals : [];
  const seen = new Set<string>();
  const normalized: WithdrawalGuardianApproval[] = [];
  for (const approval of approvals) {
    const guardianId = approval && typeof approval === 'object' && typeof (approval as { guardianId?: unknown }).guardianId === 'string'
      ? (approval as { guardianId: string }).guardianId.trim()
      : '';
    if (!guardianId || seen.has(guardianId) || (guardianIds.length > 0 && !guardianIds.includes(guardianId))) continue;
    seen.add(guardianId);
    const approvedAt = approval && typeof approval === 'object' && Number.isFinite(Number((approval as { approvedAt?: unknown }).approvedAt))
      ? Number((approval as { approvedAt?: unknown }).approvedAt)
      : Number.isFinite(Number(fallbackApprovedAt))
        ? Number(fallbackApprovedAt)
        : Number.isFinite(Number(fallbackInitiatedAt))
          ? Number(fallbackInitiatedAt)
          : now();
    normalized.push({ guardianId, approvedAt });
  }

  if (
    normalized.length === 0
    && guardianIds.length > 0
    && (proposalStatus === 'approved' || proposalStatus === 'execution-pending' || proposalStatus === 'executed')
  ) {
    const fallbackGuardianId = typeof fallbackApprovedBy === 'string' && guardianIds.includes(fallbackApprovedBy.trim())
      ? fallbackApprovedBy.trim()
      : guardianIds[0];
    if (fallbackGuardianId) {
      normalized.push({
        guardianId: fallbackGuardianId,
        approvedAt: Number.isFinite(Number(fallbackApprovedAt))
          ? Number(fallbackApprovedAt)
          : Number.isFinite(Number(fallbackInitiatedAt))
            ? Number(fallbackInitiatedAt)
            : now(),
      });
    }
  }

  return normalized.sort((left, right) => left.approvedAt - right.approvedAt);
}

function getVaultGuardianIds(vault: Pick<LockVaultRecord, 'guardianIds' | 'secondOwnerId'>): string[] {
  return normalizeGuardianIds(vault.guardianIds, vault.secondOwnerId);
}

function getVaultApprovalThreshold(vault: Pick<LockVaultRecord, 'guardianIds' | 'approvalThreshold' | 'secondOwnerId'>): number {
  const guardianIds = getVaultGuardianIds(vault);
  return normalizeApprovalThreshold(
    vault.approvalThreshold,
    guardianIds.length,
    getDefaultApprovalThreshold(guardianIds, vault.secondOwnerId),
  );
}

function getProposalGuardianIds(vault: LockVaultRecord, proposal: NonNullable<LockVaultRecord['withdrawalProposal']>): string[] {
  const proposalGuardianIds = normalizeUserIdList(proposal.guardianIds);
  return proposalGuardianIds.length > 0 ? proposalGuardianIds : getVaultGuardianIds(vault);
}

function getProposalApprovalThreshold(vault: LockVaultRecord, proposal: NonNullable<LockVaultRecord['withdrawalProposal']>): number {
  const guardianIds = getProposalGuardianIds(vault, proposal);
  return normalizeApprovalThreshold(
    proposal.approvalThreshold,
    guardianIds.length,
    guardianIds.length > 0 ? getVaultApprovalThreshold(vault) : 0,
  );
}

function syncLegacySecondOwnerAlias(vault: LockVaultRecord) {
  const guardianIds = getVaultGuardianIds(vault);
  if (guardianIds.length > 0) {
    vault.guardianIds = guardianIds;
    vault.secondOwnerId = guardianIds[0];
    vault.approvalThreshold = normalizeApprovalThreshold(
      vault.approvalThreshold,
      guardianIds.length,
      getDefaultApprovalThreshold(guardianIds, vault.secondOwnerId),
    );
    return;
  }
  delete vault.guardianIds;
  delete vault.secondOwnerId;
  vault.approvalThreshold = 0;
}

function createValidationError(message: string): Error & { code: string; httpStatus: number } {
  const error = new Error(message) as Error & { code: string; httpStatus: number };
  error.code = 'LOCKVAULT_VALIDATION_ERROR';
  error.httpStatus = 400;
  return error;
}

function parsePositiveIntegerEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

const WITHDRAWAL_EXECUTION_TIMEOUT_MS = parsePositiveIntegerEnv(
  process.env.LOCKVAULT_WITHDRAWAL_EXECUTION_TIMEOUT_MS,
  15 * 60 * 1000,
);

function createFeatureNotImplementedError(message: string): Error & { code: string; httpStatus: number } {
  const error = new Error(message) as Error & { code: string; httpStatus: number };
  error.code = 'FEATURE_NOT_IMPLEMENTED';
  error.httpStatus = 501;
  return error;
}

function createLinkedWalletRequiredError(message: string): Error & { code: string; httpStatus: number } {
  const error = new Error(message) as Error & { code: string; httpStatus: number };
  error.code = 'LOCKVAULT_IDENTITY_REQUIRED';
  error.httpStatus = 409;
  return error;
}

function createLinkedWalletUnavailableError(message: string): Error & { code: string; httpStatus: number } {
  const error = new Error(message) as Error & { code: string; httpStatus: number };
  error.code = 'LOCKVAULT_IDENTITY_UNAVAILABLE';
  error.httpStatus = 503;
  return error;
}

function createWalletActionLockedError(
  status: {
    lockUntil?: number;
    remainingMs?: number;
    reason?: string;
    earlyUnlockRequest?: WalletActionLock['earlyUnlockRequest'];
  },
): Error & {
  code: string;
  httpStatus: number;
  lockUntil?: number;
  remainingMs?: number;
  reason?: string;
  earlyUnlockRequest?: WalletActionLock['earlyUnlockRequest'];
} {
  const error = new Error('Wallet lock is active. Try again after the timer expires.') as Error & {
    code: string;
    httpStatus: number;
    lockUntil?: number;
    remainingMs?: number;
    reason?: string;
    earlyUnlockRequest?: WalletActionLock['earlyUnlockRequest'];
  };
  error.code = 'WALLET_LOCK_ACTIVE';
  error.httpStatus = 423;
  error.lockUntil = status.lockUntil;
  error.remainingMs = status.remainingMs;
  error.reason = status.reason;
  error.earlyUnlockRequest = status.earlyUnlockRequest;
  return error;
}

function parseDuration(raw: string): number {
  const m = raw.trim().toLowerCase().match(/^(\d+)(m|h|d)$/);
  if (!m) throw new Error('Invalid duration format. Use 30m, 12h, 3d');
  const value = parseInt(m[1], 10); const unit = m[2];
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}

class VaultManager {
  private vaults = new Map<string, LockVaultRecord>();
  private byUser = new Map<string, Set<string>>();
  private autoVaults = new Map<string, AutoVaultSettings>();
  private reloadSchedules = new Map<string, ReloadSchedule>();
  private generalBalances = new Map<string, number>(); // Tracking non-locked vault funds
  private walletActionLocks = new Map<string, WalletActionLock>();
  private persistencePath = process.env.LOCKVAULT_STORE_PATH || 'data/lockvault.json';
  private persistDebounce?: NodeJS.Timeout;
  private backgroundTimer?: NodeJS.Timeout;

  constructor() {
    this.load();
  }

  private schedulePersist() {
    clearTimeout(this.persistDebounce as any);
    this.persistDebounce = setTimeout(() => this.persist(), 250);
  }

  private persist() {
    try {
      const payload = JSON.stringify({
        vaults: Array.from(this.vaults.values()),
        autoVaults: Object.fromEntries(this.autoVaults),
        reloadSchedules: Object.fromEntries(this.reloadSchedules),
        generalBalances: Object.fromEntries(this.generalBalances),
        walletActionLocks: Object.fromEntries(this.walletActionLocks)
      }, null, 2);
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // Write atomically to reduce corruption risk on crashes.
      const tmpPath = `${this.persistencePath}.tmp`;
      fs.writeFileSync(tmpPath, payload, 'utf-8');
      fs.renameSync(tmpPath, this.persistencePath);
    } catch (err) {
      console.error('[LockVault] Persist failed', err);
    }
  }

  private load() {
    try {
      if (!fs.existsSync(this.persistencePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.persistencePath, 'utf-8'));
      for (const v of raw.vaults || []) {
        const record = this.hydrateVaultRecord(v);
        this.vaults.set(record.id, record);
        if (!this.byUser.has(record.userId)) this.byUser.set(record.userId, new Set());
        this.byUser.get(record.userId)!.add(record.id);
      }
      for (const [userId, settings] of Object.entries(raw.autoVaults || {})) {
        this.autoVaults.set(userId, settings as AutoVaultSettings);
      }
      for (const [userId, schedule] of Object.entries(raw.reloadSchedules || {})) {
        this.reloadSchedules.set(userId, schedule as ReloadSchedule);
      }
      for (const [userId, bal] of Object.entries(raw.generalBalances || {})) {
        this.generalBalances.set(userId, bal as number);
      }
      for (const [userId, lock] of Object.entries(raw.walletActionLocks || {})) {
        this.walletActionLocks.set(userId, lock as WalletActionLock);
      }
      console.log(`[LockVault] Loaded ${this.vaults.size} vaults and ${this.generalBalances.size} balances`);
    } catch (err) {
      console.error('[LockVault] Load failed', err);
    }
  }

  private hydrateVaultRecord(rawVault: Partial<LockVaultRecord> & Record<string, unknown>): LockVaultRecord {
    const currentLockedAmountSOL = normalizeSolAmount(Number(rawVault.lockedAmountSOL || 0));
    const executedProposalAmount = rawVault.withdrawalProposal?.status === 'executed'
      ? normalizeSolAmount(Number(rawVault.withdrawalProposal.amountSOL || 0))
      : 0;
    const originalLockedAmountSOL = normalizeSolAmount(
      Number(rawVault.originalLockedAmountSOL ?? (currentLockedAmountSOL + executedProposalAmount))
    );
    const isLegacyUnlocked = rawVault.status === 'unlocked' || rawVault.status === 'emergency-unlocked';
    const releasedAmountSOL = normalizeSolAmount(
      Number(rawVault.releasedAmountSOL ?? (isLegacyUnlocked ? currentLockedAmountSOL : 0))
    );
    const withdrawnAmountSOL = normalizeSolAmount(
      Number(rawVault.withdrawnAmountSOL ?? executedProposalAmount)
    );
    const unlockSchedule = Array.isArray(rawVault.unlockSchedule)
      ? rawVault.unlockSchedule
          .map((tranche) => ({
            id: typeof tranche.id === 'string' && tranche.id.trim() ? tranche.id : generateId(),
            amountSOL: normalizeSolAmount(Number(tranche.amountSOL || 0)),
            unlockAt: Number(tranche.unlockAt || rawVault.unlockAt || 0),
            offsetMs: Number(tranche.offsetMs || 0),
            status: tranche.status === 'released' ? 'released' as const : 'pending' as const,
            releasedAt: tranche.releasedAt ? Number(tranche.releasedAt) : undefined,
            label: typeof tranche.label === 'string' && tranche.label.trim() ? tranche.label.trim() : undefined,
          }))
          .filter((tranche) => isPositiveSolAmount(tranche.amountSOL) && Number.isFinite(tranche.unlockAt))
          .sort((left, right) => left.unlockAt - right.unlockAt)
      : undefined;
    const guardianIds = normalizeGuardianIds(rawVault.guardianIds, rawVault.secondOwnerId);
    const approvalThreshold = normalizeApprovalThreshold(
      rawVault.approvalThreshold,
      guardianIds.length,
      getDefaultApprovalThreshold(guardianIds, rawVault.secondOwnerId),
    );
    const rawProposal = rawVault.withdrawalProposal;
    const proposalGuardianIds = rawProposal
      ? (() => {
          const normalizedProposalGuardianIds = normalizeUserIdList(rawProposal.guardianIds);
          return normalizedProposalGuardianIds.length > 0 ? normalizedProposalGuardianIds : guardianIds;
        })()
      : [];
    const proposalThreshold = rawProposal
      ? normalizeApprovalThreshold(
          rawProposal.approvalThreshold,
          proposalGuardianIds.length,
          guardianIds.length > 0 ? approvalThreshold : getDefaultApprovalThreshold(proposalGuardianIds, guardianIds[0]),
        )
      : 0;
    const withdrawalProposal: LockVaultRecord['withdrawalProposal'] = rawProposal
      ? {
          amountSOL: normalizeSolAmount(Number(rawProposal.amountSOL || 0)),
          initiatedBy: String(rawProposal.initiatedBy || rawVault.userId || ''),
          initiatedAt: Number(rawProposal.initiatedAt || rawVault.createdAt || now()),
          guardianIds: proposalGuardianIds,
          approvalThreshold: proposalThreshold,
          approvals: normalizeGuardianApprovals(
            rawProposal.approvals,
            proposalGuardianIds,
            rawProposal.status === 'approved' || rawProposal.status === 'execution-pending' || rawProposal.status === 'executed'
              ? rawProposal.status
              : 'pending',
            rawProposal.approvedBy,
            rawProposal.approvedAt,
            rawProposal.initiatedAt,
          ),
          approvedAt: rawProposal.approvedAt ? Number(rawProposal.approvedAt) : undefined,
          approvedBy: typeof rawProposal.approvedBy === 'string' ? rawProposal.approvedBy : undefined,
          executionRequestedAt: rawProposal.executionRequestedAt ? Number(rawProposal.executionRequestedAt) : undefined,
          executionRequestId: typeof rawProposal.executionRequestId === 'string' ? rawProposal.executionRequestId : undefined,
          executionTimeoutAt: rawProposal.executionTimeoutAt ? Number(rawProposal.executionTimeoutAt) : undefined,
          executionAttempts: rawProposal.executionAttempts ? Number(rawProposal.executionAttempts) : undefined,
          lastRecoveryAt: rawProposal.lastRecoveryAt ? Number(rawProposal.lastRecoveryAt) : undefined,
          lastRecoveryReason: rawProposal.lastRecoveryReason === 'execution-timeout' ? 'execution-timeout' as const : undefined,
          executedAt: rawProposal.executedAt ? Number(rawProposal.executedAt) : undefined,
          executedBy: typeof rawProposal.executedBy === 'string' ? rawProposal.executedBy : undefined,
          status: rawProposal.status === 'approved'
            ? 'approved'
            : rawProposal.status === 'execution-pending'
              ? 'execution-pending'
              : rawProposal.status === 'executed'
                ? 'executed'
                : 'pending',
        }
      : undefined;

    const record: LockVaultRecord = {
      id: String(rawVault.id || generateId()),
      userId: String(rawVault.userId || ''),
      vaultAddress: String(rawVault.vaultAddress || ''),
      vaultType: (rawVault.vaultType === 'magic' || rawVault.vaultType === 'disposable') ? rawVault.vaultType : 'linked',
      createdAt: Number(rawVault.createdAt || now()),
      unlockAt: Number(rawVault.unlockAt || now()),
      lockedAmountSOL: currentLockedAmountSOL,
      originalLockedAmountSOL,
      releasedAmountSOL,
      withdrawnAmountSOL,
      originalInput: String(rawVault.originalInput || ''),
      status: rawVault.status === 'partially-unlocked'
        ? 'partially-unlocked'
        : rawVault.status === 'unlock-requested'
          ? 'unlock-requested'
          : rawVault.status === 'unlocked'
            ? 'unlocked'
            : rawVault.status === 'extended'
              ? 'extended'
              : rawVault.status === 'emergency-unlocked'
                ? 'emergency-unlocked'
                : 'locked',
      history: Array.isArray(rawVault.history) ? rawVault.history : [],
      reason: typeof rawVault.reason === 'string' ? rawVault.reason : undefined,
      extendedCount: Number(rawVault.extendedCount || 0),
      vaultSecret: typeof rawVault.vaultSecret === 'string' ? rawVault.vaultSecret : undefined,
      autoWithdraw: rawVault.autoWithdraw === true,
      guardianIds,
      approvalThreshold,
      secondOwnerId: guardianIds[0],
      unlockSchedule,
      withdrawalProposal,
    };

    syncLegacySecondOwnerAlias(record);
    this.syncVaultReleaseState(record, now(), false);
    return record;
  }

  private convertAmountToSol(amountRaw: string, currencyHint?: 'USD' | 'SOL'): number {
    const amountParse = parseAmount(amountRaw);
    if (!amountParse.success || !amountParse.data) {
      throw createValidationError(amountParse.error || 'Unable to parse amount');
    }
    if (amountParse.data.isAll) {
      throw createValidationError('Locking "all" is not currently supported.');
    }

    const parsedValue = amountParse.data.value;
    let amountSOL: number;
    if (currencyHint === 'USD' || amountParse.data.currency === 'USD') {
      const solPrice = getUsdPriceSync('SOL');
      if (!solPrice || solPrice <= 0) {
        throw createValidationError('Unable to fetch SOL price. Please try again later.');
      }
      amountSOL = parsedValue / solPrice;
    } else {
      amountSOL = parsedValue;
    }

    const normalized = normalizeSolAmount(amountSOL);
    if (!isPositiveSolAmount(normalized)) {
      throw createValidationError('Lock amount must be a positive number.');
    }
    return normalized;
  }

  private buildUnlockSchedule(
    input: LockVaultInput,
    totalAmountSOL: number,
    durationMs: number,
    createdAt: number,
  ): LockVaultTrancheRecord[] | undefined {
    if (!Array.isArray(input.unlockSchedule) || input.unlockSchedule.length === 0) {
      return undefined;
    }

    const unlockSchedule = input.unlockSchedule.map((entry, index) => {
      const amountSOL = this.convertAmountToSol(entry.amountRaw, input.currencyHint);
      const offsetMinutes = Number(entry.offsetMinutes);
      if (!Number.isFinite(offsetMinutes) || offsetMinutes <= 0) {
        throw createValidationError(`Unlock schedule row ${index + 1} must define a positive offsetMinutes value.`);
      }
      const offsetMs = Math.trunc(offsetMinutes) * 60 * 1000;
      if (offsetMs > durationMs) {
        throw createValidationError(`Unlock schedule row ${index + 1} exceeds the lock duration.`);
      }
      return {
        id: generateId(),
        amountSOL,
        unlockAt: createdAt + offsetMs,
        offsetMs,
        status: 'pending' as const,
        label: typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : undefined,
      };
    }).sort((left, right) => left.unlockAt - right.unlockAt);

    const totalScheduledSOL = normalizeSolAmount(unlockSchedule.reduce((sum, tranche) => sum + tranche.amountSOL, 0));
    if (totalScheduledSOL > totalAmountSOL + 0.000000001) {
      throw createValidationError('Unlock schedule cannot release more than the locked amount.');
    }

    const remainderSOL = normalizeSolAmount(totalAmountSOL - totalScheduledSOL);
    const lastScheduledUnlockAt = unlockSchedule[unlockSchedule.length - 1]?.unlockAt ?? createdAt;
    const finalUnlockAt = createdAt + durationMs;

    if (!isPositiveSolAmount(remainderSOL) && lastScheduledUnlockAt < finalUnlockAt) {
      throw createValidationError('The staged unlock schedule must end at the full lock duration or leave a final remainder for that expiry.');
    }

    if (isPositiveSolAmount(remainderSOL)) {
      unlockSchedule.push({
        id: generateId(),
        amountSOL: remainderSOL,
        unlockAt: finalUnlockAt,
        offsetMs: durationMs,
        status: 'pending',
        label: 'Final release',
      });
    }

    return unlockSchedule;
  }

  private getAvailableToWithdraw(vault: LockVaultRecord): number {
    return normalizeSolAmount(Math.max(0, vault.releasedAmountSOL));
  }

  private assertWalletActionsUnlocked(userId: string): void {
    const status = this.getWalletActionLockStatus(userId);
    if (!status.locked) {
      return;
    }
    throw createWalletActionLockedError(status);
  }

  private getLockedRemainder(vault: LockVaultRecord): number {
    return normalizeSolAmount(Math.max(0, vault.lockedAmountSOL - vault.releasedAmountSOL));
  }

  private getNextPendingTranche(vault: LockVaultRecord): LockVaultTrancheRecord | null {
    if (!Array.isArray(vault.unlockSchedule)) return null;
    return vault.unlockSchedule.find((tranche) => tranche.status === 'pending') ?? null;
  }

  private syncVaultReleaseState(vault: LockVaultRecord, nowTs: number, emitEvents: boolean): boolean {
    let changed = false;
    let newlyReleasedSOL = 0;

    if (Array.isArray(vault.unlockSchedule) && vault.unlockSchedule.length > 0) {
      for (const tranche of vault.unlockSchedule) {
        if (tranche.status === 'pending' && nowTs >= tranche.unlockAt) {
          tranche.status = 'released';
          tranche.releasedAt = nowTs;
          newlyReleasedSOL += tranche.amountSOL;
          changed = true;
        }
      }

      if (isPositiveSolAmount(newlyReleasedSOL)) {
        vault.releasedAmountSOL = normalizeSolAmount(vault.releasedAmountSOL + newlyReleasedSOL);
        vault.history.push({
          ts: nowTs,
          action: 'tranche-released',
          note: `released=${normalizeSolAmount(newlyReleasedSOL).toFixed(9)} SOL available=${this.getAvailableToWithdraw(vault).toFixed(9)} SOL`,
        });
      }

      const priorStatus = vault.status;
      const lockedRemainderSOL = this.getLockedRemainder(vault);
      if (!isPositiveSolAmount(lockedRemainderSOL)) {
        vault.status = 'unlocked';
      } else if (isPositiveSolAmount(vault.releasedAmountSOL)) {
        vault.status = 'partially-unlocked';
      } else if (vault.extendedCount > 0 || vault.status === 'extended') {
        vault.status = 'extended';
      } else {
        vault.status = 'locked';
      }

      if (vault.status !== priorStatus) {
        changed = true;
        if (vault.status === 'unlocked') {
          vault.history.push({
            ts: nowTs,
            action: 'auto-unlocked',
            note: 'All staged unlock tranches have released. Remaining funds are fully available.',
          });
          if (emitEvents) {
            void eventRouter.publish('vault.unlocked', 'lockvault', {
              id: vault.id,
              userId: vault.userId,
              address: vault.vaultAddress,
              amountSOL: vault.lockedAmountSOL,
              autoUnlocked: true,
            });
          }
        }
      }

      return changed;
    }

    const shouldUnlock = (vault.status === 'locked' || vault.status === 'extended') && nowTs >= vault.unlockAt;
    if (shouldUnlock) {
      vault.releasedAmountSOL = normalizeSolAmount(vault.lockedAmountSOL);
      vault.status = 'unlocked';
      vault.history.push({ ts: nowTs, action: 'auto-unlocked', note: 'Timer expired — funds available to claim or withdraw' });
      changed = true;
      if (emitEvents) {
        void eventRouter.publish('vault.unlocked', 'lockvault', {
          id: vault.id,
          userId: vault.userId,
          address: vault.vaultAddress,
          amountSOL: vault.lockedAmountSOL,
          autoUnlocked: true,
        });
      }
    } else if ((vault.status === 'unlocked' || vault.status === 'emergency-unlocked') && vault.releasedAmountSOL !== vault.lockedAmountSOL) {
      vault.releasedAmountSOL = normalizeSolAmount(vault.lockedAmountSOL);
      changed = true;
    }

    return changed;
  }

  async lock(input: LockVaultInput): Promise<LockVaultRecord> {
    this.assertWalletActionsUnlocked(input.userId);
    if (input.autoWithdraw) {
      throw createFeatureNotImplementedError(
        'LockVault auto-withdraw is temporarily disabled until a real execution consumer is wired.'
      );
    }
    if (!input.disclaimerAccepted) {
      throw new Error('You must explicitly acknowledge the Digital Asset Risk and Zero Custody disclosures before deploying a LockVault.');
    }
    const amountSOL = this.convertAmountToSol(input.amountRaw, input.currencyHint);
    const durationMs = parseDuration(input.durationRaw);
    if (durationMs < 10 * 60 * 1000) throw new Error('Minimum lock is 10m');
    if (durationMs > 30 * 24 * 60 * 60 * 1000) throw new Error('Maximum lock is 30d');

    if (!db.isConnected()) {
      throw createLinkedWalletUnavailableError(
        'LockVault could not verify a linked wallet right now. Link a wallet or Degen Identity and try again once identity services are available.'
      );
    }

    let vaultAddress = '';
    let vaultType: Exclude<LockVaultRecord['vaultType'], 'disposable'> | null = null;

    try {
      const identity = await db.getDegenIdentity(input.userId);
      const linkedWallet = identity?.primary_external_address?.trim();
      const magicWallet = identity?.magic_address?.trim();

      if (linkedWallet) {
        vaultAddress = linkedWallet;
        vaultType = 'linked';
      } else if (magicWallet) {
        vaultAddress = magicWallet;
        vaultType = 'magic';
      } else {
        throw createLinkedWalletRequiredError(
          'LockVault requires a linked wallet or Degen Identity before a lock can be created. No server-managed fallback wallet will be created.'
        );
      }
    } catch (err) {
      if (err instanceof Error && 'code' in err && (err as { code?: string }).code) {
        throw err;
      }
      console.error('[LockVault] Identity check failed. Refusing to create a custodial fallback vault.', err);
      throw createLinkedWalletUnavailableError(
        'LockVault could not verify your linked wallet right now. No server-managed fallback wallet was created.'
      );
    }

    if (!vaultAddress || !vaultType) {
      throw createLinkedWalletUnavailableError(
        'LockVault could not resolve a linked wallet target. No server-managed fallback wallet was created.'
      );
    }

    const createdAt = now();
    const unlockSchedule = this.buildUnlockSchedule(input, amountSOL, durationMs, createdAt);
    const finalUnlockAt = unlockSchedule?.[unlockSchedule.length - 1]?.unlockAt ?? (createdAt + durationMs);

    const record: LockVaultRecord = {
      id: generateId(),
      userId: input.userId,
      vaultAddress,
      vaultType,
      createdAt,
      unlockAt: finalUnlockAt,
      lockedAmountSOL: amountSOL,
      originalLockedAmountSOL: amountSOL,
      releasedAmountSOL: 0,
      withdrawnAmountSOL: 0,
      originalInput: input.amountRaw,
      status: 'locked',
      history: [{
        ts: createdAt,
        action: 'locked',
        note: unlockSchedule?.length
          ? `duration=${input.durationRaw}, type=${vaultType}, staged=${unlockSchedule.length}`
          : `duration=${input.durationRaw}, type=${vaultType}`,
      }],
      reason: input.reason,
      extendedCount: 0,
      autoWithdraw: input.autoWithdraw ?? false,
      unlockSchedule,
    };

    this.vaults.set(record.id, record);
    if (!this.byUser.has(record.userId)) this.byUser.set(record.userId, new Set());
    this.byUser.get(record.userId)!.add(record.id);
    this.schedulePersist();

    void eventRouter.publish('vault.locked', 'lockvault', {
      id: record.id,
      userId: record.userId,
      unlockAt: record.unlockAt,
      amountSOL: record.lockedAmountSOL,
      vaultType: record.vaultType,
      vaultAddress: record.vaultAddress
    });
    return record;
  }

  async processBalanceUpdate(userId: string, balance: number, currency: 'USD' | 'SOL') {
    const settings = this.autoVaults.get(userId);
    if (!settings) return;

    if (settings.threshold !== undefined && balance > settings.threshold) {
      const overage = balance - settings.threshold;
      console.log(`[LockVault] Auto-vaulting overage: ${overage} ${currency} for user ${userId}`);

      // If saving for NFT, contribute to goal
      if (settings.saveForNft && db.isConnected()) {
        const solPrice = getUsdPriceSync('SOL');
        if (solPrice && solPrice > 0) {
          const amountSol = currency === 'SOL' ? overage : overage / solPrice;
          await db.updateNftSavings(userId, amountSol);
        } else {
          console.warn('[LockVault] Could not fetch SOL price for NFT savings update');
        }
      }

      await this.lock({
        userId,
        amountRaw: `${overage} ${currency}`,
        durationRaw: '24h',
        reason: settings.saveForNft ? 'Auto-vault (NFT Savings)' : 'Auto-vault (threshold)',
        currencyHint: currency,
        disclaimerAccepted: true // User accepted when they configured Auto-Vault
      });
    }
  }

  unlock(userId: string, vaultId: string): LockVaultRecord {
    this.assertWalletActionsUnlocked(userId);
    const vault = this.vaults.get(vaultId);
    if (!vault || vault.userId !== userId) throw new Error('Vault not found');
    const nowTs = now();
    const availableBefore = this.getAvailableToWithdraw(vault);
    const changed = this.syncVaultReleaseState(vault, nowTs, true);
    const nextPendingTranche = this.getNextPendingTranche(vault);
    if (!changed && !isPositiveSolAmount(this.getAvailableToWithdraw(vault))) {
      if (nextPendingTranche) {
        throw new Error(`Cannot unlock yet. Remaining ${(nextPendingTranche.unlockAt - nowTs) / 1000 | 0}s`);
      }
      if (nowTs < vault.unlockAt) {
        throw new Error(`Cannot unlock yet. Remaining ${(vault.unlockAt - nowTs) / 1000 | 0}s`);
      }
    }
    if (changed) {
      vault.history.push({
        ts: nowTs,
        action: 'unlocked',
        note: `available=${this.getAvailableToWithdraw(vault).toFixed(9)} SOL previouslyAvailable=${availableBefore.toFixed(9)} SOL`,
      });
      this.schedulePersist();
    } else if (vault.status === 'unlocked' || vault.status === 'partially-unlocked') {
      // keep manual release idempotent once funds are already available
      this.schedulePersist();
    }
    // Decrypt secret before returning to caller so they can use it
    const result = { ...vault };
    if (result.vaultSecret) {
      try {
        result.vaultSecret = decryptSecret(result.vaultSecret);
      } catch (err) {
        console.error('[LockVault] Failed to decrypt vault secret during unlock', err);
        throw new Error('Vault secret is unreadable. Contact support for recovery.', { cause: err });
      }
    }
    return result;
  }

  extend(userId: string, vaultId: string, additionalRaw: string): LockVaultRecord {
    const vault = this.vaults.get(vaultId);
    if (!vault || vault.userId !== userId) throw new Error('Vault not found');
    if (vault.status !== 'locked' && vault.status !== 'extended' && vault.status !== 'partially-unlocked') throw new Error('Cannot extend now');
    const addMs = parseDuration(additionalRaw);
    vault.unlockAt += addMs;
    if (Array.isArray(vault.unlockSchedule)) {
      for (const tranche of vault.unlockSchedule) {
        if (tranche.status === 'pending') {
          tranche.unlockAt += addMs;
          tranche.offsetMs += addMs;
        }
      }
    }
    vault.status = 'extended';
    vault.extendedCount += 1;
    vault.history.push({ ts: now(), action: 'extended', note: `+${additionalRaw}` });
    this.schedulePersist();
    void eventRouter.publish('vault.extended', 'lockvault', { id: vault.id, userId: vault.userId, unlockAt: vault.unlockAt });
    return vault;
  }

  status(userId: string): LockVaultRecord[] {
    const ids = this.byUser.get(userId);
    if (!ids) return [];
    const records = Array.from(ids)
      .map(id => this.vaults.get(id))
      .filter((vault): vault is LockVaultRecord => Boolean(vault))
      .sort((a, b) => a.unlockAt - b.unlockAt);
    const nowTs = now();
    let changed = false;
    for (const record of records) {
      changed = this.syncVaultReleaseState(record, nowTs, false) || changed;
      changed = this.recoverStaleExecutionPending(record, nowTs) || changed;
    }
    if (changed) {
      this.schedulePersist();
    }
    return records;
  }

  get(vaultId: string): LockVaultRecord | undefined {
    const vault = this.vaults.get(vaultId);
    if (!vault) return undefined;
    let changed = false;
    changed = this.syncVaultReleaseState(vault, now(), false) || changed;
    if (this.recoverStaleExecutionPending(vault, now())) {
      changed = true;
    }
    if (changed) {
      this.schedulePersist();
    }
    return vault;
  }

  deposit(userId: string, amount: number): number {
    this.assertWalletActionsUnlocked(userId);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Deposit amount must be a positive finite number.');
    }
    const current = this.generalBalances.get(userId) || 0;
    const next = current + amount;
    this.generalBalances.set(userId, next);
    this.schedulePersist();
    return next;
  }

  getBalance(userId: string): number {
    return this.generalBalances.get(userId) || 0;
  }

  private clearWalletActionLockInternal(userId: string): void {
    this.walletActionLocks.delete(userId);
    this.schedulePersist();
  }

  private getLatestLockedVaultForUser(userId: string): LockVaultRecord {
    const ids = this.byUser.get(userId);
    if (!ids || ids.size === 0) throw new Error('No vault found for user');
    const records = Array.from(ids)
      .map((id) => this.vaults.get(id))
      .filter((v): v is LockVaultRecord => Boolean(v) && (v!.status === 'locked' || v!.status === 'extended' || v!.status === 'partially-unlocked'))
      .sort((a, b) => b.createdAt - a.createdAt);
    if (records.length === 0) throw new Error('No active locked vault found for user');
    return records[0];
  }

  private getLatestVaultForUser(userId: string): LockVaultRecord {
    const ids = this.byUser.get(userId);
    if (!ids || ids.size === 0) throw new Error('No vault found for user');
    const records = Array.from(ids)
      .map((id) => this.vaults.get(id))
      .filter((v): v is LockVaultRecord => Boolean(v))
      .sort((a, b) => b.createdAt - a.createdAt);
    if (records.length === 0) throw new Error('No vault found for user');
    return records[0];
  }

  private getLatestDualOwnerVaultForUser(
    userId: string,
    requiredProposalState?: 'pending' | 'approved' | 'execution-pending' | 'executed' | Array<'pending' | 'approved' | 'execution-pending' | 'executed'>,
    recoverStaleExecution = true,
  ): LockVaultRecord {
    const requiredStates = Array.isArray(requiredProposalState)
      ? requiredProposalState
      : requiredProposalState
        ? [requiredProposalState]
        : undefined;
    const ids = this.byUser.get(userId);
    if (!ids || ids.size === 0) throw new Error('No vault found for user');
    const nowTs = now();
    let changed = false;
    const records = Array.from(ids)
      .map((id) => this.vaults.get(id))
      .filter((v): v is LockVaultRecord => {
        if (!v) return false;
        if (recoverStaleExecution) {
          changed = this.recoverStaleExecutionPending(v, nowTs) || changed;
        }
        if (getVaultGuardianIds(v).length === 0) return false;
        if (!requiredStates) return true;
        return Boolean(v.withdrawalProposal?.status && requiredStates.includes(v.withdrawalProposal.status));
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    if (changed) {
      this.schedulePersist();
    }
    if (records.length === 0) {
      if (requiredStates?.includes('pending')) throw new Error('No pending withdrawal to approve.');
      if (requiredStates?.includes('approved') || requiredStates?.includes('execution-pending')) {
        throw new Error('Withdrawal must be approved before execution.');
      }
      throw new Error('No guardian-protected vault found for user');
    }
    return records[0];
  }

  getWithdrawalApprovals(guardianId: string): LockVaultRecord[] {
    const nowTs = now();
    let changed = false;
    const approvals = Array.from(this.vaults.values())
      .filter((vault) => {
        changed = this.recoverStaleExecutionPending(vault, nowTs) || changed;
        const proposal = vault.withdrawalProposal;
        if (!proposal || proposal.status !== 'pending') return false;
        const proposalGuardianIds = getProposalGuardianIds(vault, proposal);
        if (!proposalGuardianIds.includes(guardianId)) return false;
        return !proposal.approvals?.some((approval) => approval.guardianId === guardianId);
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    if (changed) {
      this.schedulePersist();
    }

    return approvals;
  }

  setGuardians(userId: string, guardianIds: string[], approvalThreshold?: number): LockVaultRecord {
    this.assertWalletActionsUnlocked(userId);
    const normalizedGuardianIds = normalizeUserIdList(guardianIds);
    if (normalizedGuardianIds.length === 0) throw new Error('At least one guardianId is required.');
    if (normalizedGuardianIds.includes(userId)) throw new Error('guardianIds must not include userId.');

    const vault = this.getLatestVaultForUser(userId);
    if (
      vault.withdrawalProposal
      && (
        vault.withdrawalProposal.status === 'pending'
        || vault.withdrawalProposal.status === 'approved'
        || vault.withdrawalProposal.status === 'execution-pending'
      )
    ) {
      throw new Error('Cannot change guardians while a withdrawal is in progress.');
    }

    vault.guardianIds = normalizedGuardianIds;
    vault.approvalThreshold = normalizeApprovalThreshold(
      approvalThreshold,
      normalizedGuardianIds.length,
      normalizedGuardianIds.length,
    );
    syncLegacySecondOwnerAlias(vault);
    vault.history.push({
      ts: now(),
      action: 'guardians-configured',
      note: `guardians=${normalizedGuardianIds.join(',')} threshold=${vault.approvalThreshold}`,
    });
    this.schedulePersist();
    return vault;
  }

  addSecondOwner(userId: string, secondOwnerId: string): LockVaultRecord {
    this.assertWalletActionsUnlocked(userId);
    const normalizedSecondOwner = secondOwnerId.trim();
    if (!normalizedSecondOwner) throw new Error('secondOwnerId is required');
    if (normalizedSecondOwner === userId) throw new Error('secondOwnerId must be different from userId');

    const vault = this.getLatestVaultForUser(userId);
    if (
      vault.withdrawalProposal
      && (
        vault.withdrawalProposal.status === 'pending'
        || vault.withdrawalProposal.status === 'approved'
        || vault.withdrawalProposal.status === 'execution-pending'
      )
    ) {
      throw new Error('Cannot change guardians while a withdrawal is in progress.');
    }
    vault.guardianIds = [normalizedSecondOwner];
    vault.approvalThreshold = 1;
    syncLegacySecondOwnerAlias(vault);
    vault.history.push({ ts: now(), action: 'second-owner-added', note: normalizedSecondOwner });
    this.schedulePersist();
    return vault;
  }

  initiateWithdrawal(userId: string, amount: number): LockVaultRecord {
    this.assertWalletActionsUnlocked(userId);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Withdrawal amount must be a positive finite number.');
    }

    const vault = this.getLatestDualOwnerVaultForUser(userId);
    const guardianIds = getVaultGuardianIds(vault);
    const approvalThreshold = getVaultApprovalThreshold(vault);
    if (guardianIds.length === 0 || approvalThreshold <= 0) {
      throw new Error('Configure at least one guardian before initiating withdrawal.');
    }
    const nowTs = now();
    if (this.syncVaultReleaseState(vault, nowTs, false)) {
      this.schedulePersist();
    }
    if (vault.status !== 'unlocked' && vault.status !== 'partially-unlocked') {
      throw new Error('Vault must have released funds before initiating withdrawal.');
    }
    if (amount > this.getAvailableToWithdraw(vault)) {
      throw new Error('Withdrawal amount exceeds released balance.');
    }
    if (
      vault.withdrawalProposal
      && (
        vault.withdrawalProposal.status === 'pending'
        || vault.withdrawalProposal.status === 'approved'
        || vault.withdrawalProposal.status === 'execution-pending'
      )
    ) {
      throw new Error('A withdrawal is already in progress.');
    }

    vault.withdrawalProposal = {
      amountSOL: amount,
      initiatedBy: userId,
      initiatedAt: nowTs,
      guardianIds,
      approvalThreshold,
      approvals: [],
      status: 'pending',
    };
    vault.history.push({
      ts: nowTs,
      action: 'withdrawal-initiated',
      note: `${amount} SOL guardians=${guardianIds.join(',')} threshold=${approvalThreshold}`,
    });
    this.schedulePersist();
    return vault;
  }

  approveWithdrawal(ownerUserId: string, approverUserId: string): LockVaultRecord {
    const vault = this.getLatestDualOwnerVaultForUser(ownerUserId, 'pending');
    const proposal = vault.withdrawalProposal;
    if (!proposal || proposal.status !== 'pending') {
      throw new Error('No pending withdrawal to approve.');
    }
    const guardianIds = getProposalGuardianIds(vault, proposal);
    if (guardianIds.length === 0) {
      throw new Error('Vault does not have guardians configured.');
    }
    if (!guardianIds.includes(approverUserId)) {
      throw new Error('Only configured guardians can approve this withdrawal.');
    }
    if (proposal.approvals?.some((approval) => approval.guardianId === approverUserId)) {
      throw new Error('This guardian already approved the withdrawal.');
    }

    const nowTs = now();
    proposal.approvals = [...(proposal.approvals || []), { guardianId: approverUserId, approvedAt: nowTs }];
    const approvalThreshold = getProposalApprovalThreshold(vault, proposal);
    if (proposal.approvals.length >= approvalThreshold) {
      proposal.status = 'approved';
      proposal.approvedAt = nowTs;
      proposal.approvedBy = approverUserId;
    }
    vault.history.push({
      ts: nowTs,
      action: 'withdrawal-approved',
      note: `approvedBy=${approverUserId} progress=${proposal.approvals.length}/${approvalThreshold}`,
    });
    this.schedulePersist();
    return vault;
  }

  executeWithdrawal(userId: string): LockVaultRecord {
    this.assertWalletActionsUnlocked(userId);
    const vault = this.getLatestDualOwnerVaultForUser(userId, ['approved', 'execution-pending'], false);
    const proposal = vault.withdrawalProposal;
    const nowTs = now();

    if (this.syncVaultReleaseState(vault, nowTs, false)) {
      this.schedulePersist();
    }
    if (vault.status !== 'unlocked' && vault.status !== 'partially-unlocked') {
      throw new Error('Vault must have released funds before executing withdrawal.');
    }

    if (!proposal) {
      throw new Error('Withdrawal must be approved before execution.');
    }
    if (proposal.status === 'execution-pending') {
      if (this.recoverStaleExecutionPending(vault, nowTs)) {
        this.schedulePersist();
      }
      return vault;
    }
    if (proposal.status !== 'approved') {
      throw new Error('Withdrawal must be approved before execution.');
    }
    if (proposal.amountSOL > this.getAvailableToWithdraw(vault)) {
      throw new Error('Withdrawal amount exceeds released vault balance.');
    }

    const executionRequestId = generateId();
    proposal.status = 'executed';
    proposal.executionRequestedAt = nowTs;
    proposal.executionRequestId = executionRequestId;
    proposal.executionAttempts = (proposal.executionAttempts || 0) + 1;
    proposal.executedAt = nowTs;
    proposal.executedBy = userId;
    delete proposal.lastRecoveryAt;
    delete proposal.lastRecoveryReason;
    delete proposal.executionTimeoutAt;
    vault.lockedAmountSOL = normalizeSolAmount(Math.max(0, vault.lockedAmountSOL - proposal.amountSOL));
    vault.releasedAmountSOL = normalizeSolAmount(Math.max(0, vault.releasedAmountSOL - proposal.amountSOL));
    vault.withdrawnAmountSOL = normalizeSolAmount(vault.withdrawnAmountSOL + proposal.amountSOL);
    this.syncVaultReleaseState(vault, nowTs, false);
    vault.history.push({
      ts: nowTs,
      action: 'withdrawal-executed',
      note: `${proposal.amountSOL} SOL requestId=${executionRequestId} remaining=${vault.lockedAmountSOL.toFixed(9)} SOL available=${vault.releasedAmountSOL.toFixed(9)} SOL lockedRemainder=${this.getLockedRemainder(vault).toFixed(9)} SOL`,
    });
    void eventRouter.publish('vault.withdrawal_execution_requested', 'lockvault', {
      id: vault.id,
      userId: vault.userId,
      vaultAddress: vault.vaultAddress,
      vaultType: vault.vaultType,
      amountSOL: proposal.amountSOL,
      executionRequestId,
      guardianIds: getProposalGuardianIds(vault, proposal),
      approvalThreshold: getProposalApprovalThreshold(vault, proposal),
      secondOwnerId: vault.secondOwnerId,
    });
    this.schedulePersist();
    return vault;
  }

  private recoverStaleExecutionPending(vault: LockVaultRecord, nowTs: number): boolean {
    const proposal = vault.withdrawalProposal;
    if (!proposal || proposal.status !== 'execution-pending' || !proposal.executionRequestedAt) {
      return false;
    }
    if (nowTs < proposal.executionRequestedAt + WITHDRAWAL_EXECUTION_TIMEOUT_MS) {
      if (!proposal.executionTimeoutAt) {
        proposal.executionTimeoutAt = proposal.executionRequestedAt + WITHDRAWAL_EXECUTION_TIMEOUT_MS;
        return true;
      }
      return false;
    }

    const staleRequestId = proposal.executionRequestId;
    proposal.status = 'approved';
    proposal.lastRecoveryAt = nowTs;
    proposal.lastRecoveryReason = 'execution-timeout';
    delete proposal.executionRequestedAt;
    delete proposal.executionRequestId;
    delete proposal.executionTimeoutAt;
    vault.history.push({
      ts: nowTs,
      action: 'withdrawal-execution-timeout-recovered',
      note: `staleRequestId=${staleRequestId || 'unknown'} reset-to=approved manual-retry-required`,
    });
    return true;
  }

  clearAll(): void { // test helper
    this.vaults.clear(); this.byUser.clear(); this.autoVaults.clear(); this.reloadSchedules.clear(); this.generalBalances.clear(); this.walletActionLocks.clear();
  }

  setWalletActionLock(userId: string, durationMs: number, reason?: string): WalletActionLock {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error('Duration must be a positive number.');
    }
    const record: WalletActionLock = {
      userId,
      lockUntil: now() + Math.trunc(durationMs),
      createdAt: now(),
      reason,
    };
    this.walletActionLocks.set(userId, record);
    this.schedulePersist();
    return record;
  }

  clearWalletActionLock(userId: string): void {
    this.clearWalletActionLockInternal(userId);
  }

  getWalletActionLock(userId: string): WalletActionLock | null {
    return this.walletActionLocks.get(userId) || null;
  }

  getWalletActionLockStatus(userId: string): {
    locked: boolean;
    lockUntil?: number;
    remainingMs?: number;
    reason?: string;
    earlyUnlockRequest?: WalletActionLock['earlyUnlockRequest'];
  } {
    const lock = this.walletActionLocks.get(userId);
    if (!lock) return { locked: false };
    const remainingMs = lock.lockUntil - now();
    if (remainingMs <= 0) {
      this.clearWalletActionLockInternal(userId);
      return { locked: false };
    }
    return {
      locked: true,
      lockUntil: lock.lockUntil,
      remainingMs,
      reason: lock.reason,
      earlyUnlockRequest: lock.earlyUnlockRequest,
    };
  }

  requestAdminWalletUnlock(userId: string, requestedBy: string): WalletActionLock {
    const lock = this.walletActionLocks.get(userId);
    if (!lock) throw new Error('No active wallet lock found.');
    const remainingMs = lock.lockUntil - now();
    if (remainingMs <= 0) {
      this.clearWalletActionLockInternal(userId);
      throw new Error('Wallet lock has already expired.');
    }

    lock.earlyUnlockRequest = {
      mode: 'admin_approval',
      status: 'pending',
      requestedAt: now(),
      requestedBy,
    };
    this.schedulePersist();
    return lock;
  }

  approveAdminWalletUnlock(userId: string, approvedBy: string): WalletActionLock {
    const lock = this.walletActionLocks.get(userId);
    if (!lock) throw new Error('No active wallet lock found.');
    if (!lock.earlyUnlockRequest || lock.earlyUnlockRequest.mode !== 'admin_approval') {
      throw new Error('No admin approval request exists for this wallet lock.');
    }

    lock.earlyUnlockRequest.status = 'approved';
    lock.earlyUnlockRequest.approvedBy = approvedBy;
    lock.earlyUnlockRequest.approvedAt = now();
    lock.earlyUnlockRequest.completedAt = now();
    this.clearWalletActionLockInternal(userId);
    return lock;
  }

  requestPaidWalletUnlock(userId: string, requestedBy: string, feePercentage = 10): WalletActionLock {
    void userId;
    void requestedBy;
    void feePercentage;
    throw createFeatureNotImplementedError(
      'Paid early wallet unlock is temporarily disabled until fee routing is implemented.'
    );
  }

  settlePaidWalletUnlock(userId: string, paidBy: string): WalletActionLock {
    void userId;
    void paidBy;
    throw createFeatureNotImplementedError(
      'Paid early wallet unlock is temporarily disabled until fee routing is implemented.'
    );
  }

  setAutoVault(userId: string, settings: AutoVaultSettings): void {
    if (settings.percentage !== undefined && (settings.percentage < 0 || settings.percentage > 100)) throw new Error('Percentage must be between 0 and 100');
    this.autoVaults.set(userId, settings);
    this.schedulePersist();
  }

  getAutoVault(userId: string): AutoVaultSettings | null {
    return this.autoVaults.get(userId) || null;
  }

  setReloadSchedule(userId: string, amountRaw: string, interval: 'daily' | 'weekly' | 'monthly'): void {
    if (!['daily', 'weekly', 'monthly'].includes(interval)) throw new Error('Interval must be "daily", "weekly", or "monthly"');
    this.reloadSchedules.set(userId, { amountRaw, interval });
    this.schedulePersist();
  }

  getReloadSchedule(userId: string): ReloadSchedule | null {
    return this.reloadSchedules.get(userId) || null;
  }

  startBackgroundTasks() {
    if (this.backgroundTimer) return;
    console.log('[LockVault] Starting background timer tasks...');
    this.backgroundTimer = setInterval(() => {
      this.processExpiredVaults();
      this.processReloadSchedules();
    }, 60 * 1000); // Check every minute
  }

  stopBackgroundTasks() {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = undefined;
      console.log('[LockVault] Background timer tasks stopped.');
    }
  }

  private processExpiredVaults() {
    const t = now();
    for (const vault of this.vaults.values()) {
      if (this.syncVaultReleaseState(vault, t, true)) {
        this.schedulePersist();
        console.log(`[LockVault] Vault ${vault.id} release state advanced for user ${vault.userId}`);
      }

      // Auto-withdraw stays disabled until a real execution consumer exists.
      if (vault.autoWithdraw && vault.status === 'unlocked') {
        vault.autoWithdraw = false;
        vault.history.push({
          ts: t,
          action: 'auto-withdraw-disabled',
          note: 'Auto-withdraw was requested before the execution path existed. Funds remain in the unlocked vault.',
        });
        this.schedulePersist();
        console.warn(`[LockVault] Auto-withdraw disabled for vault ${vault.id}; no execution consumer is registered.`);
      }
    }
  }

  private processReloadSchedules() {
    const t = now();
    for (const [userId, schedule] of this.reloadSchedules.entries()) {
      // If never run, set lastRunAt so it doesn't fire immediately unless we want it to.
      // Usually, if they just set it, we wait one interval? 
      // Or if it's undefined, we run it now? Let's say we run it if it's never been run.
      const lastRun = schedule.lastRunAt || 0;
      let shouldRun = false;
      const dayMs = 24 * 60 * 60 * 1000;

      if (lastRun === 0) {
        shouldRun = true;
      } else if (schedule.interval === 'daily' && t - lastRun >= dayMs) {
        shouldRun = true;
      } else if (schedule.interval === 'weekly' && t - lastRun >= 7 * dayMs) {
        shouldRun = true;
      } else if (schedule.interval === 'monthly' && t - lastRun >= 30 * dayMs) {
        shouldRun = true;
      }

      if (shouldRun) {
        schedule.lastRunAt = t;
        this.schedulePersist();
        void eventRouter.publish('vault.reload_due', 'lockvault', {
          userId,
          amountRaw: schedule.amountRaw,
          interval: schedule.interval
        });
        console.log(`[LockVault] Reload due for user ${userId}: ${schedule.amountRaw} (${schedule.interval})`);
      }
    }
  }
}

export const vaultManager = new VaultManager();

export async function lockVault(input: LockVaultInput) { return vaultManager.lock(input); }
export function unlockVault(userId: string, vaultId: string) { return vaultManager.unlock(userId, vaultId); }
export function extendVault(userId: string, vaultId: string, additionalRaw: string) { return vaultManager.extend(userId, vaultId, additionalRaw); }
export function getVaultStatus(userId: string) { return vaultManager.status(userId); }
export function setAutoVault(userId: string, settings: AutoVaultSettings) { return vaultManager.setAutoVault(userId, settings); }
export async function processVaultBalanceUpdate(userId: string, balance: number, currency: 'USD' | 'SOL') { return vaultManager.processBalanceUpdate(userId, balance, currency); }
export function getAutoVault(userId: string) { return vaultManager.getAutoVault(userId); }
export function setReloadSchedule(userId: string, amountRaw: string, interval: 'daily' | 'weekly' | 'monthly') { return vaultManager.setReloadSchedule(userId, amountRaw, interval); }
export function getReloadSchedule(userId: string) { return vaultManager.getReloadSchedule(userId); }
export function startLockVaultBackgroundTasks() { return vaultManager.startBackgroundTasks(); }
export function stopLockVaultBackgroundTasks() { return vaultManager.stopBackgroundTasks(); }
export function depositToVault(userId: string, amount: number) { return vaultManager.deposit(userId, amount); }
export async function setVaultGuardians(userId: string, guardianIds: string[], approvalThreshold?: number) {
  return vaultManager.setGuardians(userId, guardianIds, approvalThreshold);
}
export async function addSecondOwner(userId: string, secondOwnerId: string) { 
  return vaultManager.addSecondOwner(userId, secondOwnerId);
}

export async function initiateWithdrawal(userId: string, amount: number) { 
  return vaultManager.initiateWithdrawal(userId, amount);
}

export async function approveWithdrawal(ownerUserId: string, approverUserId: string) { 
  return vaultManager.approveWithdrawal(ownerUserId, approverUserId);
}

export async function executeWithdrawal(userId: string) { 
  return vaultManager.executeWithdrawal(userId);
}
export function getWithdrawalApprovalsForUser(userId: string) {
  return vaultManager.getWithdrawalApprovals(userId);
}
export function getVaultBalance(userId: string) { return vaultManager.getBalance(userId); }
export function setWalletActionLockForUser(userId: string, durationMs: number, reason?: string) { return vaultManager.setWalletActionLock(userId, durationMs, reason); }
export function clearWalletActionLockForUser(userId: string) { return vaultManager.clearWalletActionLock(userId); }
export function getWalletActionLockForUser(userId: string) { return vaultManager.getWalletActionLock(userId); }
export function getWalletActionLockStatus(userId: string) { return vaultManager.getWalletActionLockStatus(userId); }
export function requestAdminWalletUnlockForUser(userId: string, requestedBy: string) {
  return vaultManager.requestAdminWalletUnlock(userId, requestedBy);
}
export function approveAdminWalletUnlockForUser(userId: string, approvedBy: string) {
  return vaultManager.approveAdminWalletUnlock(userId, approvedBy);
}
export function requestPaidWalletUnlockForUser(userId: string, requestedBy: string, feePercentage?: number) {
  return vaultManager.requestPaidWalletUnlock(userId, requestedBy, feePercentage);
}
export function settlePaidWalletUnlockForUser(userId: string, paidBy: string) {
  return vaultManager.settlePaidWalletUnlock(userId, paidBy);
}
