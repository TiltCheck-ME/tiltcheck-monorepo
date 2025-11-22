import fs from 'fs';
import path from 'path';
import { ulid } from 'ulid';
import { IdentityProfile, TrustSignal, WalletLink } from './types.js';

const DATA_FILE = process.env.IDENTITY_CORE_FILE || path.resolve('data/identity.json');

interface DataShape { profiles: Record<string, IdentityProfile>; }

function ensureFile() {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); } catch {}
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ profiles: {} }, null, 2));
  }
}
ensureFile();

function load(): DataShape {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return { profiles: {} }; }
}
function save(data: DataShape) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function band(score: number): IdentityProfile['trustBand'] {
  if (score >= 85) return 'PLATINUM';
  if (score >= 70) return 'GREEN';
  if (score >= 40) return 'YELLOW';
  return 'RED';
}

function recomputeScore(p: IdentityProfile): number {
  let score = 50; // base
  for (const s of p.signals) {
    score += s.value * s.weight * 50; // each signal shifts up to ±50 * weight
  }
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

export function getProfile(discordId: string): IdentityProfile {
  const data = load();
  let p = data.profiles[discordId];
  if (!p) {
    p = {
      discordId,
      wallets: [],
      trustScore: 50,
      trustBand: 'YELLOW',
      signals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.profiles[discordId] = p;
    save(data);
  }
  return p;
}

function persist(p: IdentityProfile) {
  const data = load();
  data.profiles[p.discordId] = p;
  save(data);
}

export function addWallet(discordId: string, type: string, address: string): IdentityProfile {
  const p = getProfile(discordId);
  if (!p.wallets.find(w => w.address === address)) {
    const w: WalletLink = { id: ulid(), type, address, verified: false, addedAt: new Date().toISOString() };
    p.wallets.push(w);
    p.updatedAt = new Date().toISOString();
    persist(p);
  }
  return p;
}

export function setEmail(discordId: string, email: string): IdentityProfile {
  const p = getProfile(discordId);
  p.email = email;
  p.updatedAt = new Date().toISOString();
  persist(p);
  return p;
}

export function addTrustSignal(discordId: string, source: string, metric: string, value: number, weight: number): IdentityProfile {
  const p = getProfile(discordId);
  const s: TrustSignal = { id: ulid(), discordId, source, metric, value, weight, createdAt: new Date().toISOString() };
  p.signals.push(s);
  p.trustScore = recomputeScore(p);
  p.trustBand = band(p.trustScore);
  p.updatedAt = new Date().toISOString();
  persist(p);
  return p;
}
