// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import type { SessionState } from '../state/SessionState.js';
import { buildActivityRecapStory } from './recapStory.js';

function formatGameLabel(game: string): string {
  return game === 'dad' ? 'DA&D' : game.toUpperCase();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export class RecapView {
  private container: HTMLElement;
  private state: SessionState;

  constructor(container: HTMLElement, state: SessionState) {
    this.container = container;
    this.state = state;
  }

  mount(): void {
    this.render();
    this.state.on('progression', () => this.render());
    this.state.on('rounds', () => this.render());
    this.state.on('recap', () => this.render());
    this.state.on('stage', () => this.render());
    this.state.on('game', () => this.render());
    this.state.on('participants', () => this.render());
    this.state.on('bonusFeed', () => this.render());
    this.state.on('channelSessions', () => this.render());
    this.state.on('vault', () => this.render());
    this.state.on('tip', () => this.render());
    this.state.on('trivia', () => this.render());
  }

  render(): void {
    const recap = this.state.activityRecap;
    const progression = this.state.progression;
    const story = buildActivityRecapStory(this.state);
    const badgeMarkup = progression.badges.length > 0
      ? progression.badges.map((badge) => `
        <div class="room-user-card">
          <span class="room-user-name">${escapeHtml(badge.label)}</span>
          <p class="waiting-sub" style="width: 100%; margin: 0.4rem 0 0;">${escapeHtml(badge.detail)}</p>
        </div>
      `).join('')
      : '<p class="waiting-sub">No badges unlocked yet. Clear a prompt or ride a fuller room to get one.</p>';
    const topicMarkup = story.topTopics.length > 0
      ? story.topTopics.map((topic) => `
        <li class="recap-list-item">
          <span class="recap-list-title">${escapeHtml(topic.label)}</span>
          <span class="recap-list-copy">${escapeHtml(topic.detail)}</span>
        </li>
      `).join('')
      : `
        <li class="recap-list-item recap-list-item-empty">
          <span class="recap-list-copy">The lane has not printed enough local state to rank topics yet.</span>
        </li>
      `;
    const warningMarkup = story.warnings.map((warning) => `
      <li class="recap-list-item ${warning.startsWith('No hard red flags') ? 'recap-list-item-safe' : 'recap-list-item-warning'}">
        <span class="recap-list-copy">${escapeHtml(warning)}</span>
      </li>
    `).join('');
    const safetyMarkup = [
      { label: 'Smart exit', copy: story.safetyHooks.smartExit, tone: 'safe' },
      { label: 'Cooldown', copy: story.safetyHooks.cooldown, tone: story.safetyHooks.cooldown.includes('No hard cooldown alarm') ? 'safe' : 'warning' },
      { label: 'Scam read', copy: story.safetyHooks.scamGuard, tone: story.safetyHooks.scamGuard.startsWith('No obvious promo scam signal') ? 'safe' : 'warning' },
    ].map((hook) => `
      <li class="recap-list-item recap-list-item-${hook.tone}">
        <span class="recap-list-title">${escapeHtml(hook.label)}</span>
        <span class="recap-list-copy">${escapeHtml(hook.copy)}</span>
      </li>
    `).join('');

    this.container.innerHTML = `
      <div class="shell-card shell-recap-card">
        <div class="shell-card-header">
          <div>
            <p class="shell-eyebrow">Daily degen local</p>
            <h2 class="shell-title">Recap</h2>
          </div>
          <span class="stage-pill stage-${this.state.roundStage}">${formatGameLabel(this.state.currentGame)}</span>
        </div>
        <div class="recap-storyline" data-tone="${story.mood}">
          <p class="shell-copy recap-shell-title">${escapeHtml(recap.title)}</p>
          <p class="shell-subcopy">${escapeHtml(recap.detail)}</p>
          <p class="recap-story-headline">${escapeHtml(story.headline)}</p>
          <p class="recap-story-copy">${escapeHtml(story.storyline)}</p>
          <p class="recap-story-take">TiltCheck take: ${escapeHtml(story.tiltcheckTake)}</p>
        </div>
        <div class="shell-metrics">
          <div class="shell-metric">
            <span class="shell-metric-label">Net P/L</span>
            <span class="shell-metric-value ${story.netPL >= 0 ? 'drift-positive' : 'drift-negative'}">${story.netPL >= 0 ? '+' : '-'}$${Math.abs(story.netPL).toFixed(2)}</span>
          </div>
          <div class="shell-metric">
            <span class="shell-metric-label">Wagered</span>
            <span class="shell-metric-value">$${story.totalWagered.toFixed(2)}</span>
          </div>
          <div class="shell-metric">
            <span class="shell-metric-label">Rounds</span>
            <span class="shell-metric-value">${story.roundCount}</span>
          </div>
          <div class="shell-metric">
            <span class="shell-metric-label">Win rate</span>
            <span class="shell-metric-value">${story.roundCount > 0 ? `${story.winRate.toFixed(0)}%` : 'WAITING'}</span>
          </div>
          <div class="shell-metric">
            <span class="shell-metric-label">Room</span>
            <span class="shell-metric-value">${story.roomPopulation} live</span>
          </div>
          <div class="shell-metric">
            <span class="shell-metric-label">RTP</span>
            <span class="shell-metric-value">${story.roundCount > 0 ? `${story.actualRtp.toFixed(1)}%` : 'WAITING'}</span>
          </div>
        </div>
        <div class="recap-grid">
          <section class="recap-panel">
            <p class="recap-panel-label">Top topics</p>
            <ul class="recap-list">${topicMarkup}</ul>
          </section>
          <section class="recap-panel">
            <p class="recap-panel-label">Red flags</p>
            <ul class="recap-list">${warningMarkup}</ul>
          </section>
          <section class="recap-panel">
            <p class="recap-panel-label">Safety tape</p>
            <ul class="recap-list">${safetyMarkup}</ul>
          </section>
          <section class="recap-panel">
            <p class="recap-panel-label">Behavior tape</p>
            <div class="recap-callout recap-callout-smart">
              <span class="recap-callout-label">Smart move</span>
              <p class="recap-callout-copy">${escapeHtml(story.smartCallout)}</p>
            </div>
            <div class="recap-callout recap-callout-degen">
              <span class="recap-callout-label">Degen move</span>
              <p class="recap-callout-copy">${escapeHtml(story.degenCallout)}</p>
            </div>
          </section>
          <section class="recap-panel">
            <p class="recap-panel-label">Clout lane</p>
            <div class="shell-metrics">
              <div class="shell-metric">
                <span class="shell-metric-label">Title</span>
                <span class="shell-metric-value">${escapeHtml(progression.currentTitle)}</span>
              </div>
              <div class="shell-metric">
                <span class="shell-metric-label">Streak</span>
                <span class="shell-metric-value">${progression.dailyStreak}D</span>
              </div>
              <div class="shell-metric">
                <span class="shell-metric-label">Weekly clout</span>
                <span class="shell-metric-value">${progression.weeklyClout}</span>
              </div>
            </div>
            <p class="shell-subcopy">The lane rewards showing up, reading the room, and checking your tape. No chips. No fake bankroll loop.</p>
            <div class="room-list">${badgeMarkup}</div>
          </section>
        </div>
      </div>
    `;
  }
}
