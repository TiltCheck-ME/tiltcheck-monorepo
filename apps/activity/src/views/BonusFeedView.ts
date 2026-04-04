// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import type { SessionState, BonusItem } from '../state/SessionState.js';

export class BonusFeedView {
  private container: HTMLElement;
  private state: SessionState;
  private userId: string;
  private filterCasino: string | null = null;
  private visibleCount: number = 5;

  constructor(container: HTMLElement, state: SessionState, userId: string) {
    this.container = container;
    this.state = state;
    this.userId = userId;
  }

  async mount(): Promise<void> {
    await this.fetchBonuses();
    this.render();
    this.state.on('bonusFeed', () => this.render());
  }

  private async fetchBonuses(): Promise<void> {
    try {
      const res = await fetch(`/api/user/${this.userId}/bonuses`);
      if (!res.ok) return;
      const data = await res.json();
      this.state.setBonusFeed(data.active ?? []);
    } catch (_) { /* non-fatal */ }
  }

  render(): void {
    const feed = this.state.bonusFeed;
    const casinos = [...new Set(feed.map(b => b.casinoName))];

    const visible = feed
      .filter(b => !this.filterCasino || b.casinoName === this.filterCasino)
      .slice(0, this.visibleCount);

    const filterChips = casinos.map(c => `
      <button class="filter-chip ${this.filterCasino === c ? 'active' : ''}" data-casino="${c}">${c}</button>
    `).join('');

    const items = visible.length === 0
      ? '<div class="bonus-empty">No bonuses tracked.</div>'
      : visible.map(b => this.renderBonus(b)).join('');

    const hasMore = feed.length > this.visibleCount;

    this.container.innerHTML = `
      <div class="view-bonus-feed">
        ${casinos.length > 0 ? `
          <div class="filter-chips">
            <button class="filter-chip ${!this.filterCasino ? 'active' : ''}" data-casino="">ALL</button>
            ${filterChips}
          </div>` : ''}
        <div class="bonus-list">${items}</div>
        ${hasMore ? `<button class="show-more-btn" id="show-more-bonuses">Show more</button>` : ''}
      </div>
    `;

    this.attachListeners();
  }

  private renderBonus(bonus: BonusItem): string {
    const isReady = !bonus.nextClaimAt || new Date(bonus.nextClaimAt) <= new Date();
    const expired = bonus.is_expired;

    return `
      <div class="bonus-item ${expired ? 'expired' : ''} ${isReady ? 'ready' : ''}">
        <div class="bonus-casino">${bonus.casinoName}</div>
        <div class="bonus-desc">${bonus.description}</div>
        <div class="bonus-status">${expired ? 'EXPIRED' : isReady ? 'READY' : 'COOLING DOWN'}</div>
        ${isReady && !expired ? `<button class="claim-btn" data-id="${bonus.id}">CLAIM</button>` : ''}
      </div>`;
  }

  private attachListeners(): void {
    this.container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.filterCasino = (chip as HTMLElement).dataset.casino || null;
        this.render();
      });
    });

    document.getElementById('show-more-bonuses')?.addEventListener('click', () => {
      this.visibleCount += 5;
      this.render();
    });

    this.container.querySelectorAll('.claim-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const bonusId = (btn as HTMLElement).dataset.id!;
        try {
          await fetch(`/api/bonus/${this.userId}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bonusId })
          });
          await this.fetchBonuses();
        } catch (_) { /* non-fatal */ }
      });
    });
  }
}
