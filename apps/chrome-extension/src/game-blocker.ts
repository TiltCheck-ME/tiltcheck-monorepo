/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 */
/**
 * Game Blocker — Surgical Self-Exclusion enforcement for the Chrome Extension.
 *
 * Fetches the user's ForbiddenGamesProfile from the TiltCheck API, then watches
 * the casino DOM for matching game launchers. When a blocked game is detected it
 * injects a full-page overlay that prevents play and surfaces the user's own
 * exclusion rationale.
 *
 * Detection strategy (in priority order):
 *  1. Iframe src attribute containing a blocked game ID slug
 *  2. Play / Launch button data-game-id attribute
 *  3. URL pathname containing a blocked game ID slug or category keyword
 */

import { EXT_CONFIG } from './config.js';
import type { ForbiddenGamesProfile, GameCategory } from '@tiltcheck/types';

const OVERLAY_ID = 'tiltcheck-game-block-overlay';
const POLL_INTERVAL_MS = 3000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const CATEGORY_SLUGS: Record<GameCategory, string[]> = {
  chicken_mines: ['chicken', 'mines', 'minefield'],
  bonus_buy: ['bonus-buy', 'bonusbuy', 'feature-buy', 'featurebuy'],
  live_dealer: ['live-dealer', 'live-casino', 'live_dealer', 'livecasino'],
  slots: ['slot', 'slots'],
  crash: ['crash', 'aviator', 'jetx', 'spaceman'],
  table_games: ['blackjack', 'roulette', 'baccarat', 'poker', 'table'],
};

interface BlockMatch {
  gameId: string | null;
  category: GameCategory | null;
  reason: string | null;
}

export class GameBlocker {
  private profile: ForbiddenGamesProfile | null = null;
  private profileFetchedAt = 0;
  private discordId: string;
  private authToken: string;
  private observer: MutationObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly dismissStorageKey = `tiltcheck_game_block_dismissed:${window.location.hostname.toLowerCase()}`;

  constructor(discordId: string, authToken: string) {
    this.discordId = discordId;
    this.authToken = authToken;
  }

  async init(): Promise<void> {
    await this.refreshProfile();
    this.scan();
    this.startObserver();
    this.startPoller();
  }

  destroy(): void {
    this.observer?.disconnect();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.removeOverlay();
  }

  // ─── Profile management ────────────────────────────────────────────────────

  private async refreshProfile(): Promise<void> {
    const now = Date.now();
    if (this.profile && now - this.profileFetchedAt < CACHE_TTL_MS) return;
    try {
      const resp = await fetch(
        `${EXT_CONFIG.API_BASE_URL}/user/${encodeURIComponent(this.discordId)}/exclusions`,
        {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );
      if (!resp.ok) return;
      const body = await resp.json() as { success: boolean; data: ForbiddenGamesProfile };
      if (body.success && body.data) {
        this.profile = body.data;
        this.profileFetchedAt = now;
      }
    } catch {
      // Network unavailable — use stale profile if present
    }
  }

  // ─── Matching helpers ──────────────────────────────────────────────────────

  private matchGameId(slug: string): BlockMatch | null {
    if (!this.profile) return null;
    const lower = slug.toLowerCase();

    for (const id of this.profile.blockedGameIds) {
      if (lower.includes(id.toLowerCase())) {
        const entry = this.profile.exclusions.find((e) => e.gameId === id) ?? null;
        return { gameId: id, category: null, reason: entry?.reason ?? null };
      }
    }
    return null;
  }

  private matchCategory(slug: string): BlockMatch | null {
    if (!this.profile) return null;
    const lower = slug.toLowerCase();

    for (const cat of this.profile.blockedCategories) {
      const keywords = CATEGORY_SLUGS[cat] ?? [];
      if (keywords.some((kw) => lower.includes(kw))) {
        const entry = this.profile.exclusions.find((e) => e.category === cat) ?? null;
        return { gameId: null, category: cat, reason: entry?.reason ?? null };
      }
    }
    return null;
  }

  private isBlocked(slug: string): BlockMatch | null {
    return this.matchGameId(slug) ?? this.matchCategory(slug);
  }

  // ─── DOM scan ─────────────────────────────────────────────────────────────

  private scan(): void {
    if (this.isDismissedForSession()) {
      this.removeOverlay();
      return;
    }

    if (!this.profile) return;

    // Check page URL
    const urlSlug = window.location.pathname + window.location.search;
    const urlMatch = this.isBlocked(urlSlug);
    if (urlMatch) {
      this.injectOverlay(urlMatch);
      return;
    }

    // Check iframes
    for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe[src]'))) {
      const match = this.isBlocked(iframe.src);
      if (match) {
        this.injectOverlay(match);
        return;
      }
    }

    // Check play buttons with data-game-id
    for (const btn of Array.from(document.querySelectorAll<HTMLElement>('[data-game-id]'))) {
      const gameId = btn.dataset['gameId'] ?? '';
      const match = this.isBlocked(gameId);
      if (match) {
        this.injectOverlay(match);
        return;
      }
    }

    // No match — remove overlay if previously injected
    this.removeOverlay();
  }

