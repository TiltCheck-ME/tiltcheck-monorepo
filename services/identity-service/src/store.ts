import fs from 'fs';
import path from 'path';
import { ulid } from 'ulid';
import { IdentityProfile, TrustSignal, WalletLink } from './types.js';

const DATA_FILE = process.env.IDENTITY_DATA_FILE || path.resolve('data/identity.json');

interface DataShape {
  profiles: Record<string, IdentityProfile>;
}

function ensureFile() {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); } catch {}
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ profiles: {} }, null, 2));
  }
}

ensureFile();

function load(): DataShape {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { profiles: {} };
  }
}

function save(data: DataShape) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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

function band(score: number): IdentityProfile['trustBand'] {
  if (score >= 85) return 'PLATINUM';
  if (score >= 70) return 'GREEN';
  if (score >= 40) return 'YELLOW';
  return 'RED';
}

function recomputeScore(p: IdentityProfile): number {
  // Base 50, apply signals: score += (signal.value * signal.weight * 50)
  let score = 50;
  for (const s of p.signals) {
    score += (s.value * s.weight * 50);
  }
  // Clamp
  if (score > 100) score = 100;
  if (score < 0) score = 0;
  return Math.round(score);
}

function persistProfile(p: IdentityProfile) {
  const data = load();
  data.profiles[p.discordId] = p;
  save(data);
}

export function addWallet(discordId: string, type: string, address: string): IdentityProfile {
  const p = getProfile(discordId);
  const existing = p.wallets.find(w => w.address === address);
  if (existing) return p;
  const w: WalletLink = {
    id: ulid(),
    type,
    address,
    verified: false,
    addedAt: new Date().toISOString(),
  };
  p.wallets.push(w);
  p.updatedAt = new Date().toISOString();
  persistProfile(p);
  return p;
}

export function setEmail(discordId: string, email: string): IdentityProfile {
  const p = getProfile(discordId);
  p.email = email;
  p.updatedAt = new Date().toISOString();
  persistProfile(p);
  return p;
}

export function addTrustSignal(discordId: string, source: string, metric: string, value: number, weight: number): IdentityProfile {
  const p = getProfile(discordId);
  const s: TrustSignal = {
    id: ulid(),
    discordId,
    source: source as any,
    metric,
    value,
    weight,
    createdAt: new Date().toISOString(),
  };
  p.signals.push(s);
  p.trustScore = recomputeScore(p);
  p.trustBand = band(p.trustScore);
  p.updatedAt = new Date().toISOString();
  persistProfile(p);
  return p;
}

export function acceptLegal(discordId: string, termsVersion: string, privacyVersion: string): IdentityProfile {
  const p = getProfile(discordId);
  p.acceptedTermsVersion = termsVersion;
  p.acceptedTermsAt = new Date().toISOString();
  p.acceptedPrivacyVersion = privacyVersion;
  p.acceptedPrivacyAt = new Date().toISOString();
  p.updatedAt = new Date().toISOString();
  persistProfile(p);
  return p;
}

export function linkMagicIssuer(discordId: string, issuer: string): IdentityProfile {
  const p = getProfile(discordId);
  p.magicIssuer = issuer;
  p.updatedAt = new Date().toISOString();
  persistProfile(p);
  return p;
}
