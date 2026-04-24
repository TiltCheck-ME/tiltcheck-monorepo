/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
/**
 * Game Blocker — Surgical Self-Exclusion enforcement for the Chrome Extension.
 *
 * Fetches the user's ForbiddenGamesProfile from the TiltCheck API, then watches
 * the casino DOM for matching game launchers, providers, and casino hostnames.
 * When a blocked target is detected it injects a full-page overlay that prevents
 * play and surfaces the user's own exclusion rationale.
 *
 * Detection strategy (in priority order):
 *  1. Iframe src attribute containing a blocked game ID slug
 *  2. Play / Launch button data-game-id attribute
 *  3. URL pathname containing a blocked game ID slug or category keyword
 *  4. DOM metadata and hostname matching blocked provider/casino slugs
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
  provider: string | null;
  casino: string | null;
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
  private readonly handleWindowFocus = () => {
    void this.refreshAndScan(true);
  };
  private readonly handlePageShow = () => {
    void this.refreshAndScan(true);
  };
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void this.refreshAndScan(true);
    }
  };

  constructor(discordId: string, authToken: string) {
    this.discordId = discordId;
    this.authToken = authToken;
  }

  async init(): Promise<void> {
    await this.refreshProfile();
    this.scan();
    this.startObserver();
    this.startPoller();
    this.attachReturnListeners();
  }

  destroy(): void {
    this.observer?.disconnect();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.detachReturnListeners();
    this.removeOverlay();
  }

  // ─── Profile management ────────────────────────────────────────────────────

  private async refreshProfile(force = false): Promise<void> {
    const now = Date.now();
    if (!force && this.profile && now - this.profileFetchedAt < CACHE_TTL_MS) return;
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

  private async refreshAndScan(force = false): Promise<void> {
    await this.refreshProfile(force);
    this.scan();
  }

  // ─── Matching helpers ──────────────────────────────────────────────────────

  private normalizeLookupValue(value: string | null | undefined): string | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeSlugValue(value: string | null | undefined): string | null {
    if (!value) return null;
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized.length > 0 ? normalized : null;
  }

  private tokenMatches(blockedValue: string, candidateValue: string): boolean {
    return candidateValue === blockedValue
      || candidateValue.startsWith(`${blockedValue}-`)
      || blockedValue.startsWith(`${candidateValue}-`);
  }

  private matchGameId(slug: string): BlockMatch | null {
    if (!this.profile) return null;
    const lower = this.normalizeLookupValue(slug);
    if (!lower) return null;

    for (const id of this.profile.blockedGameIds) {
      const blockedId = this.normalizeLookupValue(id);
      if (blockedId && lower.includes(blockedId)) {
        const entry = this.profile.exclusions.find((e) => e.gameId === id) ?? null;
        return { gameId: id, category: null, provider: null, casino: null, reason: entry?.reason ?? null };
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
        return { gameId: null, category: cat, provider: null, casino: null, reason: entry?.reason ?? null };
      }
    }
    return null;
  }

  private collectProviderCandidates(): string[] {
    const candidates = new Set<string>();
    const addCandidate = (value: string | null | undefined) => {
      const normalized = this.normalizeSlugValue(value);
      if (normalized) {
        candidates.add(normalized);
      }
    };

    addCandidate(document.title);
    addCandidate(window.location.pathname);
    addCandidate(window.location.search);

    const metaProvider = document.querySelector<HTMLMetaElement>('meta[name="provider"], meta[property="og:provider"]');
    addCandidate(metaProvider?.content);

    for (const element of Array.from(document.querySelectorAll<HTMLElement>('[data-provider], [data-provider-name], [data-game-provider], [data-game-provider-name]'))) {
      addCandidate(element.dataset['provider']);
      addCandidate(element.dataset['providerName']);
      addCandidate(element.dataset['gameProvider']);
      addCandidate(element.dataset['gameProviderName']);
      addCandidate(element.getAttribute('data-provider'));
      addCandidate(element.getAttribute('data-provider-name'));
      addCandidate(element.getAttribute('data-game-provider'));
      addCandidate(element.getAttribute('data-game-provider-name'));
    }

    return [...candidates];
  }

  private collectCasinoCandidates(): string[] {
    const hostname = window.location.hostname.toLowerCase();
    const candidates = new Set<string>();
    const addCandidate = (value: string | null | undefined) => {
      const normalized = this.normalizeSlugValue(value);
      if (normalized) {
        candidates.add(normalized);
      }
    };

    addCandidate(hostname);
    for (const segment of hostname.split('.')) {
      addCandidate(segment);
    }
    addCandidate(hostname.split('.')[0] ?? '');

    return [...candidates];
  }

  private matchProvider(): BlockMatch | null {
    if (!this.profile) return null;
    const candidates = this.collectProviderCandidates();

    for (const provider of this.profile.blockedProviders) {
      const blockedProvider = this.normalizeSlugValue(provider);
      if (!blockedProvider) continue;
      const matched = candidates.some((candidate) => this.tokenMatches(blockedProvider, candidate));
      if (matched) {
        const entry = this.profile.exclusions.find((e) => e.provider === provider) ?? null;
        return { gameId: null, category: null, provider, casino: null, reason: entry?.reason ?? null };
      }
    }

    return null;
  }

  private matchCasino(): BlockMatch | null {
    if (!this.profile) return null;
    const candidates = this.collectCasinoCandidates();

    for (const casino of this.profile.blockedCasinos) {
      const blockedCasino = this.normalizeSlugValue(casino);
      if (!blockedCasino) continue;
      const matched = candidates.some((candidate) => this.tokenMatches(blockedCasino, candidate));
      if (matched) {
        const entry = this.profile.exclusions.find((e) => e.casino === casino) ?? null;
        return { gameId: null, category: null, provider: null, casino, reason: entry?.reason ?? null };
      }
    }

    return null;
  }

  private isBlocked(slug: string): BlockMatch | null {
    return this.matchGameId(slug) ?? this.matchCategory(slug) ?? this.matchProvider() ?? this.matchCasino();
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

  private attachReturnListeners(): void {
    window.addEventListener('focus', this.handleWindowFocus);
    window.addEventListener('pageshow', this.handlePageShow);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private detachReturnListeners(): void {
    window.removeEventListener('focus', this.handleWindowFocus);
    window.removeEventListener('pageshow', this.handlePageShow);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  // ─── Profile refresh poller ───────────────────────────────────────────────

  private startPoller(): void {
    this.pollTimer = setInterval(async () => {
      await this.refreshAndScan();
    }, POLL_INTERVAL_MS);
  }

  // ─── Overlay ──────────────────────────────────────────────────────────────

  private injectOverlay(match: BlockMatch): void {
    if (document.getElementById(OVERLAY_ID)) return;

    const label = match.gameId
      ? `game ID: ${match.gameId}`
      : match.category
        ? `category: ${(match.category ?? '').replace(/_/g, ' ')}`
        : match.provider
          ? `provider: ${match.provider.replace(/[-_]/g, ' ')}`
          : `casino: ${(match.casino ?? '').replace(/[-_]/g, ' ')}`;

    const reasonHtml = match.reason
      ? `<p class="tc-block-reason">"${match.reason}"</p>`
      : '';
    const safetyUrl = `${EXT_CONFIG.DASHBOARD_URL}?tab=safety`;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="tc-block-inner">
        <div class="tc-block-badge">BLOCKED BY YOU</div>
        <h2 class="tc-block-title">Not today.</h2>
        <p class="tc-block-body">
          You told TiltCheck to block ${label}.<br>
          Past-you was looking out for present-you. Respect the call.<br>
          The dashboard owns the filter. This page just enforces it.
        </p>
        ${reasonHtml}
        <div class="tc-block-actions">
          <a class="tc-block-btn tc-block-btn--primary" href="${safetyUrl}" target="_blank">
            Open Safety Controls
          </a>
          <button class="tc-block-btn tc-block-btn--ghost" id="tc-block-dismiss">
            Dismiss for this session
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
