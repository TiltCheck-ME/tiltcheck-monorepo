// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19

import { SidebarUI } from './types.js';

const BONUSES_CACHE_KEY = 'tg_bonuses_cache';
const BONUSES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const BONUSES_PRIMARY_URL = 'https://api.tiltcheck.me/bonuses';
const BONUSES_FALLBACK_URL =
  'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json';
const BONUSES_DISPLAY_COUNT = 5;
const BONUS_CLAIM_ALLOWED_HOSTS = [
  'stake.com',
  'stake.us',
  'roobet.com',
  'bc.game',
  'duelbits.com',
  'rollbit.com',
  'shuffle.com',
  'gamdom.com',
  'csgoempire.com',
  'tiltcheck.me',
] as const;

export interface BonusEntry {
  brand: string;
  description: string;
  code?: string;
  claimUrl?: string;
}

interface BonusCache {
  data: BonusEntry[];
  fetchedAt: number;
}

interface BonusApiResponse {
  data?: unknown[];
  bonuses?: unknown[];
  suppression?: {
    active?: boolean;
    hiddenCount?: number;
  };
}

export class BonusManager {
  private ui: SidebarUI;
  private bonuses: BonusEntry[] = [];
  private loading = false;
  private expanded = false;
  private hiddenCount = 0;

  constructor(ui: SidebarUI) {
    this.ui = ui;
  }

  public async init(): Promise<void> {
    this.setupListeners();
    await this.loadBonuses(false);
  }

  private setupListeners(): void {
    document
      .getElementById('tg-bonuses-toggle')
      ?.addEventListener('click', () => this.toggleSection());

    document
      .getElementById('tg-bonuses-refresh')
      ?.addEventListener('click', () => this.loadBonuses(true));
  }

  private toggleSection(): void {
    this.expanded = !this.expanded;
    const body = document.getElementById('tg-bonuses-body');
    const toggle = document.getElementById('tg-bonuses-toggle');
    if (body) body.style.display = this.expanded ? 'block' : 'none';
    if (toggle) toggle.textContent = this.expanded ? '[COLLAPSE]' : '[EXPAND]';
  }

  public async loadBonuses(forceRefresh: boolean): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.setStatus('Loading...');

