// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import type { ActivityStage, SessionState } from '../state/SessionState.js';

function formatGameLabel(game: string): string {
  return game === 'dad' ? 'DA&D' : game.toUpperCase();
}

function formatStageLabel(stage: ActivityStage): string {
  switch (stage) {
    case 'in-round':
      return 'Round Live';
    case 'post-round':
      return 'Round Closed';
    default:
      return 'Lobby';
  }
}

function getStageCopy(stage: ActivityStage, game: string): string {
  const gameLabel = formatGameLabel(game);

  switch (stage) {
    case 'in-round':
      return `${gameLabel} is active. Jump into Play when you are ready to press.`;
    case 'post-round':
      return `The last ${gameLabel} cycle is wrapped. Recap is ready for the room.`;
    default:
      return `Room is staged for ${gameLabel}. Home tracks the room until the next live round starts.`;
  }
}

export class HomeView {
  private container: HTMLElement;
  private state: SessionState;

  constructor(container: HTMLElement, state: SessionState) {
    this.container = container;
    this.state = state;
  }

  mount(): void {
    this.render();
    this.state.on('identity', () => this.render());
    this.state.on('participants', () => this.render());
    this.state.on('bonusFeed', () => this.render());
    this.state.on('progression', () => this.render());
    this.state.on('rounds', () => this.render());
    this.state.on('stage', () => this.render());
    this.state.on('game', () => this.render());
  }

  render(): void {
    const stage = this.state.roundStage;
    const rounds = this.state.rounds.length;
    const bonusCount = this.state.bonusFeed.length;
    const progression = this.state.progression;
    const latestBadge = progression.badges.at(-1);

    this.container.innerHTML = `
      <div class="shell-home-stack">
        <div class="shell-card shell-home-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">Hybrid v1</p>
              <h1 class="shell-title">Home</h1>
            </div>
            <span class="stage-pill stage-${stage}">${formatStageLabel(stage)}</span>
          </div>
          <p class="shell-copy">${getStageCopy(stage, this.state.currentGame)}</p>
          <div class="shell-metrics">
            <div class="shell-metric">
              <span class="shell-metric-label">Room</span>
              <span class="shell-metric-value">${this.state.participantCount} live</span>
            </div>
            <div class="shell-metric">
              <span class="shell-metric-label">Bonuses</span>
              <span class="shell-metric-value">${bonusCount} tracked</span>
            </div>
            <div class="shell-metric">
              <span class="shell-metric-label">Session</span>
              <span class="shell-metric-value">${rounds} rounds</span>
            </div>
          </div>
        </div>

        <div class="shell-card shell-home-card">
          <div class="shell-card-header">
            <div>
              <p class="shell-eyebrow">Progression hook</p>
              <h2 class="shell-title">${progression.currentTitle}</h2>
            </div>
            <span class="stage-pill stage-lobby">Light</span>
          </div>
          <p class="shell-copy">Play the room, check recap, and stack social clout without turning this lane into a grind loop.</p>
          <div class="shell-metrics">
            <div class="shell-metric">
              <span class="shell-metric-label">Streak</span>
              <span class="shell-metric-value">${progression.dailyStreak} day${progression.dailyStreak === 1 ? '' : 's'}</span>
            </div>
            <div class="shell-metric">
              <span class="shell-metric-label">Weekly clout</span>
              <span class="shell-metric-value">${progression.weeklyClout}</span>
            </div>
            <div class="shell-metric">
              <span class="shell-metric-label">Badges</span>
              <span class="shell-metric-value">${progression.badges.length}</span>
            </div>
          </div>
          <p class="shell-subcopy">${latestBadge
            ? `Latest badge: ${latestBadge.label}. ${latestBadge.detail}`
            : 'No badge yet. Clear a prompt, ride with the room, and let recap keep the streak honest.'}
          </p>
        </div>
      </div>
    `;
  }
}
