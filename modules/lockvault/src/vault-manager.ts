import { Keypair } from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';
import { parseAmount } from '@tiltcheck/natural-language-parser';

export interface LockVaultInput {
  userId: string;
  amountRaw: string; // e.g. "$100", "5 sol", "all"
  durationRaw: string; // e.g. "24h", "3d", "90m"
  reason?: string;
  currencyHint?: 'USD' | 'SOL';
}

export interface LockVaultRecord {
  id: string;
  userId: string;
  vaultAddress: string; // ephemeral magic-like wallet
  createdAt: number;
  unlockAt: number;
  lockedAmountSOL: number; // normalized to SOL
  originalInput: string;
  status: 'locked' | 'unlock-requested' | 'unlocked' | 'extended' | 'emergency-unlocked';
  history: { ts: number; action: string; note?: string }[];
  reason?: string;
  extendedCount: number;
}

function now() { return Date.now(); }
function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }

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
  private persistencePath = process.env.LOCKVAULT_STORE_PATH || 'data/lockvault.json';
  private persistDebounce?: NodeJS.Timeout;

  constructor() {
    this.load();
  }

  private schedulePersist() {
    clearTimeout(this.persistDebounce as any);
    this.persistDebounce = setTimeout(() => this.persist(), 250);
  }

  private persist() {
    try {
      const fs = require('fs');
      const path = require('path');
      const payload = JSON.stringify({ vaults: Array.from(this.vaults.values()) }, null, 2);
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.persistencePath, payload, 'utf-8');
    } catch (err) {
      console.error('[LockVault] Persist failed', err);
    }
  }

  private load() {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.persistencePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.persistencePath, 'utf-8'));
      for (const v of raw.vaults || []) {
        this.vaults.set(v.id, v);
        if (!this.byUser.has(v.userId)) this.byUser.set(v.userId, new Set());
        this.byUser.get(v.userId)!.add(v.id);
      }
      console.log(`[LockVault] Loaded ${this.vaults.size} vaults`);
    } catch (err) {
      console.error('[LockVault] Load failed', err);
    }
  }

  lock(input: LockVaultInput): LockVaultRecord {
    const amountParse = parseAmount(input.amountRaw);
    if (!amountParse.success || !amountParse.data) throw new Error(amountParse.error || 'Unable to parse amount');
    const parsedValue = amountParse.data.value;
    const isAll = amountParse.data.isAll;
    // For MVP treat USD as SOL 1:1 if currency was USD; real impl would convert via oracle
    const amountSOL = isAll ? 0 : parsedValue; // 0 signals "all" snapshot for UI; not executing transfer here
    const durationMs = parseDuration(input.durationRaw);
    if (durationMs < 10 * 60 * 1000) throw new Error('Minimum lock is 10m');
    if (durationMs > 30 * 24 * 60 * 60 * 1000) throw new Error('Maximum lock is 30d');

    const keypair = Keypair.generate();
    const record: LockVaultRecord = {
      id: generateId(),
      userId: input.userId,
      vaultAddress: keypair.publicKey.toBase58(),
      createdAt: now(),
      unlockAt: now() + durationMs,
      lockedAmountSOL: amountSOL,
      originalInput: input.amountRaw,
      status: 'locked',
      history: [{ ts: now(), action: 'locked', note: `duration=${input.durationRaw}` }],
      reason: input.reason,
      extendedCount: 0,
    };

    this.vaults.set(record.id, record);
    if (!this.byUser.has(record.userId)) this.byUser.set(record.userId, new Set());
    this.byUser.get(record.userId)!.add(record.id);
    this.schedulePersist();

    void eventRouter.publish('vault.locked' as any, 'lockvault' as any, { id: record.id, userId: record.userId, unlockAt: record.unlockAt, amountSOL: record.lockedAmountSOL });
    return record;
  }

  unlock(userId: string, vaultId: string): LockVaultRecord {
    const vault = this.vaults.get(vaultId);
    if (!vault || vault.userId !== userId) throw new Error('Vault not found');
    if (vault.status === 'unlocked') throw new Error('Vault already unlocked');
    if (now() < vault.unlockAt) {
      throw new Error(`Cannot unlock yet. Remaining ${(vault.unlockAt - now()) / 1000 | 0}s`);
    }
    vault.status = 'unlocked';
    vault.history.push({ ts: now(), action: 'unlocked' });
    this.schedulePersist();
    void eventRouter.publish('vault.unlocked' as any, 'lockvault' as any, { id: vault.id, userId: vault.userId });
    return vault;
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
    void eventRouter.publish('vault.extended' as any, 'lockvault' as any, { id: vault.id, userId: vault.userId, unlockAt: vault.unlockAt });
    return vault;
  }

  status(userId: string): LockVaultRecord[] {
    const ids = this.byUser.get(userId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.vaults.get(id)!).sort((a,b) => a.unlockAt - b.unlockAt);
  }

  get(vaultId: string): LockVaultRecord | undefined { return this.vaults.get(vaultId); }

  clearAll(): void { // test helper
    this.vaults.clear(); this.byUser.clear();
  }
}

export const vaultManager = new VaultManager();

export function lockVault(input: LockVaultInput) { return vaultManager.lock(input); }
export function unlockVault(userId: string, vaultId: string) { return vaultManager.unlock(userId, vaultId); }
export function extendVault(userId: string, vaultId: string, additionalRaw: string) { return vaultManager.extend(userId, vaultId, additionalRaw); }
export function getVaultStatus(userId: string) { return vaultManager.status(userId); }
