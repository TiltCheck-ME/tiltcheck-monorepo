// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import type { SessionState, TriviaState } from '../state/SessionState.js';
import type { HubRelay } from '../sdk/HubRelay.js';

type TriviaPackId = 'rapid-trivia' | 'tilt-check' | 'safe-or-sketchy';
type TriviaPromptMode = 'rapid-trivia' | 'tilt-or-skill' | 'safe-or-sketchy' | 'cash-out-or-chase';

const TRIVIA_FUNDING_URL = 'https://tiltcheck.me/pay/jackpot?amount=1';
const TRIVIA_ACTIVITY_URL = 'https://activity.tiltcheck.me';
const TRIVIA_DISCORD_URL = 'https://discord.gg/gdBsEJfCar';

const TRIVIA_PACKS: Record<
  TriviaPackId,
  { label: string; category: string; theme: string; totalRounds: number; detail: string }
> = {
  'rapid-trivia': {
    label: 'Rapid Trivia',
    category: 'general',
    theme: 'Rapid Trivia',
    totalRounds: 5,
    detail: 'Five fast prompts pulled from the live question bank. Good for a quick room reset.',
  },
  'tilt-check': {
    label: 'Tilt or Skill',
    category: 'strategy',
    theme: 'Tilt or Skill',
    totalRounds: 5,
    detail: 'Short judgment-heavy rounds around bankroll discipline, tilt, and edge.',
  },
  'safe-or-sketchy': {
    label: 'Safe or Sketchy',
    category: 'degen',
    theme: 'Safe or Sketchy',
    totalRounds: 5,
    detail: 'Degen culture and risk-read prompts. Shield it or chase the crowd read.',
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatGameLabel(game: string): string {
  return game === 'dad' ? 'DA&D' : 'Party Loop';
}

function formatTriviaModeLabel(mode: TriviaPromptMode): string {
  switch (mode) {
    case 'tilt-or-skill':
      return 'Tilt or Skill';
    case 'safe-or-sketchy':
      return 'Safe or Sketchy';
    case 'cash-out-or-chase':
      return 'Cash Out or Chase';
    default:
      return 'Rapid Trivia';
  }
}

export class GameView {
  private container: HTMLElement;
  private state: SessionState;
  private relay: HubRelay;
  private triviaGameId: string | null = null;
  private triviaQuestionId: string | null = null;
  private triviaJoinRequested = false;
  private triviaJoined = false;
  private triviaError: string | null = null;
  private triviaTimerId: ReturnType<typeof setInterval> | null = null;
  private triviaEliminated = false;
  private triviaShieldUsed = false;
  private triviaShieldArmed = false;
  private triviaBuyBackUsed = false;
  private triviaApeInUsed = false;
  private triviaScheduling = false;
  private dadState: {
    hand: Array<{ id: string; text: string }>;
    blackCard: string;
    scores: Map<string, number>;
    phase: 'waiting' | 'playing' | 'voting' | 'results';
    winner: string | null;
  } = { hand: [], blackCard: '', scores: new Map(), phase: 'waiting', winner: null };

  constructor(container: HTMLElement, state: SessionState, relay: HubRelay) {
    this.container = container;
    this.state = state;
    this.relay = relay;
  }

  mount(): void {
    this.render();
    this.state.on('game', () => this.render());
    this.state.on('progression', () => this.render());
    this.state.on('trivia', () => {
      if (this.state.currentGame === 'trivia') {
        this.render();
      }
    });

    this.relay.on('dad.round', (data: unknown) => {
      const d = data as {
        hand?: Array<{ id: string; text: string }>;
        blackCard?: string;
        phase?: 'waiting' | 'playing' | 'voting' | 'results';
        scores?: Record<string, number>;
        winner?: string;
      };
      if (d.hand) this.dadState.hand = d.hand;
      if (d.blackCard) this.dadState.blackCard = d.blackCard;
      if (d.phase) this.dadState.phase = d.phase;
      if (d.scores) this.dadState.scores = new Map(Object.entries(d.scores));
      if (d.winner !== undefined) this.dadState.winner = d.winner;
      if (this.state.currentGame === 'dad') this.render();
    });

    this.relay.on('game.update', (data: unknown) => this.handleGameUpdate(data));
    this.relay.on('game.error', (data: unknown) => this.handleGameError(data));
    this.relay.on('trivia.round.start', (data: unknown) => this.handleTriviaRoundStart(data));
    this.relay.on('trivia.round.reveal', (data: unknown) => this.handleTriviaRoundReveal(data));
    this.relay.on('trivia.ape-in.result', (data: unknown) => this.handleTriviaApeInResult(data));
    this.relay.on('trivia.shield.result', (data: unknown) => this.handleTriviaShieldResult(data));

    const triviaSnapshot = this.relay.getTriviaSnapshot();
    if (triviaSnapshot.started) {
      this.handleGameUpdate(triviaSnapshot.started);
    }
    if (triviaSnapshot.roundStart) {
      this.handleTriviaRoundStart(triviaSnapshot.roundStart);
    }
    if (triviaSnapshot.roundReveal) {
      this.handleTriviaRoundReveal(triviaSnapshot.roundReveal);
    }
  }

  render(): void {
    const game = this.state.currentGame;
    const stage = this.syncShellState(game);
    const stageContent = this.getStageContent(stage, game);
    const progression = this.state.progression;
    const latestBadge = progression.badges.at(-1);

    const content = game === 'dad' ? this.renderDAD() : this.renderTrivia();

    this.container.innerHTML = `
      <div class="view-game">
        <div class="shell-card play-shell-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">Play state</p>
              <h2 class="shell-title">Play</h2>
           </div>
            <span class="stage-pill stage-${stage}">${stageContent.label}</span>
          </div>
          <p class="shell-copy">${stageContent.title}</p>
          <p class="shell-subcopy">${stageContent.detail}</p>
        </div>
        <div class="shell-card play-shell-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">Room clout</p>
              <h3 class="shell-title">${progression.currentTitle}</h3>
            </div>
            <span class="stage-pill stage-lobby">${progression.dailyStreak}D</span>
          </div>
          <div class="shell-metrics">
            <div class="shell-metric">
              <span class="shell-metric-label">Weekly clout</span>
              <span class="shell-metric-value">${progression.weeklyClout}</span>
            </div>
            <div class="shell-metric">
              <span class="shell-metric-label">Prompts cleared</span>
              <span class="shell-metric-value">${progression.promptsCleared}</span>
            </div>
            <div class="shell-metric">
              <span class="shell-metric-label">Badges</span>
              <span class="shell-metric-value">${progression.badges.length}</span>
            </div>
          </div>
          <p class="shell-subcopy">${latestBadge
            ? `Latest badge: ${latestBadge.label}. ${latestBadge.detail}`
            : 'Light hook only. Show up, clear prompts, and hit recap for the room tape.'}
          </p>
        </div>
        <div class="game-tabs">
          <button class="game-tab ${game === 'trivia' ? 'active' : ''}" data-game="trivia">Party Loop</button>
          <button class="game-tab ${game === 'dad' ? 'active' : ''}" data-game="dad">DA&amp;D</button>
        </div>
        <div class="game-content" id="game-container">${content}</div>
      </div>
    `;

    this.container.querySelectorAll('.game-tab').forEach((button) => {
      button.addEventListener('click', () => {
        const nextGame = (button as HTMLElement).dataset.game ?? 'trivia';
        this.state.setGame(nextGame);
        this.state.setRoundStage('lobby', {
          title: `${formatGameLabel(nextGame)} lobby armed`,
          detail: nextGame === 'trivia'
            ? 'Short-round party prompts are staged. Start a pack or join the live room.'
            : 'Play is staged. Wait for the next live round or force a join when the room opens.',
        });
        if (nextGame === 'trivia') {
          this.render();
          return;
        }
        this.relay.joinLobby(nextGame);
      });
    });

    this.attachGameListeners();
  }

  private renderDAD(): string {
    const { phase, blackCard, hand, scores, winner } = this.dadState;

    if (phase === 'waiting' || !blackCard) {
      return `
        <div class="waiting-state">
          <p class="waiting-title">DA&amp;D - Degens Against Degens</p>
          <p class="waiting-sub">Judge mode is still wired. The room is waiting for the next black card.</p>
          <button class="btn-game" id="dad-join-btn">Join Lobby</button>
        </div>`;
    }

    if (winner) {
      return `
        <div class="winner-state">
          <p class="winner-title">ROUND WINNER</p>
          <p class="winner-name">${escapeHtml(winner)}</p>
          <button class="btn-game" id="dad-next-btn">Next Round</button>
        </div>`;
    }

    const handHtml = hand.map((card) => `
      <button class="dad-card" data-card-id="${escapeHtml(card.id)}">${escapeHtml(card.text)}</button>
    `).join('');

    const scoresHtml = [...scores.entries()].map(([user, score]) =>
      `<div class="score-row"><span>${escapeHtml(user)}</span><span>${score}</span></div>`
    ).join('');

    return `
      <div class="dad-state">
        <div class="black-card">${escapeHtml(blackCard)}</div>
        <div class="dad-hand">${handHtml}</div>
        ${scoresHtml ? `<div class="scores">${scoresHtml}</div>` : ''}
      </div>`;
  }

  private renderTrivia(): string {
    const trivia = this.state.trivia;
    const promptMode = this.getTriviaPromptMode(trivia);
    const leaderboard = this.renderLeaderboard(trivia.leaderboard);
    const roundMeta = trivia.totalRounds > 0
      ? `<div class="shell-metrics">
          <div class="shell-metric">
            <span class="shell-metric-label">Pack</span>
            <span class="shell-metric-value">${formatTriviaModeLabel(promptMode)}</span>
          </div>
          <div class="shell-metric">
            <span class="shell-metric-label">Round</span>
            <span class="shell-metric-value">${Math.max(trivia.roundNumber, 0)}/${trivia.totalRounds}</span>
          </div>
          <div class="shell-metric">
            <span class="shell-metric-label">Pool</span>
            <span class="shell-metric-value">${trivia.prizePool.toFixed(3)} SOL</span>
          </div>
        </div>`
      : '';

    if (!this.triviaGameId) {
      return `
        <div class="shell-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">Party room</p>
              <h3 class="shell-title">Short rounds only</h3>
            </div>
            <span class="stage-pill stage-lobby">Lobby</span>
          </div>
          <p class="shell-copy">${this.triviaScheduling ? 'Arming the next pack. Hold the room.' : 'No live party loop is armed. Spin one up and keep it moving.'}</p>
          <p class="shell-subcopy">Testing lives here. Funding the public trivia pot lives on the web and in Discord. Start a pack here when you want to validate the room loop without waiting on a Discord drop.</p>
          <div class="room-list">
            ${Object.entries(TRIVIA_PACKS).map(([id, pack]) => `
              <div class="room-user-card">
                <span class="room-user-name">${escapeHtml(pack.label)}</span>
                <span class="stat-value">${pack.totalRounds} rounds</span>
                <p class="waiting-sub" style="width: 100%; margin: 0.4rem 0 0;">${escapeHtml(pack.detail)}</p>
                <button class="btn-game trivia-pack-btn" data-pack="${id}">Start ${escapeHtml(pack.label)}</button>
              </div>
            `).join('')}
          </div>
          <div class="room-hud" style="margin-top: 1rem;">
            <p class="section-label">Funding + test path</p>
            <div class="room-list">
              <div class="room-user-card">
                <span class="room-user-name">Fund the pot</span>
                <span class="waiting-sub">Use the live jackpot page if you want to seed the public trivia prize pool before testing.</span>
                <a class="btn-secondary" href="${TRIVIA_FUNDING_URL}" target="_blank" rel="noopener noreferrer" style="margin-top: 0.75rem; text-decoration: none; text-align: center;">Open Jackpot Funding</a>
              </div>
              <div class="room-user-card">
                <span class="room-user-name">Run a live test</span>
                <span class="waiting-sub">Use these pack buttons in the Activity, or jump to Discord if you need the full community drop flow.</span>
                <div class="btn-row" style="margin-top: 0.75rem;">
                  <a class="btn-secondary" href="${TRIVIA_ACTIVITY_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; text-align: center;">Open Activity Host</a>
                  <a class="btn-secondary" href="${TRIVIA_DISCORD_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; text-align: center;">Open Discord</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (!this.triviaJoined) {
      return `
        <div class="shell-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">Party room</p>
              <h3 class="shell-title">Live pack armed</h3>
            </div>
            <span class="stage-pill stage-lobby">Join</span>
          </div>
          <p class="shell-copy">${this.triviaError ? escapeHtml(this.triviaError) : 'A live party loop is open. Join now to catch the next prompt.'}</p>
          <p class="shell-subcopy">Room control stays simple. Join, answer fast, then decide whether to cash out to recap or keep chasing.</p>
          ${roundMeta}
          <div class="btn-row">
            <button class="btn-game" id="trivia-join-btn">${this.triviaJoinRequested ? 'Joining...' : 'Join Party Loop'}</button>
            <button class="btn-secondary" id="trivia-reset-btn">Reset Room</button>
          </div>
          ${leaderboard}
        </div>
      `;
    }

    if (this.triviaEliminated && !trivia.correctAnswer) {
      return `
        <div class="shell-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">Cash out or chase</p>
              <h3 class="shell-title">You are on the rail</h3>
            </div>
            <span class="stage-pill stage-post-round">Spectating</span>
          </div>
          <p class="shell-copy">${this.triviaBuyBackUsed ? 'You already burned the chase. Smart exit lives in Recap now.' : 'You missed the line. Buy back once if you want back in, or take the clean cooldown.'}</p>
          <p class="shell-subcopy">The loop keeps moving even when you bust. No dead screen. No second engine.</p>
          ${roundMeta}
          ${this.renderSafetyHooks(promptMode, 'rail', trivia)}
          <div class="btn-row">
            ${this.triviaBuyBackUsed ? '' : '<button class="btn-game" id="trivia-buyback-btn">Chase Buy-Back</button>'}
            <button class="btn-secondary" id="trivia-recap-btn">${this.getRecapButtonLabel(trivia)}</button>
          </div>
          ${leaderboard}
        </div>
      `;
    }

    if (!trivia.question || trivia.question === 'Waiting for round...') {
      return `
        <div class="shell-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">Party room</p>
              <h3 class="shell-title">Hold for the next prompt</h3>
            </div>
            <span class="stage-pill stage-lobby">Queued</span>
          </div>
          <p class="shell-copy">You are in. The next short round is loading now.</p>
          <p class="shell-subcopy">Stay on voice, keep the room moving, and hit the next prompt as soon as it lands.</p>
          ${roundMeta}
          <div class="btn-row">
            <button class="btn-secondary" id="trivia-reset-btn">Reset Room</button>
          </div>
          ${leaderboard}
        </div>
      `;
    }

    if (trivia.correctAnswer) {
      const pickedText = trivia.selectedAnswer
        ? `You locked ${escapeHtml(trivia.selectedAnswer)}.`
        : 'You never locked an answer.';
      const resultText = trivia.selectedAnswer === trivia.correctAnswer || this.triviaShieldArmed
        ? 'You survived the prompt.'
        : this.triviaEliminated
          ? 'You whiffed the prompt.'
          : 'The room moved on.';

      return `
        <div class="shell-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">${formatTriviaModeLabel(this.getTriviaPromptMode(trivia))}</p>
              <h3 class="shell-title">${escapeHtml(trivia.question)}</h3>
            </div>
            <span class="stage-pill stage-post-round">Reveal</span>
          </div>
          <p class="shell-copy">Correct call: ${escapeHtml(trivia.correctAnswer)}</p>
          <p class="shell-subcopy">${escapeHtml(trivia.explanation ?? `${pickedText} ${resultText}`)}</p>
          ${roundMeta}
          ${this.renderAnswerDistribution(trivia)}
          ${this.renderSafetyHooks(this.getTriviaPromptMode(trivia), this.triviaEliminated ? 'rail' : 'reveal', trivia)}
          <div class="btn-row">
            ${this.triviaEliminated && !this.triviaBuyBackUsed ? '<button class="btn-game" id="trivia-buyback-btn">Chase Buy-Back</button>' : '<button class="btn-game" id="trivia-stay-btn">Chase Next Prompt</button>'}
            <button class="btn-secondary" id="trivia-recap-btn">${this.getRecapButtonLabel(trivia)}</button>
          </div>
          ${leaderboard}
        </div>
      `;
    }

    return `
      <div class="shell-card">
        <div class="shell-card-header">
          <div>
            <p class="shell-eyebrow">${formatTriviaModeLabel(promptMode)}</p>
            <h3 class="shell-title">${escapeHtml(trivia.question)}</h3>
          </div>
          <span class="stage-pill stage-in-round">${trivia.timeRemaining}s</span>
        </div>
        <p class="shell-copy">${this.getTriviaPromptCopy(promptMode)}</p>
        <p class="shell-subcopy">Answer fast. Safe play uses the shield. Sketchy play peeks at the crowd before you lock.</p>
        ${roundMeta}
        ${this.renderSafetyHooks(promptMode, 'live', trivia)}
        <div class="btn-row">
          <button
            class="btn-secondary"
            id="trivia-shield-btn"
            ${this.triviaShieldUsed || this.triviaShieldArmed || trivia.answerLocked ? 'disabled' : ''}
          >
            ${this.triviaShieldArmed ? 'Shield Armed' : this.triviaShieldUsed ? 'Shield Burned' : 'Play Safe'}
          </button>
          <button
            class="btn-secondary"
            id="trivia-ape-btn"
            ${this.triviaApeInUsed || trivia.answerLocked ? 'disabled' : ''}
          >
            ${this.triviaApeInUsed ? 'Crowd Read Live' : 'Go Sketchy'}
          </button>
        </div>
        ${this.renderCrowdRead(trivia)}
        <div class="trivia-options">
          ${trivia.options.map((option, index) => `
            <button
              class="trivia-opt"
              data-opt="${index}"
              ${trivia.answerLocked ? 'disabled' : ''}
            >
              ${escapeHtml(option)}
            </button>
          `).join('')}
        </div>
        ${leaderboard}
      </div>
    `;
  }

  private renderLeaderboard(leaderboard: Array<{ username: string; score: number }>): string {
    return `
      <div class="room-hud" style="margin-top: 1rem;">
        <p class="section-label">Room board</p>
        <div class="room-list">
          ${leaderboard.length > 0
            ? leaderboard.slice(0, 5).map((entry, index) => `
              <div class="room-user-card">
                <span class="room-user-name">#${index + 1} ${escapeHtml(entry.username)}</span>
                <span class="stat-value">${entry.score} PTS</span>
              </div>
            `).join('')
            : '<p class="waiting-sub">No scores posted yet.</p>'}
        </div>
      </div>
    `;
  }

  private renderCrowdRead(trivia: TriviaState): string {
    if (trivia.answerDistribution.length === 0) {
      return '';
    }

    const totalVotes = trivia.answerDistribution.reduce((sum, option) => sum + option.count, 0) || 1;
    return `
      <div class="room-hud" style="margin-top: 1rem;">
        <p class="section-label">Crowd read</p>
        <div class="room-list">
          ${trivia.answerDistribution.map((option) => `
            <div class="room-user-card">
              <span class="room-user-name">${escapeHtml(option.choice)}</span>
              <span class="stat-value">${Math.round((option.count / totalVotes) * 100)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderAnswerDistribution(trivia: TriviaState): string {
    if (trivia.answerDistribution.length === 0) {
      return '';
    }

    const maxCount = Math.max(...trivia.answerDistribution.map((option) => option.count), 1);
    return `
      <div class="room-hud" style="margin-top: 1rem;">
        <p class="section-label">Reveal board</p>
        <div class="room-list">
          ${trivia.answerDistribution.map((option) => `
            <div class="room-user-card">
              <span class="room-user-name">${escapeHtml(option.choice)}</span>
              <span class="stat-value">${option.count}</span>
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; margin-top: 0.5rem;">
                <div style="width: ${(option.count / maxCount) * 100}%; height: 100%; background: ${option.correct ? 'var(--color-primary)' : 'rgba(255,255,255,0.22)'};"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderSafetyHooks(
    mode: TriviaPromptMode,
    phase: 'live' | 'reveal' | 'rail',
    trivia: TriviaState,
  ): string {
    const hooks = this.getSafetyHooks(mode, phase, trivia);
    return `
      <div class="room-hud" style="margin-top: 1rem;">
        <p class="section-label">Safety hooks</p>
        <div class="room-list">
          ${hooks.map((hook) => `
            <div class="room-user-card">
              <span class="room-user-name">${escapeHtml(hook.label)}</span>
              <span class="waiting-sub">${escapeHtml(hook.copy)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private getSafetyHooks(
    mode: TriviaPromptMode,
    phase: 'live' | 'reveal' | 'rail',
    trivia: TriviaState,
  ): Array<{ label: string; copy: string }> {
    if (phase === 'rail') {
      return [
        {
          label: 'Smart exit',
          copy: this.triviaBuyBackUsed
            ? 'The chase is spent. Recap is the disciplined move now.'
            : 'Recap is a clean exit. Taking it is smart, not soft.',
        },
        {
          label: 'Cooldown',
          copy: this.triviaBuyBackUsed
            ? 'One buy-back was the limit. Cooldown discipline takes over.'
            : 'One chase max. Missing one prompt does not justify spiral mode.',
        },
        {
          label: 'Scam read',
          copy: 'Room heat is not edge. Do not let the crowd bait you into a bad reload.',
        },
      ];
    }

    if (phase === 'reveal') {
      return [
        {
          label: 'Smart exit',
          copy: this.triviaEliminated
            ? 'Take recap and reset. Discipline beats forcing the next lap.'
            : 'Good read landed. Bank it while the board still looks clean.',
        },
        {
          label: 'Cooldown',
          copy: this.triviaEliminated
            ? 'Bad reveal is a cooldown signal first and a chase signal never.'
            : 'Even a clean hit earns a breather. Wins do not need instant reloads.',
        },
        {
          label: 'Scam read',
          copy: mode === 'safe-or-sketchy'
            ? 'Crowd vibes are still not proof. Good judgment stays picky.'
            : 'One correct answer does not turn sketch into safe.',
        },
      ];
    }

    return [
      {
        label: 'Smart exit',
        copy: trivia.answerLocked
          ? 'Answer is in. If the next spot feels forced, bank the recap after reveal.'
          : 'A clean lock beats a panic mash. You can always bank the recap next.',
      },
      {
        label: 'Cooldown',
        copy: trivia.timeRemaining <= 5
          ? `${trivia.timeRemaining}s left. Missed timing is cheaper than tilt clicking.`
          : 'Missed reads happen. Cooldown discipline beats insta-revenge.',
      },
      {
        label: 'Scam read',
        copy: mode === 'safe-or-sketchy'
          ? 'Crowd read is bait until facts land. Shield is the disciplined play.'
          : 'Shield first when the spot feels sketchy. Crowd heat is not proof.',
      },
    ];
  }

  private getRecapButtonLabel(trivia: TriviaState): string {
    if (!trivia.correctAnswer) {
      return this.triviaEliminated ? 'Take Cooldown to Recap' : 'Bank to Recap';
    }

    return this.triviaEliminated ? 'Take Cooldown to Recap' : 'Bank Clean Win';
  }

  private attachGameListeners(): void {
    document.getElementById('dad-join-btn')?.addEventListener('click', () => {
      this.relay.joinLobby('dad');
    });

    document.getElementById('dad-next-btn')?.addEventListener('click', () => {
      this.relay.joinLobby('dad');
      this.dadState = { hand: [], blackCard: '', scores: new Map(), phase: 'waiting', winner: null };
    });

    document.getElementById('trivia-join-btn')?.addEventListener('click', () => {
      this.triviaJoinRequested = true;
      this.joinTriviaGame();
    });

    document.getElementById('trivia-reset-btn')?.addEventListener('click', () => {
      this.relay.resetTriviaGame();
    });

    document.getElementById('trivia-ape-btn')?.addEventListener('click', () => {
      if (!this.triviaGameId || !this.triviaQuestionId) {
        return;
      }
      this.triviaApeInUsed = true;
      this.relay.requestTriviaApeIn(this.triviaGameId, this.triviaQuestionId);
      this.render();
    });

    document.getElementById('trivia-shield-btn')?.addEventListener('click', () => {
      if (!this.triviaGameId || !this.triviaQuestionId) {
        return;
      }
      this.relay.requestTriviaShield(this.triviaGameId, this.triviaQuestionId);
    });

    document.getElementById('trivia-buyback-btn')?.addEventListener('click', () => {
      if (!this.triviaGameId) {
        return;
      }
      this.relay.buyTriviaBack(this.triviaGameId);
    });

    document.getElementById('trivia-recap-btn')?.addEventListener('click', () => {
      this.navigateToView('recap');
    });

    document.getElementById('trivia-stay-btn')?.addEventListener('click', () => {
      this.navigateToView('play');
    });

    this.container.querySelectorAll('.trivia-pack-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const packId = (button as HTMLElement).dataset.pack as TriviaPackId | undefined;
        if (!packId) {
          return;
        }
        const pack = TRIVIA_PACKS[packId];
        this.triviaJoinRequested = true;
        this.triviaScheduling = true;
        this.triviaError = null;
        this.relay.scheduleTriviaGame(pack.category, pack.theme, pack.totalRounds);
        this.render();
      });
    });

    this.container.querySelectorAll('.dad-card').forEach((card) => {
      card.addEventListener('click', () => {
        const cardId = (card as HTMLElement).dataset.cardId!;
        if (this.dadState.phase === 'playing') {
          this.relay.playCard('current', cardId);
        } else if (this.dadState.phase === 'voting') {
          this.relay.voteCard('current', cardId);
        }
      });
    });

    this.container.querySelectorAll('.trivia-opt').forEach((button) => {
      button.addEventListener('click', () => {
        const optionIndex = Number.parseInt((button as HTMLElement).dataset.opt ?? '', 10);
        const answer = this.state.trivia.options[optionIndex];
        if (!this.triviaQuestionId || !answer) {
          return;
        }
        this.state.updateTrivia({
          selectedAnswer: answer,
          answerLocked: true,
        });
        this.relay.submitTriviaAnswer(this.triviaQuestionId, answer);
      });
    });
  }

  private joinTriviaGame(): void {
    this.triviaJoinRequested = true;
    this.triviaJoined = false;
    this.triviaError = null;

    if (!this.triviaGameId) {
      this.render();
      return;
    }

    this.relay.joinGame(this.triviaGameId);
    this.render();
  }

  private syncShellState(game: string): 'lobby' | 'in-round' | 'post-round' {
    if (game === 'dad') {
      if (this.dadState.winner) {
        this.state.setRoundStage('post-round', {
          title: 'DA&D round settled',
          detail: `${this.dadState.winner} took the round. Recap is live while the next lobby forms.`,
        });
        return 'post-round';
      }

      if (this.dadState.phase === 'playing' || this.dadState.phase === 'voting') {
        this.state.setRoundStage('in-round', {
          title: 'DA&D round live',
          detail: this.dadState.phase === 'voting'
            ? 'Votes are open. Pick the card that lands the hardest.'
            : 'Cards are in hand. Play fast before the room moves on.',
        });
        return 'in-round';
      }

      this.state.setRoundStage('lobby', {
        title: 'DA&D lobby open',
        detail: 'The room is waiting for the next black card to drop.',
      });
      return 'lobby';
    }

    const trivia = this.state.trivia;
    const mode = this.getTriviaPromptMode(trivia);
    if (trivia.correctAnswer) {
      this.state.setRoundStage('post-round', {
        title: `${formatTriviaModeLabel(mode)} settled`,
        detail: this.triviaEliminated
          ? 'You are out for now. Take the cooldown or chase the one buy-back.'
          : `Correct call: ${trivia.correctAnswer}. Bank the clean read or hold for the next short round.`,
      });
      return 'post-round';
    }

    if (this.triviaJoined && trivia.question && trivia.question !== 'Waiting for round...') {
      this.state.setRoundStage('in-round', {
        title: `${formatTriviaModeLabel(mode)} live`,
        detail: this.triviaEliminated
          ? 'You are spectating this prompt. Buy back once or hold Recap.'
          : `Clock is running. ${trivia.timeRemaining}s left to lock the answer and stay disciplined.`,
      });
      return 'in-round';
    }

    this.state.setRoundStage('lobby', {
      title: 'Party loop armed',
      detail: this.triviaGameId
        ? 'A short round is armed. Join the room and hold for the next prompt.'
        : 'No live pack is armed. Start a rapid set and keep the room moving.',
    });
    return 'lobby';
  }

  private getStageContent(stage: 'lobby' | 'in-round' | 'post-round', game: string): {
    label: string;
    title: string;
    detail: string;
  } {
    const gameLabel = formatGameLabel(game);

    if (stage === 'in-round') {
      return {
        label: 'Round Live',
        title: `${gameLabel} is live`,
        detail: game === 'trivia'
          ? 'Rapid prompt, quick reveal, then the next round. The room never falls into a dead state.'
          : 'The judge loop is active and the room is moving.',
      };
    }

    if (stage === 'post-round') {
      return {
        label: 'Post Round',
        title: `${gameLabel} is between rounds`,
        detail: game === 'trivia'
          ? 'Bank the clean read, cool off, or keep chasing the next prompt.'
          : 'Use Recap for the last result. Play stays armed for the next cycle.',
      };
    }

    return {
      label: 'Lobby',
      title: `${gameLabel} lobby`,
      detail: game === 'trivia'
        ? 'Start a short pack, join the room, and let the live loop do the rest.'
        : 'Lobby mode is safe by default. No live round, no dead-end white screen.',
    };
  }

  private getTriviaPromptMode(trivia: TriviaState): TriviaPromptMode {
    if (trivia.correctAnswer || this.triviaEliminated) {
      return 'cash-out-or-chase';
    }

    if (trivia.theme?.toLowerCase().includes('safe or sketchy') || trivia.category === 'degen' || trivia.category === 'crypto') {
      return 'safe-or-sketchy';
    }

    if (trivia.theme?.toLowerCase().includes('tilt or skill') || trivia.category === 'strategy' || trivia.category === 'gambling_math') {
      return 'tilt-or-skill';
    }

    return 'rapid-trivia';
  }

  private getTriviaPromptCopy(mode: TriviaPromptMode): string {
    switch (mode) {
      case 'tilt-or-skill':
        return 'Judge the spot fast. This pack leans on edge, discipline, and anti-tilt reads.';
      case 'safe-or-sketchy':
        return 'The room is testing risk instincts. Play safe with shield or go sketchy with the crowd read, but keep scam radar on.';
      case 'cash-out-or-chase':
        return 'The reveal is in. Decide whether to bank the recap or keep firing.';
      default:
        return 'Fast-answer trivia with a tight reveal window. Keep it blunt and keep it moving.';
    }
  }

  private startTriviaTimer(endsAt: number): void {
    this.stopTriviaTimer();

    const syncTimer = () => {
      this.state.updateTrivia({
        timeRemaining: Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
      });
    };

    syncTimer();
    this.triviaTimerId = setInterval(syncTimer, 1000);
  }

  private stopTriviaTimer(): void {
    if (this.triviaTimerId) {
      clearInterval(this.triviaTimerId);
      this.triviaTimerId = null;
    }
  }

  private syncCurrentPlayer(
    players: Array<{ userId: string; username: string; score: number; eliminated: boolean; shieldConsumed: boolean; buyBackUsed: boolean }> | undefined,
  ): void {
    if (!players || players.length === 0) {
      return;
    }

    const self = players.find((player) => player.userId === this.state.userId);
    if (!self) {
      return;
    }

    this.triviaJoined = true;
    this.triviaEliminated = self.eliminated;
    this.triviaShieldUsed = self.shieldConsumed;
    this.triviaBuyBackUsed = self.buyBackUsed;
  }

  private handleGameUpdate(data: unknown): void {
    const d = data as {
      type?: string;
      gameId?: string;
      prizePool?: number;
      theme?: string;
      category?: string;
      roundNumber?: number;
      totalRounds?: number;
      leaderboard?: Array<{ username: string; score: number }>;
      players?: Array<{ userId: string; username: string; score: number; eliminated: boolean; shieldConsumed: boolean; buyBackUsed: boolean }>;
      finalScores?: Array<{ username: string; score: number }>;
      userId?: string;
    };

    if (d.type === 'trivia-started' && d.gameId) {
      if (this.triviaGameId !== d.gameId) {
        this.triviaJoined = false;
        this.triviaQuestionId = null;
        this.stopTriviaTimer();
      }

      this.triviaScheduling = false;
      this.triviaGameId = d.gameId;
      this.triviaError = null;
      this.syncCurrentPlayer(d.players);
      this.state.updateTrivia({
        question: 'Waiting for round...',
        options: [],
        prizePool: d.prizePool ?? this.state.trivia.prizePool,
        timeRemaining: 0,
        correctAnswer: null,
        category: d.category ?? null,
        theme: d.theme ?? null,
        roundNumber: d.roundNumber ?? 0,
        totalRounds: d.totalRounds ?? 0,
        explanation: null,
        selectedAnswer: null,
        answerLocked: false,
        answerDistribution: [],
        leaderboard: d.leaderboard ?? this.state.trivia.leaderboard,
      });

      if (this.state.currentGame === 'trivia' && this.triviaJoinRequested) {
        this.joinTriviaGame();
      }
    }

    if (d.type === 'trivia-joined' && d.gameId === this.triviaGameId) {
      this.triviaJoined = true;
      this.triviaError = null;
      this.syncCurrentPlayer(d.players);
      this.state.updateTrivia({
        prizePool: d.prizePool ?? this.state.trivia.prizePool,
        roundNumber: d.roundNumber ?? this.state.trivia.roundNumber,
        totalRounds: d.totalRounds ?? this.state.trivia.totalRounds,
        leaderboard: d.leaderboard ?? this.state.trivia.leaderboard,
      });
    }

    if (d.type === 'buy-back-success' && d.userId === this.state.userId) {
      this.triviaEliminated = false;
      this.triviaBuyBackUsed = true;
      this.triviaError = null;
      this.render();
    }

    if (d.type === 'trivia-reset') {
      this.resetTriviaLoopState();
      this.state.updateTrivia({
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
        answerDistribution: [],
      });
      this.state.setRoundStage('lobby', {
        title: 'Party loop reset',
        detail: 'The room is clear. Start the next short pack when ready.',
      });
      return;
    }

    if (d.type === 'trivia-completed' && (!this.triviaGameId || d.gameId === this.triviaGameId)) {
      this.relay.clearJoinedGame();
      this.triviaScheduling = false;
      this.triviaGameId = null;
      this.triviaQuestionId = null;
      this.triviaJoined = false;
      this.stopTriviaTimer();
      this.triviaEliminated = false;
      this.triviaShieldUsed = false;
      this.triviaShieldArmed = false;
      this.triviaBuyBackUsed = false;
      this.triviaApeInUsed = false;
      this.state.updateTrivia({
        question: 'Waiting for round...',
        options: [],
        prizePool: 0,
        timeRemaining: 0,
        correctAnswer: null,
        category: null,
        theme: null,
        roundNumber: 0,
        totalRounds: 0,
        explanation: null,
        selectedAnswer: null,
        answerLocked: false,
        answerDistribution: [],
        leaderboard: d.finalScores ?? [],
      });
      this.state.setRoundStage('post-round', {
        title: 'Party loop closed',
        detail: 'Final scores are in. Recap is ready while the next lobby loads.',
      });
    }
  }

  private handleGameError(data: unknown): void {
    if (this.state.currentGame !== 'trivia' && !this.triviaGameId && !this.triviaJoinRequested && !this.triviaScheduling) {
      return;
    }
    this.triviaScheduling = false;
    this.triviaError = typeof data === 'string' ? data : 'Trivia action failed.';
    this.state.setRoundStage('lobby', {
      title: 'Party loop held',
      detail: this.triviaError,
    });
    if (this.state.currentGame === 'trivia') {
      this.render();
    }
  }

  private handleTriviaRoundStart(data: unknown): void {
    const d = data as {
      gameId?: string;
      question?: { id: string; question: string; choices: string[]; category?: string; theme?: string };
      prizePool?: number;
      roundNumber?: number;
      totalRounds?: number;
      endsAt?: number;
      leaderboard?: Array<{ username: string; score: number }>;
      players?: Array<{ userId: string; username: string; score: number; eliminated: boolean; shieldConsumed: boolean; buyBackUsed: boolean }>;
    };

    if (!d.question || !d.endsAt || (this.triviaGameId && d.gameId && d.gameId !== this.triviaGameId)) {
      return;
    }

    if (d.gameId) {
      this.triviaGameId = d.gameId;
    }

    this.triviaScheduling = false;
    this.triviaJoined = true;
    this.triviaError = null;
    this.triviaQuestionId = d.question.id;
    this.triviaShieldArmed = false;
    this.triviaApeInUsed = false;
    this.syncCurrentPlayer(d.players);
    this.startTriviaTimer(d.endsAt);
    this.state.updateTrivia({
      question: d.question.question,
      options: d.question.choices,
      prizePool: d.prizePool ?? this.state.trivia.prizePool,
      timeRemaining: Math.max(0, Math.ceil((d.endsAt - Date.now()) / 1000)),
      correctAnswer: null,
      category: d.question.category ?? this.state.trivia.category,
      theme: d.question.theme ?? this.state.trivia.theme,
      roundNumber: d.roundNumber ?? this.state.trivia.roundNumber,
      totalRounds: d.totalRounds ?? this.state.trivia.totalRounds,
      explanation: null,
      selectedAnswer: null,
      answerLocked: false,
      answerDistribution: [],
      leaderboard: d.leaderboard ?? this.state.trivia.leaderboard,
    });
    this.state.recordProgressionPromptStart(d.question.id, d.players?.length ?? this.state.participantCount, Date.now());
  }

  private handleTriviaRoundReveal(data: unknown): void {
    const d = data as {
      gameId?: string;
      correctChoice?: string;
      explanation?: string;
      stats?: Record<string, { count: number; correct: boolean }>;
      leaderboard?: Array<{ username: string; score: number }>;
      players?: Array<{ userId: string; username: string; score: number; eliminated: boolean; shieldConsumed: boolean; buyBackUsed: boolean }>;
    };

    if (!d.correctChoice || (this.triviaGameId && d.gameId && d.gameId !== this.triviaGameId)) {
      return;
    }

    this.stopTriviaTimer();
    this.syncCurrentPlayer(d.players);
    const questionId = this.triviaQuestionId;
    const survived = !this.triviaEliminated;
    const usedCrowdRead = this.triviaApeInUsed;
    this.triviaShieldArmed = false;
    this.state.updateTrivia({
      correctAnswer: d.correctChoice,
      leaderboard: d.leaderboard ?? this.state.trivia.leaderboard,
      explanation: d.explanation ?? null,
      answerDistribution: Object.entries(d.stats ?? {}).map(([choice, stats]) => ({
        choice,
        count: stats.count,
        correct: stats.correct,
      })),
      timeRemaining: 0,
    });
    if (questionId) {
      this.state.recordProgressionRoundResult({
        questionId,
        survived,
        usedCrowdRead,
      }, Date.now());
    }
  }

  private handleTriviaApeInResult(data: unknown): void {
    const d = data as { questionId?: string; distribution?: Record<string, number> };
    if (!d.questionId || d.questionId !== this.triviaQuestionId || !d.distribution) {
      return;
    }

    this.state.updateTrivia({
      answerDistribution: Object.entries(d.distribution).map(([choice, count]) => ({
        choice,
        count,
        correct: false,
      })),
    });
  }

  private handleTriviaShieldResult(data: unknown): void {
    const d = data as { questionId?: string };
    if (!d.questionId || d.questionId !== this.triviaQuestionId) {
      return;
    }

    this.triviaShieldArmed = true;
    this.triviaShieldUsed = true;
    this.render();
  }

  private resetTriviaLoopState(): void {
    this.relay.clearJoinedGame();
    this.triviaScheduling = false;
    this.triviaGameId = null;
    this.triviaQuestionId = null;
    this.triviaJoinRequested = false;
    this.triviaJoined = false;
    this.triviaError = null;
    this.triviaEliminated = false;
    this.triviaShieldUsed = false;
    this.triviaShieldArmed = false;
    this.triviaBuyBackUsed = false;
    this.triviaApeInUsed = false;
    this.stopTriviaTimer();
  }

  private navigateToView(view: 'play' | 'recap'): void {
    if (view === 'recap') {
      this.state.recordProgressionRecapVisit();
    }
    document.querySelector<HTMLElement>(`.nav-tab[data-view="${view}"]`)?.click();
  }
}
