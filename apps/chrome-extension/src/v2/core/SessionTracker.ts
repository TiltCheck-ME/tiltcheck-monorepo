/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

import type { RoundData } from './Sensor.js';

export interface SessionStatsSnapshot {
  startedAt: number;
  updatedAt: number | null;
  rounds: number;
  wagered: number;
  won: number;
  profitLoss: number;
  rtp: number | null;
  tiltScore: number;
  signalsAvailable: boolean;
  consecutiveLosses: number;
}

interface TrackerState {
  lastRoundAt: number | null;
  previousBet: number | null;
  previousWasLoss: boolean;
  fastRoundStreak: number;
  chaseStreak: number;
  consecutiveLosses: number;
  startingBalance: number | null;
  currentBalance: number | null;
}

const FAST_ROUND_MS = 2000;
const CHASE_MULTIPLIER = 1.5;

function toMoneyValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export class SessionTracker {
  private readonly startedAt = Date.now();
  private updatedAt: number | null = null;
  private rounds = 0;
  private wagered = 0;
  private won = 0;
  private state: TrackerState = {
    lastRoundAt: null,
    previousBet: null,
    previousWasLoss: false,
    fastRoundStreak: 0,
    chaseStreak: 0,
    consecutiveLosses: 0,
    startingBalance: null,
    currentBalance: null,
  };

  recordRound(round: RoundData): SessionStatsSnapshot {
    const bet = toMoneyValue(round.bet);
    const win = toMoneyValue(round.win);
    const timestamp = Number.isFinite(round.timestamp) ? round.timestamp : Date.now();
    const balance = Number.isFinite(round.balance) ? round.balance : null;
    const isLoss = bet > 0 && win < bet;

    this.rounds += 1;
    this.wagered += bet;
    this.won += win;
    this.updatedAt = timestamp;

    if (balance !== null) {
      if (this.state.startingBalance === null) {
        this.state.startingBalance = balance;
      }
      this.state.currentBalance = balance;
    }

    if (this.state.lastRoundAt !== null && timestamp - this.state.lastRoundAt <= FAST_ROUND_MS) {
      this.state.fastRoundStreak += 1;
    } else {
      this.state.fastRoundStreak = 0;
    }

    if (isLoss) {
      this.state.consecutiveLosses += 1;
    } else {
      this.state.consecutiveLosses = 0;
    }

    if (
      this.state.previousWasLoss &&
      this.state.previousBet !== null &&
      this.state.previousBet > 0 &&
      bet >= this.state.previousBet * CHASE_MULTIPLIER
    ) {
      this.state.chaseStreak += 1;
    } else if (bet > 0) {
      this.state.chaseStreak = 0;
    }

    this.state.previousBet = bet > 0 ? bet : this.state.previousBet;
    this.state.previousWasLoss = isLoss;
    this.state.lastRoundAt = timestamp;

    return this.snapshot();
  }

  snapshot(): SessionStatsSnapshot {
    const profitLoss = this.won - this.wagered;
    const rtp = this.wagered > 0 ? (this.won / this.wagered) * 100 : null;

    return {
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      rounds: this.rounds,
      wagered: this.wagered,
      won: this.won,
      profitLoss,
      rtp,
      tiltScore: this.calculateTiltScore(),
      signalsAvailable: this.rounds > 0,
      consecutiveLosses: this.state.consecutiveLosses,
    };
  }

  private calculateTiltScore(): number {
    if (this.rounds === 0) {
      return 0;
    }

    const lossPressure = Math.min(30, this.state.consecutiveLosses * 8);
    const pacePressure = Math.min(25, this.state.fastRoundStreak * 6);
    const chasePressure = Math.min(25, this.state.chaseStreak * 10);
    const rtpPressure = this.wagered > 0 && this.won / this.wagered < 0.5 ? 10 : 0;
    const drawdownPressure = this.calculateDrawdownPressure();

    return clampScore(lossPressure + pacePressure + chasePressure + rtpPressure + drawdownPressure);
  }

  private calculateDrawdownPressure(): number {
    const { startingBalance, currentBalance } = this.state;
    if (startingBalance === null || currentBalance === null || startingBalance <= 0 || currentBalance >= startingBalance) {
      return 0;
    }

    const drawdownPercent = (startingBalance - currentBalance) / startingBalance;
    return Math.min(20, drawdownPercent * 40);
  }
}