  // ─── DOM observer ─────────────────────────────────────────────────────────

  private startObserver(): void {
    this.observer = new MutationObserver(() => this.scan());
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  // ─── Profile refresh poller ───────────────────────────────────────────────

  private startPoller(): void {
    this.pollTimer = setInterval(async () => {
      await this.refreshProfile();
      this.scan();
    }, POLL_INTERVAL_MS);
  }

  // ─── Overlay ──────────────────────────────────────────────────────────────

  private injectOverlay(match: BlockMatch): void {
    if (document.getElementById(OVERLAY_ID)) return;

    const label = match.gameId
      ? `game ID: ${match.gameId}`
      : `category: ${(match.category ?? '').replace(/_/g, ' ')}`;

    const reasonHtml = match.reason
      ? `<p class="tc-block-reason">"${match.reason}"</p>`
      : '';

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="tc-block-inner">
        <div class="tc-block-badge">BLOCKED BY YOU</div>
        <h2 class="tc-block-title">Not today.</h2>
        <p class="tc-block-body">
          You told TiltCheck to block ${label}.<br>
          Past-you was looking out for present-you. Respect the call.
        </p>
        ${reasonHtml}
        <div class="tc-block-actions">
          <a class="tc-block-btn tc-block-btn--primary" href="https://tiltcheck.me/dashboard" target="_blank">
            Open Dashboard
          </a>
          <button class="tc-block-btn tc-block-btn--ghost" id="tc-block-dismiss">
            I know what I'm doing — dismiss for this session
          </button>
        </div>
        <footer class="tc-block-footer">Made for Degens. By Degens.</footer>
      </div>
    `;

    this.applyStyles(overlay);
    document.body.appendChild(overlay);

    document.getElementById('tc-block-dismiss')?.addEventListener('click', () => {
      this.setDismissedForSession(true);
      this.removeOverlay();
    });
  }

  private isDismissedForSession(): boolean {
    try {
      return window.sessionStorage.getItem(this.dismissStorageKey) === '1';
    } catch {
      return false;
    }
  }

  private setDismissedForSession(dismissed: boolean): void {
    try {
      if (dismissed) {
        window.sessionStorage.setItem(this.dismissStorageKey, '1');
      } else {
        window.sessionStorage.removeItem(this.dismissStorageKey);
      }
    } catch {
      // Ignore storage failures and fall back to the current DOM state.
    }
  }

  private removeOverlay(): void {
    document.getElementById(OVERLAY_ID)?.remove();
  }

  private applyStyles(overlay: HTMLElement): void {
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.92)',
      fontFamily: 'system-ui, sans-serif',
    });

    const style = document.createElement('style');
    style.textContent = `
      #${OVERLAY_ID} .tc-block-inner {
        max-width: 480px;
        width: 90%;
        background: #111;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 40px 32px 28px;
        text-align: center;
        color: #f0f0f0;
      }
      #${OVERLAY_ID} .tc-block-badge {
        display: inline-block;
        background: #dc2626;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        padding: 4px 10px;
        border-radius: 4px;
        margin-bottom: 16px;
        text-transform: uppercase;
      }
      #${OVERLAY_ID} .tc-block-title {
        font-size: 28px;
        font-weight: 800;
        margin: 0 0 12px;
        color: #fff;
      }
      #${OVERLAY_ID} .tc-block-body {
        font-size: 15px;
        line-height: 1.6;
        color: #aaa;
        margin: 0 0 12px;
      }
      #${OVERLAY_ID} .tc-block-reason {
        font-style: italic;
        color: #888;
        font-size: 13px;
        margin-bottom: 24px;
      }
      #${OVERLAY_ID} .tc-block-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 28px;
      }
      #${OVERLAY_ID} .tc-block-btn {
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        border: none;
      }
      #${OVERLAY_ID} .tc-block-btn--primary {
        background: #7c3aed;
        color: #fff;
      }
      #${OVERLAY_ID} .tc-block-btn--ghost {
        background: transparent;
        color: #666;
        font-size: 12px;
      }
      #${OVERLAY_ID} .tc-block-btn--ghost:hover { color: #999; }
      #${OVERLAY_ID} .tc-block-footer {
        font-size: 11px;
        color: #444;
        letter-spacing: 0.05em;
      }
    `;
    document.head.appendChild(style);
  }
}
