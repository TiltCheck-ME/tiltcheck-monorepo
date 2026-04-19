/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
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
}

export interface LockVaultRecord {
  id: string;
  userId: string;
  vaultAddress: string;
  vaultType: 'disposable' | 'linked' | 'magic';
  createdAt: number;
  unlockAt: number;
  lockedAmountSOL: number; // normalized to SOL
  originalInput: string;
  status: 'locked' | 'unlock-requested' | 'unlocked' | 'extended' | 'emergency-unlocked';
  history: { ts: number; action: string; note?: string }[];
  reason?: string;
  extendedCount: number;
  vaultSecret?: string; // AES-256-GCM encrypted for legacy disposable vaults only
  autoWithdraw?: boolean; // If true, auto-send to user's wallet on timer expiry
  secondOwnerId?: string;
  withdrawalProposal?: {
    amountSOL: number;
    initiatedBy: string;
    initiatedAt: number;
    approvedAt?: number;
    executionRequestedAt?: number;
    executionRequestId?: string;
    executionTimeoutAt?: number;
    executionAttempts?: number;
    lastRecoveryAt?: number;
    lastRecoveryReason?: 'execution-timeout';
    status: 'pending' | 'approved' | 'execution-pending';
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
        this.vaults.set(v.id, v);
        if (!this.byUser.has(v.userId)) this.byUser.set(v.userId, new Set());
        this.byUser.get(v.userId)!.add(v.id);
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

  async lock(input: LockVaultInput): Promise<LockVaultRecord> {
    if (input.autoWithdraw) {
      throw createFeatureNotImplementedError(
        'LockVault auto-withdraw is temporarily disabled until a real execution consumer is wired.'
      );
    }
    if (!input.disclaimerAccepted) {
      throw new Error('You must explicitly acknowledge the Digital Asset Risk and Zero Custody disclosures before deploying a LockVault.');
    }
    const amountParse = parseAmount(input.amountRaw);
    if (!amountParse.success || !amountParse.data) throw new Error(amountParse.error || 'Unable to parse amount');
    const parsedValue = amountParse.data.value;
    const isAll = amountParse.data.isAll;
    // Convert USD to SOL if needed using oracle
    let amountSOL: number;
    if (isAll) {
      throw new Error('Locking "all" is not currently supported.');
    } else if (input.currencyHint === 'USD' || amountParse.data.currency === 'USD') {
      const solPrice = getUsdPriceSync('SOL');
      if (!solPrice || solPrice <= 0) {
        throw new Error('Unable to fetch SOL price. Please try again later.');
      }
      amountSOL = parsedValue / solPrice;
    } else {
      amountSOL = parsedValue;
    }
    if (!Number.isFinite(amountSOL) || amountSOL <= 0) {
      throw new Error('Lock amount must be a positive number.');
    }
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

    const record: LockVaultRecord = {
      id: generateId(),
      userId: input.userId,
      vaultAddress,
      vaultType,
      createdAt: now(),
      unlockAt: now() + durationMs,
      lockedAmountSOL: amountSOL,
      originalInput: input.amountRaw,
      status: 'locked',
      history: [{ ts: now(), action: 'locked', note: `duration=${input.durationRaw}, type=${vaultType}` }],
      reason: input.reason,
      extendedCount: 0,
      autoWithdraw: input.autoWithdraw ?? false,
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
    const vault = this.vaults.get(vaultId);
    if (!vault || vault.userId !== userId) throw new Error('Vault not found');
    const nowTs = now();
    if (nowTs < vault.unlockAt) {
      throw new Error(`Cannot unlock yet. Remaining ${(vault.unlockAt - nowTs) / 1000 | 0}s`);
    }
    // If a background task already auto-unlocked this vault, make unlock() idempotent and just return the decrypted secret.
    if (vault.status !== 'unlocked') {
      vault.status = 'unlocked';
      vault.history.push({ ts: nowTs, action: 'unlocked' });
      this.schedulePersist();
      void eventRouter.publish('vault.unlocked', 'lockvault', { id: vault.id, userId: vault.userId });
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
    if (vault.status !== 'locked' && vault.status !== 'extended') throw new Error('Cannot extend now');
    const addMs = parseDuration(additionalRaw);
    vault.unlockAt += addMs;
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
    if (this.recoverStaleExecutionPending(vault, now())) {
      this.schedulePersist();
    }
    return vault;
  }

  deposit(userId: string, amount: number): number {
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
      .filter((v): v is LockVaultRecord => Boolean(v) && (v!.status === 'locked' || v!.status === 'extended'))
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
    requiredProposalState?: 'pending' | 'approved' | 'execution-pending' | Array<'pending' | 'approved' | 'execution-pending'>,
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
        if (!v.secondOwnerId) return false;
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
      throw new Error('No dual-owner vault found for user');
    }
    return records[0];
  }

  addSecondOwner(userId: string, secondOwnerId: string): LockVaultRecord {
    const normalizedSecondOwner = secondOwnerId.trim();
    if (!normalizedSecondOwner) throw new Error('secondOwnerId is required');
    if (normalizedSecondOwner === userId) throw new Error('secondOwnerId must be different from userId');

    const vault = this.getLatestVaultForUser(userId);
    vault.secondOwnerId = normalizedSecondOwner;
    vault.history.push({ ts: now(), action: 'second-owner-added', note: normalizedSecondOwner });
    this.schedulePersist();
    return vault;
  }

  initiateWithdrawal(userId: string, amount: number): LockVaultRecord {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Withdrawal amount must be a positive finite number.');
    }

    const vault = this.getLatestDualOwnerVaultForUser(userId);
    const nowTs = now();
    if ((vault.status === 'locked' || vault.status === 'extended') && nowTs >= vault.unlockAt) {
      vault.status = 'unlocked';
      vault.history.push({ ts: nowTs, action: 'auto-unlocked', note: 'Timer expired during withdrawal initiation' });
    }
    if (vault.status !== 'unlocked') {
      throw new Error('Vault must be unlocked before initiating withdrawal.');
    }
    if (amount > vault.lockedAmountSOL) {
      throw new Error('Withdrawal amount exceeds locked balance.');
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
      status: 'pending',
    };
    vault.history.push({ ts: nowTs, action: 'withdrawal-initiated', note: `${amount} SOL` });
    this.schedulePersist();
    return vault;
  }

  approveWithdrawal(ownerUserId: string, approverUserId: string): LockVaultRecord {
    const vault = this.getLatestDualOwnerVaultForUser(ownerUserId, 'pending');
    if (!vault.secondOwnerId) {
      throw new Error('Vault does not have a second owner configured.');
    }
    if (approverUserId !== vault.secondOwnerId) {
      throw new Error('Only the second owner can approve this withdrawal.');
    }

    const proposal = vault.withdrawalProposal;
    if (!proposal || proposal.status !== 'pending') {
      throw new Error('No pending withdrawal to approve.');
    }

    const nowTs = now();
    proposal.status = 'approved';
    proposal.approvedAt = nowTs;
    vault.history.push({ ts: nowTs, action: 'withdrawal-approved', note: `approvedBy=${approverUserId}` });
    this.schedulePersist();
    return vault;
  }

  executeWithdrawal(userId: string): LockVaultRecord {
    const vault = this.getLatestDualOwnerVaultForUser(userId, ['approved', 'execution-pending'], false);
    const proposal = vault.withdrawalProposal;
    const nowTs = now();

    if ((vault.status === 'locked' || vault.status === 'extended') && nowTs >= vault.unlockAt) {
      vault.status = 'unlocked';
      vault.history.push({ ts: nowTs, action: 'auto-unlocked', note: 'Timer expired during withdrawal execution' });
    }
    if (vault.status !== 'unlocked') {
      throw new Error('Vault must be unlocked before executing withdrawal.');
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
    if (proposal.amountSOL > vault.lockedAmountSOL) {
      throw new Error('Withdrawal amount exceeds available vault balance.');
    }

    const executionRequestId = generateId();
    proposal.status = 'execution-pending';
    proposal.executionRequestedAt = nowTs;
    proposal.executionRequestId = executionRequestId;
    proposal.executionTimeoutAt = nowTs + WITHDRAWAL_EXECUTION_TIMEOUT_MS;
    proposal.executionAttempts = (proposal.executionAttempts || 0) + 1;
    delete proposal.lastRecoveryAt;
    delete proposal.lastRecoveryReason;
    vault.history.push({
      ts: nowTs,
      action: 'withdrawal-execution-requested',
      note: `${proposal.amountSOL} SOL requestId=${executionRequestId} timeoutMs=${WITHDRAWAL_EXECUTION_TIMEOUT_MS}`,
    });
    void eventRouter.publish('vault.withdrawal_execution_requested', 'lockvault', {
      id: vault.id,
      userId: vault.userId,
      vaultAddress: vault.vaultAddress,
      vaultType: vault.vaultType,
      amountSOL: proposal.amountSOL,
      executionRequestId,
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
      if ((vault.status === 'locked' || vault.status === 'extended') && t >= vault.unlockAt) {
        // Auto-unlock the vault (funds are accessible, no action required from user)
        vault.status = 'unlocked';
        vault.history.push({ ts: t, action: 'auto-unlocked', note: 'Timer expired — funds available to claim or withdraw' });
        this.schedulePersist();

        console.log(`[LockVault] Vault ${vault.id} auto-unlocked for user ${vault.userId}`);

        void eventRouter.publish('vault.unlocked', 'lockvault', {
          id: vault.id,
          userId: vault.userId,
          address: vault.vaultAddress,
          amountSOL: vault.lockedAmountSOL,
          autoUnlocked: true,
        });

        // Auto-withdraw stays disabled until a real execution consumer exists.
        if (vault.autoWithdraw) {
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
