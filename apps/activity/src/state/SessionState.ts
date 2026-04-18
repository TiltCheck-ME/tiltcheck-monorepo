// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import {
  loadActivityProgression,
  recordProgressionPromptStart,
  recordProgressionRecapVisit,
  recordProgressionRoundResult,
  saveActivityProgression,
  type ActivityBadge,
  type ActivityProgression,
} from './activityProgression.js';

export interface SessionRound {
  bet: number;
  win: number;
  timestamp: number;
}

export interface VaultStatus {
  activeVaults: number;
  profitGuardActive: boolean;
  totalVaultedBalance: number;
  profitGuardThreshold: number;
  lockedUntil: Date | null;
}

export interface TriviaState {
  question: string;
  options: string[];
  prizePool: number;
  leaderboard: Array<{ username: string; score: number }>;
  timeRemaining: number;
  correctAnswer: string | null;
  category: string | null;
  theme: string | null;
  roundNumber: number;
  totalRounds: number;
  explanation: string | null;
  selectedAnswer: string | null;
  answerLocked: boolean;
  answerDistribution: Array<{ choice: string; count: number; correct: boolean }>;
}

export interface BonusItem {
  id: string;
  casinoName: string;
  description: string;
  nextClaimAt: string | null;
  is_expired: boolean;
  is_verified: boolean;
}

export interface TipRain {
  id: string;
  fromUserId: string;
  fromUsername: string;
  amountSol: number;
  amountUsd: number;
  message: string;
  expiresAt: number;
  claimable: boolean;
}

export interface TipEntry {
  id: string;
  fromUsername: string;
  toUsername: string;
  amountSol: number;
  message: string;
  timestamp: number;
  claimed: boolean;
}

export type ActivityView = 'home' | 'play' | 'bonuses' | 'recap';

export type ActivityStage = 'lobby' | 'in-round' | 'post-round';

export interface ActivityRecap {
  title: string;
  detail: string;
  updatedAt: number | null;
}

export interface ProgressionRoundResult {
  questionId: string;
  survived: boolean;
  usedCrowdRead: boolean;
}

type StateChangeHandler<T> = (value: T) => void;

export class SessionState {
  private _userId: string = 'unknown';
  private _username: string = 'Anonymous';
  private _casino: string = '';
  private _game: string = '';
  private _rounds: SessionRound[] = [];
  private _expectedRtp: number = 96.5;
  private _startedAt: number = Date.now();
  private _currentView: ActivityView = 'home';
  private _currentGame: string = 'trivia';
  private _roundStage: ActivityStage = 'lobby';
  private _participantCount: number = 1;
  private _voiceActive: boolean = false;
  private _orientation: 'landscape' | 'portrait' = 'landscape';
  private _vault: VaultStatus = {
    activeVaults: 0,
    profitGuardActive: false,
    totalVaultedBalance: 0,
    profitGuardThreshold: 500,
    lockedUntil: null
  };
  private _trivia: TriviaState = {
    question: 'Waiting for round...',
    options: [],
    prizePool: 0,
    leaderboard: [],
    timeRemaining: 0,
    correctAnswer: null,
    category: null,
    theme: null,
    roundNumber: 0,
    totalRounds: 0,
    explanation: null,
    selectedAnswer: null,
    answerLocked: false,
    answerDistribution: []
  };
  private _bonusFeed: BonusItem[] = [];
  private _channelSessions: Map<string, { userId: string; username: string; rounds: SessionRound[] }> = new Map();
  private _activeRain: TipRain | null = null;
  private _tipHistory: TipEntry[] = [];
  private _feeSavedSol: number = 0;
  private _isElite: boolean = false;
  private _activityRecap: ActivityRecap = {
    title: 'Lobby is live',
    detail: 'Home is armed. Queue up the next round when the room is ready.',
    updatedAt: null
  };
  private _progression: ActivityProgression;
  private seenProgressionPromptIds: Set<string> = new Set();
  private seenProgressionResultIds: Set<string> = new Set();
  private seenRecapUpdateKeys: Set<string> = new Set();

