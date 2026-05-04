/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DEFAULT_DIR = path.join(os.tmpdir(), 'tiltcheck-prize-payout');
export const DEFAULT_LEDGER_FILENAME = 'payout-ledger.json';
export const DEFAULT_MAX_ATTEMPTS = 5;

function resolveDir(options = {}) {
  return options.dir ? path.resolve(options.dir) : DEFAULT_DIR;
}

function resolveLedgerPath(options = {}) {
  return path.join(resolveDir(options), DEFAULT_LEDGER_FILENAME);
}

function ensureLedgerDir(options = {}) {
  fs.mkdirSync(resolveDir(options), { recursive: true });
}

function defaultState() {
  return { payouts: [] };
}

function loadState(options = {}) {
  const ledgerPath = resolveLedgerPath(options);
  if (!fs.existsSync(ledgerPath)) {
    return defaultState();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    if (parsed && Array.isArray(parsed.payouts)) {
      return parsed;
    }
  } catch (error) {
    console.error('[prize-payout] Failed to read payout ledger:', error);
  }

  return defaultState();
}

function saveState(state, options = {}) {
  ensureLedgerDir(options);
  fs.writeFileSync(resolveLedgerPath(options), JSON.stringify(state, null, 2));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeRecipients(recipients) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('recipients must be a non-empty array');
  }

  const normalized = recipients
    .map((recipient) => String(recipient || '').trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new Error('recipients must contain at least one non-empty value');
  }

  return normalized;
}

function normalizePayload(payload = {}) {
  const idempotencyKey = String(payload.idempotencyKey || '').trim();
  const distributionId = String(payload.distributionId || '').trim();
  const total = Number(payload.total);

  if (!idempotencyKey) {
    throw new Error('idempotencyKey is required');
  }

  if (!distributionId) {
    throw new Error('distributionId is required');
  }

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('total must be a positive number');
  }

  return {
    idempotencyKey,
    distributionId,
    recipients: normalizeRecipients(payload.recipients),
    total,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
  };
}

function summarize(payout) {
  return {
    id: payout.id,
    idempotencyKey: payout.idempotencyKey,
    distributionId: payout.distributionId,
    recipients: [...payout.recipients],
    total: payout.total,
    status: payout.status,
    attempts: payout.attempts.map((attempt) => ({ ...attempt })),
    lastError: payout.lastError || null,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
    completedAt: payout.completedAt || null,
    metadata: { ...payout.metadata },
  };
}

function compareByCreatedAtDesc(left, right) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

export function initLedger(options = {}) {
  const state = loadState(options);
  saveState(state, options);
  return clone(state);
}

export function createPayout(payload, options = {}) {
  const normalized = normalizePayload(payload);
  const state = loadState(options);
  const existing = state.payouts.find((entry) => entry.idempotencyKey === normalized.idempotencyKey);

  if (existing) {
    return summarize(existing);
  }

  const now = new Date().toISOString();
  const payout = {
    id: crypto.randomUUID(),
    ...normalized,
    status: 'pending',
    attempts: [],
    lastError: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  state.payouts.push(payout);
  saveState(state, options);
  return summarize(payout);
}

export function listPayouts(options = {}) {
  const state = loadState(options);
  return state.payouts.slice().sort(compareByCreatedAtDesc).map(summarize);
}

export function getPayout(id, options = {}) {
  const state = loadState(options);
  const payout = state.payouts.find((entry) => entry.id === id);
  return payout ? summarize(payout) : null;
}

export function markPayoutAttempt(id, outcome = {}, options = {}) {
  const maxAttempts = Number(options.maxAttempts) > 0 ? Number(options.maxAttempts) : DEFAULT_MAX_ATTEMPTS;
  const state = loadState(options);
  const payout = state.payouts.find((entry) => entry.id === id);

  if (!payout) {
    throw new Error(`Payout not found: ${id}`);
  }

  const now = new Date().toISOString();
  const attempt = {
    at: now,
    success: Boolean(outcome.success),
    error: outcome.success ? null : String(outcome.error || 'unknown error'),
  };

  payout.attempts.push(attempt);
  payout.updatedAt = now;

  if (attempt.success) {
    payout.status = 'completed';
    payout.completedAt = now;
    payout.lastError = null;
  } else if (payout.attempts.length >= maxAttempts) {
    payout.status = 'failed';
    payout.lastError = attempt.error;
  } else {
    payout.status = 'pending';
    payout.lastError = attempt.error;
  }

  saveState(state, options);
  return summarize(payout);
}

export function retryPayout(id, options = {}) {
  const state = loadState(options);
  const payout = state.payouts.find((entry) => entry.id === id);

  if (!payout) {
    throw new Error(`Payout not found: ${id}`);
  }

  payout.status = 'pending';
  payout.updatedAt = new Date().toISOString();
  // Manual retry starts a fresh attempt budget for the same payout record.
  // Archive historical attempts to metadata to preserve audit trail before resetting budget.
  payout.metadata.retryHistory = payout.metadata.retryHistory || [];
  payout.metadata.retryHistory.push({ retriedAt: payout.updatedAt, attempts: [...payout.attempts] });
  payout.attempts = [];
  payout.lastError = null;
  payout.completedAt = null;
  saveState(state, options);
  return summarize(payout);
}

export function reconcilePayouts(options = {}) {
  const state = loadState(options);
  const summary = state.payouts.reduce(
    (acc, payout) => {
      acc.total += 1;
      acc[payout.status] = (acc[payout.status] || 0) + 1;
      return acc;
    },
    { total: 0, pending: 0, failed: 0, completed: 0 }
  );

  const stuck = state.payouts
    .filter((payout) => payout.status === 'failed' || payout.status === 'pending')
    .sort(compareByCreatedAtDesc)
    .map((payout) => ({
      id: payout.id,
      status: payout.status,
      attempts: payout.attempts.length,
      lastError: payout.lastError || null,
      updatedAt: payout.updatedAt,
    }));

  return {
    ...summary,
    stuck,
  };
}