    try {
      if (!forceRefresh) {
        const cached = await this.getCache();
        if (cached) {
          this.bonuses = cached.data;
          this.render();
          this.loading = false;
          return;
        }
      }

      const data = await this.fetchFromNetwork();
      if (data) {
        this.bonuses = data;
        if (data.length > 0) {
          await this.setCache(data);
        }
        this.render();
      } else {
        this.setStatus('No bonus data available.');
      }
    } catch (err) {
      console.warn('[BonusManager] Failed to load bonuses', err);
      this.setStatus('Failed to load bonuses.');
    } finally {
      this.loading = false;
    }
  }

  private async fetchFromNetwork(): Promise<BonusEntry[] | null> {
    const authToken = await this.getAuthToken();
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;

    // Try primary endpoint first, fall back to CollectClock GitHub data
    try {
      const resp = await fetch(BONUSES_PRIMARY_URL, { headers, signal: AbortSignal.timeout(6000) });
      if (resp.ok) {
        const json = await resp.json() as BonusApiResponse;
        this.hiddenCount = Math.max(0, Number(json?.suppression?.hiddenCount ?? 0));
        const entries = this.normalizeResponse(json);
        if (entries.length > 0) return entries;
        if (this.hiddenCount > 0) return [];
      }
    } catch {
      // Primary failed — fall through to fallback
    }

    this.hiddenCount = 0;

    try {
      const resp = await fetch(BONUSES_FALLBACK_URL, { signal: AbortSignal.timeout(8000) });
      if (resp.ok) {
        const json = await resp.json();
        return this.normalizeResponse(json);
      }
    } catch (err) {
      console.warn('[BonusManager] Fallback also failed', err);
    }

    return null;
  }

  /**
   * Normalize API responses to BonusEntry[]. Handles both shapes:
   *   - { data: [...] }
   *   - { bonuses: [...] }
   *   - [...]
   */
  private normalizeResponse(json: any): BonusEntry[] {
    const raw: any[] = Array.isArray(json) ? json : (json?.data ?? json?.bonuses ?? []);
    return raw
      .filter((item: any) => item && typeof item.brand === 'string')
      .map((item: any): BonusEntry => ({
        brand: String(item.brand ?? ''),
        description: String(item.description ?? item.desc ?? ''),
        code: item.code ? String(item.code) : undefined,
        claimUrl:
          typeof item.claimUrl === 'string'
            ? item.claimUrl
            : typeof item.url === 'string'
              ? item.url
              : undefined,
      }));
  }

  private render(): void {
    const list = document.getElementById('tg-bonuses-list');
    if (!list) return;

    if (this.bonuses.length === 0) {
      list.innerHTML = this.hiddenCount > 0
        ? `<div class="tg-bonus-empty">All matching bonuses are hidden by your active filters. ${this.hiddenCount} suppressed.</div>`
        : '<div class="tg-bonus-empty">No bonuses found.</div>';
      return;
    }

    const top = this.bonuses.slice(0, BONUSES_DISPLAY_COUNT);
    list.innerHTML = top
      .map(
        (b) => `
        <div class="tg-bonus-item">
          <div class="tg-bonus-brand">${this.esc(b.brand)}</div>
          <div class="tg-bonus-desc">${this.esc(b.description)}</div>
          ${b.code ? `<div class="tg-bonus-code">[CODE: ${this.esc(b.code)}]</div>` : ''}
          ${this.renderClaimAction(b.claimUrl)}
        </div>
      `
      )
      .join('')
      + (this.hiddenCount > 0
        ? `<div class="tg-bonus-empty">${this.hiddenCount} hidden by your active filters.</div>`
        : '');
  }

  private renderClaimAction(claimUrl?: string): string {
    const safeClaimUrl = this.getSafeClaimUrl(claimUrl);
    if (safeClaimUrl) {
      return `<a class="tg-bonus-claim" href="${this.esc(safeClaimUrl)}" target="_blank" rel="noopener noreferrer">[CLAIM]</a>`;
    }

    if (typeof claimUrl === 'string' && claimUrl.trim()) {
      return '<span class="tg-bonus-claim tg-bonus-claim-blocked" title="Blocked unsafe claim link">[LINK BLOCKED]</span>';
    }

    return '';
  }

  private getSafeClaimUrl(rawClaimUrl?: string): string | null {
    if (typeof rawClaimUrl !== 'string') {
      return null;
    }

    const trimmedClaimUrl = rawClaimUrl.trim();
    if (!trimmedClaimUrl) {
      return null;
    }

    try {
      const parsedClaimUrl = new URL(trimmedClaimUrl);
      if (parsedClaimUrl.protocol !== 'https:') {
        return null;
      }

      if (parsedClaimUrl.username || parsedClaimUrl.password) {
        return null;
      }

      const hostname = parsedClaimUrl.hostname.replace(/^www\./, '').toLowerCase();
      if (!hostname || !this.isAllowedClaimHost(hostname)) {
        return null;
      }

      parsedClaimUrl.hash = '';
      return parsedClaimUrl.toString();
    } catch {
      return null;
    }
  }

  private isAllowedClaimHost(hostname: string): boolean {
    return BONUS_CLAIM_ALLOWED_HOSTS.some(
      (allowedHost) => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
    );
  }

  private setStatus(msg: string): void {
    const list = document.getElementById('tg-bonuses-list');
    if (list) list.innerHTML = `<div class="tg-bonus-empty">${this.esc(msg)}</div>`;
  }

  private async getCache(): Promise<BonusCache | null> {
    try {
      const result = await this.ui.getStorage([BONUSES_CACHE_KEY]);
      const cached = result[BONUSES_CACHE_KEY] as BonusCache | undefined;
      if (!cached || !cached.fetchedAt) return null;
      if (Date.now() - cached.fetchedAt > BONUSES_CACHE_TTL_MS) return null;
      return cached;
    } catch {
      return null;
    }
  }

  private async setCache(data: BonusEntry[]): Promise<void> {
    const cache: BonusCache = { data, fetchedAt: Date.now() };
    await this.ui.setStorage({ [BONUSES_CACHE_KEY]: cache });
  }

  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const result = await this.ui.getStorage(['authToken']);
      const token = typeof result['authToken'] === 'string' ? result['authToken'].trim() : '';
      return token || null;
    } catch {
      return null;
    }
  }
}
