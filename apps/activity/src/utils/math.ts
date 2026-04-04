// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import type { SessionRound } from '../state/SessionState.js';

export function calcActualRtp(rounds: readonly SessionRound[]): number {
  if (rounds.length === 0) return 0;
  const wagered = rounds.reduce((s, r) => s + r.bet, 0);
  const returned = rounds.reduce((s, r) => s + r.win, 0);
  if (wagered === 0) return 0;
  return (returned / wagered) * 100;
}

export function calcDrift(actual: number, expected: number): number {
  return actual - expected;
}

export function calcConfidence(roundCount: number): 'NEED DATA' | 'LOW' | 'MODERATE' | 'GOOD' | 'HIGH' {
  if (roundCount < 50) return 'NEED DATA';
  if (roundCount < 100) return 'LOW';
  if (roundCount < 250) return 'MODERATE';
  if (roundCount < 500) return 'GOOD';
  return 'HIGH';
}

export function calcNetPL(rounds: readonly SessionRound[]): number {
  return rounds.reduce((s, r) => s + r.win - r.bet, 0);
}

export function calcWinRate(rounds: readonly SessionRound[]): number {
  if (rounds.length === 0) return 0;
  const wins = rounds.filter(r => r.win > r.bet).length;
  return (wins / rounds.length) * 100;
}

export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}H ${m}M`;
  if (m > 0) return `${m}M ${s}S`;
  return `${s}S`;
}

export function formatCurrency(value: number, decimals = 2): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';
  return `${sign}$${abs.toFixed(decimals)}`;
}

export function getDriftClass(drift: number): string {
  if (Math.abs(drift) < 2) return 'drift-neutral';
  return drift > 0 ? 'drift-positive' : 'drift-negative';
}
