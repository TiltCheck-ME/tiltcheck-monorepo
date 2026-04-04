// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

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
}

export interface BonusItem {
  id: string;
  casinoName: string;
  description: string;
  nextClaimAt: string | null;
  is_expired: boolean;
  is_verified: boolean;
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
  private _currentView: string = 'analyzer';
  private _currentGame: string = 'dad';
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
    correctAnswer: null
  };
  private _bonusFeed: BonusItem[] = [];
  private _channelSessions: Map<string, { userId: string; username: string; rounds: SessionRound[] }> = new Map();

  private handlers: Map<string, StateChangeHandler<unknown>[]> = new Map();

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
  get currentView(): string { return this._currentView; }
  get currentGame(): string { return this._currentGame; }

  setView(view: string): void {
    this._currentView = view;
    this.notify('view');
  }

  setGame(game: string): void {
    this._currentGame = game;
    this.notify('game');
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
}