  private handlers: Map<string, StateChangeHandler<unknown>[]> = new Map();

  constructor() {
    this._progression = loadActivityProgression();
  }

  // --------------------------------------------------------
  // User identity
  // --------------------------------------------------------
  get userId(): string { return this._userId; }
  get username(): string { return this._username; }

  setIdentity(userId: string, username: string): void {
    this._userId = userId;
    this._username = username;
    this.notify('identity');
  }

  // --------------------------------------------------------
  // Session rounds
  // --------------------------------------------------------
  get rounds(): readonly SessionRound[] { return this._rounds; }
  get startedAt(): number { return this._startedAt; }
  get expectedRtp(): number { return this._expectedRtp; }
  get casino(): string { return this._casino; }
  get game(): string { return this._game; }

  addRound(round: SessionRound): void {
    this._rounds = [...this._rounds, round];
    this.notify('rounds');
  }

  resetSession(): void {
    this._rounds = [];
    this._startedAt = Date.now();
    this.notify('rounds');
  }

  setGameContext(casino: string, game: string, expectedRtp?: number): void {
    this._casino = casino;
    this._game = game;
    if (expectedRtp !== undefined) this._expectedRtp = expectedRtp;
    this.notify('gameContext');
  }

  // --------------------------------------------------------
  // Navigation
  // --------------------------------------------------------
  get currentView(): ActivityView { return this._currentView; }
  get currentGame(): string { return this._currentGame; }
  get roundStage(): ActivityStage { return this._roundStage; }
  get activityRecap(): ActivityRecap { return { ...this._activityRecap }; }

  setView(view: ActivityView): void {
    if (this._currentView === view) return;
    this._currentView = view;
    this.notify('view');
  }

  setGame(game: string): void {
    this._currentGame = game;
    this.notify('game');
  }

  setRoundStage(stage: ActivityStage, recap?: Partial<ActivityRecap>): void {
    if (this._roundStage !== stage) {
      this._roundStage = stage;
      this.notify('stage');
    }

    if (recap) {
      const title = recap.title ?? this._activityRecap.title;
      const detail = recap.detail ?? this._activityRecap.detail;
      const recapChanged = title !== this._activityRecap.title || detail !== this._activityRecap.detail;
      if (!recapChanged && recap.updatedAt === undefined) {
        return;
      }

      const nextRecap: ActivityRecap = {
        ...this._activityRecap,
        ...recap,
        title,
        detail,
        updatedAt: recap.updatedAt ?? Date.now()
      };
      this._activityRecap = nextRecap;
      this.notify('recap');
    }
  }

  setActivityRecap(title: string, detail: string, updatedAt = Date.now()): void {
    this._activityRecap = { title, detail, updatedAt };
    this.notify('recap');
  }

  // --------------------------------------------------------
  // Progression
  // --------------------------------------------------------
  get progression(): ActivityProgression {
    return {
      ...this._progression,
      badges: this._progression.badges.map((badge: ActivityBadge) => ({ ...badge })),
    };
  }

  recordProgressionPromptStart(questionId: string, participantCount: number, at = Date.now()): void {
    if (this.seenProgressionPromptIds.has(questionId)) {
      return;
    }

    this.seenProgressionPromptIds.add(questionId);
    this._progression = recordProgressionPromptStart(this._progression, {
      at,
      participantCount,
    });
    this.persistProgression();
  }

  recordProgressionRoundResult(result: ProgressionRoundResult, at = Date.now()): void {
    if (this.seenProgressionResultIds.has(result.questionId)) {
      return;
    }

    this.seenProgressionResultIds.add(result.questionId);
    this._progression = recordProgressionRoundResult(this._progression, {
      at,
      survived: result.survived,
      usedCrowdRead: result.usedCrowdRead,
    });
    this.persistProgression();
  }

