// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import type { SessionState } from '../state/SessionState.js';
import {
  buildActivityBonusSnapshot,
  fetchLiveBonusFeed,
  fetchRemoteTrackerSnapshot,
  type ActivityBonusCard,
  type BonusSourceStatus,
  type RemoteTrackerSnapshot,
} from './bonusTrackerAdapter.js';

export class BonusFeedView {
  private container: HTMLElement;
  private state: SessionState;
  private userId: string;
  private visibleCount = 4;
  private remoteSnapshot: RemoteTrackerSnapshot = {
    collectClockEntries: [],
    inboxEntries: [],
    sources: [],
  };
  private liveSource: BonusSourceStatus = {
    key: 'live',
    label: 'Live tracker',
    mode: 'fallback',
    detail: 'No personal timer feed',
  };
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement, state: SessionState, userId: string) {
    this.container = container;
    this.state = state;
    this.userId = userId;
  }

  async mount(): Promise<void> {
    await Promise.all([this.hydrateLiveBonuses(), this.loadRemoteSnapshot()]);
    this.render();
    this.state.on('bonusFeed', () => this.render());
    this.countdownTimer = setInterval(() => this.render(), 1000);
  }

  private async hydrateLiveBonuses(): Promise<void> {
    const result = await fetchLiveBonusFeed(this.userId);
    this.liveSource = result.source;
    if (result.items.length > 0) {
      const merged = new Map<string, typeof result.items[number]>();
      this.state.bonusFeed.forEach((item) => merged.set(item.id, item));
      result.items.forEach((item) => merged.set(item.id, item));
      this.state.setBonusFeed([...merged.values()]);
    }
  }

  private async loadRemoteSnapshot(): Promise<void> {
    this.remoteSnapshot = await fetchRemoteTrackerSnapshot();
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private renderSourcePills(sources: readonly BonusSourceStatus[]): string {
    return sources.map((source) => `
      <span class="bonus-source-pill bonus-source-pill-${source.mode}" title="${this.escapeHtml(source.detail)}">
        ${this.escapeHtml(source.label)}
      </span>
    `).join('');
  }

  private renderSafetyHooks(cards: readonly ActivityBonusCard[]): string {
    const readyCards = cards.filter((card) => card.status === 'ready');
    const verifiedReadyCards = readyCards.filter((card) => card.trustTone === 'good');
    const cooldownCards = cards.filter((card) => card.status === 'cooldown');
    const sketchCards = cards.filter((card) => card.safetyTone === 'warn' || card.trustTone === 'warn');

    const smartExitCopy = verifiedReadyCards.length > 0
      ? `${verifiedReadyCards.length} clean claim${verifiedReadyCards.length === 1 ? '' : 's'} live. Hit one and bank the exit.`
      : readyCards.length > 0
        ? `${readyCards.length} ready card${readyCards.length === 1 ? '' : 's'} live, but trust is mixed. Verify before you farm.`
        : 'No clean cash-out spot printed yet. Let the timer do the talking.';
    const cooldownCopy = cooldownCards.length > 0
      ? `${cooldownCards.length} timer${cooldownCards.length === 1 ? '' : 's'} say wait. Cooldown discipline beats spam claims.`
      : 'Cooldown pressure is light right now. Keep it that way.';
    const scamCopy = sketchCards.length > 0
      ? `${sketchCards.length} promo${sketchCards.length === 1 ? '' : 's'} still need a scam read. Link, code, and source all count.`
      : 'Visible cards look clean enough. No sketchy bait in the first pass.';

    return `
      <div class="room-hud" style="margin-top: 1rem;">
        <p class="section-label">Safety hooks</p>
        <div class="room-list">
          <div class="room-user-card">
            <span class="room-user-name">Smart exit</span>
            <span class="waiting-sub">${this.escapeHtml(smartExitCopy)}</span>
          </div>
          <div class="room-user-card">
            <span class="room-user-name">Cooldown</span>
            <span class="waiting-sub">${this.escapeHtml(cooldownCopy)}</span>
          </div>
          <div class="room-user-card">
            <span class="room-user-name">Scam read</span>
            <span class="waiting-sub">${this.escapeHtml(scamCopy)}</span>
          </div>
        </div>
      </div>
    `;
  }

  render(): void {
    const snapshot = buildActivityBonusSnapshot(this.state.bonusFeed, this.remoteSnapshot, this.liveSource);
    const cards = snapshot.cards.slice(0, this.visibleCount);
    const hasMore = snapshot.cards.length > this.visibleCount;
    const items = cards.length > 0
      ? cards.map((card) => this.renderCard(card)).join('')
      : `
        <div class="bonus-fallback-card">
          <p class="bonus-fallback-title">${this.escapeHtml(snapshot.fallbackTitle ?? 'Tracker fallback')}</p>
          <p class="bonus-fallback-copy">${this.escapeHtml(snapshot.fallbackCopy ?? 'Bonus data is not available yet.')}</p>
          <div class="bonus-fallback-meta">
            <span class="bonus-meta-pill bonus-meta-pill-neutral">Placeholder</span>
            <span class="bonus-meta-pill bonus-meta-pill-warn">Future adapter slot</span>
          </div>
        </div>
      `;

    this.container.innerHTML = `
      <div class="shell-card bonus-utility-card">
        <div class="shell-card-header">
          <div>
            <p class="shell-eyebrow">Hybrid v1 utility</p>
            <h2 class="shell-title">Daily bonus tracker</h2>
          </div>
          <span class="stage-pill stage-lobby">Lean</span>
        </div>
        <p class="shell-copy">Timers stay readable, smart exits stay rewarded, and the lane does not hijack the room.</p>
        <div class="bonus-utility-stats">
          <div class="bonus-utility-stat">
            <span class="bonus-utility-stat-label">Tracked</span>
            <span class="bonus-utility-stat-value">${snapshot.summary.total}</span>
          </div>
          <div class="bonus-utility-stat">
            <span class="bonus-utility-stat-label">Ready</span>
            <span class="bonus-utility-stat-value">${snapshot.summary.ready}</span>
          </div>
          <div class="bonus-utility-stat">
            <span class="bonus-utility-stat-label">Cooling</span>
            <span class="bonus-utility-stat-value">${snapshot.summary.cooling}</span>
          </div>
        </div>
        <div class="bonus-source-row">
          ${this.renderSourcePills(snapshot.sources)}
        </div>
        ${this.renderSafetyHooks(snapshot.cards)}
        <div class="bonus-card-list">${items}</div>
        ${hasMore ? `<button class="show-more-btn" id="show-more-bonuses" type="button">Show more</button>` : ''}
        <p class="shell-subcopy">Tracker-only cards stay useful, but clean value still means verify first, claim once, and respect cooldowns.</p>
      </div>
    `;

    this.attachListeners();
  }

  private renderCard(card: ActivityBonusCard): string {
    const claimAction = card.claimUrl
      ? `<a class="bonus-action-link" href="${this.escapeHtml(card.claimUrl)}" target="_blank" rel="noopener noreferrer">Open</a>`
      : '';
    const codePill = card.code
      ? `<span class="bonus-meta-pill bonus-meta-pill-neutral">Code ${this.escapeHtml(card.code)}</span>`
      : '';
    const updatedLabel = card.updatedLabel
      ? `<span class="bonus-meta-pill bonus-meta-pill-neutral">Seen ${this.escapeHtml(card.updatedLabel)}</span>`
      : '';
    return `
      <article class="bonus-card bonus-card-${card.status}">
        <div class="bonus-card-head">
          <div>
            <p class="bonus-card-casino">${this.escapeHtml(card.casinoName)}</p>
            <p class="bonus-card-copy">${this.escapeHtml(card.description)}</p>
          </div>
          <div class="bonus-card-side">
            <span class="bonus-status-badge bonus-status-badge-${card.status}">${this.escapeHtml(card.statusLabel)}</span>
            <span class="bonus-timer-label">${this.escapeHtml(card.timerLabel)}</span>
          </div>
        </div>
        <div class="bonus-meta-row">
          <span class="bonus-meta-pill bonus-meta-pill-neutral">${this.escapeHtml(card.sourceLabel)}</span>
          <span class="bonus-meta-pill bonus-meta-pill-${card.trustTone}">${this.escapeHtml(card.trustLabel)}</span>
          <span class="bonus-meta-pill bonus-meta-pill-${card.safetyTone}">${this.escapeHtml(card.safetyLabel)}</span>
          ${codePill}
          ${updatedLabel}
          ${claimAction}
        </div>
      </article>
    `;
  }

  private attachListeners(): void {
    this.container.querySelector<HTMLButtonElement>('#show-more-bonuses')?.addEventListener('click', () => {
      this.visibleCount += 5;
      this.render();
    });
  }
}