  recordProgressionRecapVisit(at = Date.now()): void {
    const recapKey = this._activityRecap.updatedAt === null ? `none:${at}` : String(this._activityRecap.updatedAt);
    if (this.seenRecapUpdateKeys.has(recapKey)) {
      return;
    }

    this.seenRecapUpdateKeys.add(recapKey);
    this._progression = recordProgressionRecapVisit(this._progression, at);
    this.persistProgression();
  }

  // --------------------------------------------------------
  // Participants & voice
  // --------------------------------------------------------
  get participantCount(): number { return this._participantCount; }
  get voiceActive(): boolean { return this._voiceActive; }
  get orientation(): 'landscape' | 'portrait' { return this._orientation; }

  setParticipantCount(count: number): void {
    this._participantCount = count;
    this.notify('participants');
  }

  setVoiceActive(active: boolean): void {
    this._voiceActive = active;
    this.notify('voice');
  }

  setOrientation(o: 'landscape' | 'portrait'): void {
    this._orientation = o;
    this.notify('orientation');
  }

  // --------------------------------------------------------
  // Vault
  // --------------------------------------------------------
  get vault(): VaultStatus { return { ...this._vault }; }

  updateVault(partial: Partial<VaultStatus>): void {
    this._vault = { ...this._vault, ...partial };
    this.notify('vault');
  }

  // --------------------------------------------------------
  // Trivia
  // --------------------------------------------------------
  get trivia(): TriviaState { return { ...this._trivia }; }

  updateTrivia(partial: Partial<TriviaState>): void {
    this._trivia = { ...this._trivia, ...partial };
    this.notify('trivia');
  }

  // --------------------------------------------------------
  // Bonus feed
  // --------------------------------------------------------
  get bonusFeed(): readonly BonusItem[] { return this._bonusFeed; }

  setBonusFeed(items: BonusItem[]): void {
    this._bonusFeed = items;
    this.notify('bonusFeed');
  }

  addBonus(item: BonusItem): void {
    if (!this._bonusFeed.find(b => b.id === item.id)) {
      this._bonusFeed = [item, ...this._bonusFeed];
      this.notify('bonusFeed');
    }
  }

  // --------------------------------------------------------
  // Channel sessions (other participants)
  // --------------------------------------------------------
  get channelSessions(): Map<string, { userId: string; username: string; rounds: SessionRound[] }> {
    return new Map(this._channelSessions);
  }

  updateChannelSession(userId: string, username: string, rounds: SessionRound[]): void {
    this._channelSessions.set(userId, { userId, username, rounds });
    this.notify('channelSessions');
  }

  // --------------------------------------------------------
  // Tips
  // --------------------------------------------------------
  get activeRain(): TipRain | null { return this._activeRain; }
  get tipHistory(): readonly TipEntry[] { return this._tipHistory; }
  get feeSavedSol(): number { return this._feeSavedSol; }
  get isElite(): boolean { return this._isElite; }

  setActiveRain(rain: TipRain | null): void {
    this._activeRain = rain;
    this.notify('tip');
  }

  addTipToHistory(entry: TipEntry): void {
    if (!this._tipHistory.find(t => t.id === entry.id)) {
      this._tipHistory = [entry, ...this._tipHistory].slice(0, 20);
      this.notify('tip');
    }
  }

  setEliteStatus(isElite: boolean, feeSavedSol: number): void {
    this._isElite = isElite;
    this._feeSavedSol = feeSavedSol;
    this.notify('tip');
  }

  // --------------------------------------------------------
  // Reactive subscriptions
  // --------------------------------------------------------
  on(event: string, handler: StateChangeHandler<unknown>): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: StateChangeHandler<unknown>): void {
    const list = this.handlers.get(event);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  private notify(event: string): void {
    this.handlers.get(event)?.forEach(h => h(undefined));
    this.handlers.get('*')?.forEach(h => h(event));
  }

  private persistProgression(): void {
    saveActivityProgression(this._progression);
    this.notify('progression');
  }
}
