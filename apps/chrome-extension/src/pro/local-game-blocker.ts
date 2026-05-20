/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */

/**
 * Pro-only strategic game filter — persistent local blocklist (no API).
 * URL hard-stop + DOM grid redaction. Does not run in core content.ts.
 */

import {
  loadBlockedGameSlugs,
  loadGameBlockOptIn,
  TILTCHECK_BLOCKED_GAMES_KEY,
  TILTCHECK_GAME_BLOCK_OPT_IN_KEY,
} from './blocked-games-options.js';
import { isInsideTiltcheckSafetyRoot, mutationsOnlyTouchSafetyRoots } from './containment.js';

const LOCAL_OVERLAY_ID = 'tiltcheck-local-game-block-overlay';
const SANITIZED_ATTR = 'data-tiltcheck-local-blocked';
const PLACEHOLDER_LABEL = '[ GAME EXCLUDED ]';

export class LocalGameBlocker {
  private blockedSlugs: string[] = [];
  private enforcementEnabled = false;
  private observer: MutationObserver | null = null;
  private scanScheduled = false;
  private storageListenerAttached = false;

  private readonly handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ) => {
    if (area !== 'local') return;
    if (changes[TILTCHECK_BLOCKED_GAMES_KEY] || changes[TILTCHECK_GAME_BLOCK_OPT_IN_KEY]) {
      void this.reloadAndScan();
    }
  };

  async init(): Promise<void> {
    await this.reloadAndScan();
    this.startObserver();
    this.attachStorageListener();
  }

  resume(_source = 'navigation'): void {
    void this.reloadAndScan();
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.storageListenerAttached) {
      try {
        chrome.storage.onChanged.removeListener(this.handleStorageChange);
      } catch {
        // ignore
      }
      this.storageListenerAttached = false;
    }
    this.removeUrlOverlay();
  }

  private attachStorageListener(): void {
    if (this.storageListenerAttached) return;
    try {
      chrome.storage.onChanged.addListener(this.handleStorageChange);
      this.storageListenerAttached = true;
    } catch {
      // ignore in test harness
    }
  }

  private async reloadAndScan(): Promise<void> {
    this.enforcementEnabled = await loadGameBlockOptIn();
    this.blockedSlugs = this.enforcementEnabled ? await loadBlockedGameSlugs() : [];
    this.scan();
  }

  private scheduleScan(): void {
    if (this.scanScheduled) return;
    this.scanScheduled = true;
    const run = () => {
      this.scanScheduled = false;
      this.scan();
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  }

  private scan(): void {
    if (this.blockedSlugs.length === 0) {
      this.removeUrlOverlay();
      return;
    }

    const urlHit = this.matchUrl(window.location.href, this.blockedSlugs);
    if (urlHit) {
      this.injectUrlOverlay(urlHit);
      return;
    }

    this.removeUrlOverlay();
    this.redactDomMatches();
  }

  /** Returns matched slug when URL path/search references a blocked game. */
  matchUrl(href: string, slugs: readonly string[] = this.blockedSlugs): string | null {
    let pathSearch = '';
    try {
      const u = new URL(href, window.location.origin);
      pathSearch = `${u.pathname}${u.search}`.toLowerCase();
    } catch {
      pathSearch = href.toLowerCase();
    }

    for (const slug of slugs) {
      if (this.pathContainsSlug(pathSearch, slug)) {
        return slug;
      }
    }
    return null;
  }

  private pathContainsSlug(pathSearch: string, slug: string): boolean {
    if (pathSearch.includes(`/${slug}/`) || pathSearch.includes(`/${slug}`)) {
      return true;
    }
    if (pathSearch.includes(`games/${slug}`) || pathSearch.includes(`game/${slug}`)) {
      return true;
    }
    const segmentMatch = pathSearch.split(/[/?#&=_-]+/).includes(slug);
    return segmentMatch;
  }

  private redactDomMatches(): void {
    for (const slug of this.blockedSlugs) {
      const nodes = this.findGameNodes(slug);
      for (const node of nodes) {
        this.sanitizeNode(node, slug);
      }
    }
  }

  private findGameNodes(slug: string): HTMLElement[] {
    const out = new Set<HTMLElement>();
    const lower = slug.toLowerCase();

    const tryAdd = (el: Element | null) => {
      if (!el || !(el instanceof HTMLElement)) return;
      if (isInsideTiltcheckSafetyRoot(el)) return;
      if (el.closest(`#${LOCAL_OVERLAY_ID}`)) return;
      const card = el.closest('a, button, [role="button"], article, li, div') as HTMLElement | null;
      out.add(card ?? el);
    };

    for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const href = anchor.getAttribute('href') ?? '';
      if (href.toLowerCase().includes(lower)) {
        tryAdd(anchor);
      }
    }

    for (const el of document.querySelectorAll<HTMLElement>(
      '[data-game-name], [data-game-id], [data-game], [data-testid*="game"]'
    )) {
      const blob = [
        el.getAttribute('data-game-name'),
        el.getAttribute('data-game-id'),
        el.getAttribute('data-game'),
        el.getAttribute('data-testid'),
        el.textContent,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (blob.includes(lower)) {
        tryAdd(el);
      }
    }

    return [...out];
  }

  private sanitizeNode(target: HTMLElement, slug: string): void {
    if (target.getAttribute(SANITIZED_ATTR) === slug) return;

    const placeholder = document.createElement('div');
    placeholder.setAttribute(SANITIZED_ATTR, slug);
    placeholder.setAttribute('aria-label', `Game excluded: ${slug}`);
    placeholder.style.cssText = `
      background: #1a1d24;
      color: #ff4a4a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 72px;
      height: 100%;
      width: 100%;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      border: 1px dashed #ff4a4a;
      border-radius: 4px;
      box-sizing: border-box;
      pointer-events: none;
      user-select: none;
    `;
    placeholder.textContent = PLACEHOLDER_LABEL;

    if (target.tagName === 'A') {
      const wrap = document.createElement('div');
      wrap.setAttribute(SANITIZED_ATTR, slug);
      wrap.style.pointerEvents = 'none';
      wrap.appendChild(placeholder);
      target.replaceChildren(wrap);
      target.removeAttribute('href');
      target.style.pointerEvents = 'none';
      target.setAttribute(SANITIZED_ATTR, slug);
      return;
    }

    target.replaceChildren(placeholder);
    target.style.pointerEvents = 'none';
    target.setAttribute(SANITIZED_ATTR, slug);
  }

  private injectUrlOverlay(slug: string): void {
    if (document.getElementById(LOCAL_OVERLAY_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = LOCAL_OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Access denied: ${slug} is on your exclusion list`);
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483646',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10, 12, 16, 0.97)',
      fontFamily: 'ui-monospace, monospace',
      color: '#f5f5f5',
      padding: '24px',
      boxSizing: 'border-box',
    });

    overlay.innerHTML = `
      <div style="max-width: 420px; text-align: center; border: 1px solid #333; border-radius: 12px; padding: 32px 24px; background: #111;">
        <div style="color: #ff4a4a; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; margin-bottom: 12px;">STRATEGIC FILTER</div>
        <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #fff;">Access denied.</h2>
        <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.5; color: #aaa;">
          <strong style="color: #ff4a4a;">${slug}</strong> is on your local exclusion list.
        </p>
        <p style="margin: 0 0 20px; font-size: 12px; line-height: 1.45; color: #666;">
          Past-you removed this game type from your interface. Edit the list in extension settings (Pro).
        </p>
        <button type="button" id="tiltcheck-local-block-back" style="
          background: transparent;
          border: 1px solid #444;
          color: #ccc;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        ">Go back</button>
        <footer style="margin-top: 20px; font-size: 10px; color: #444;">Made for Degens. By Degens.</footer>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('tiltcheck-local-block-back')?.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.assign('/');
      }
    });
  }

  private removeUrlOverlay(): void {
    document.getElementById(LOCAL_OVERLAY_ID)?.remove();
  }

  private startObserver(): void {
    if (!document.body) return;
    this.observer = new MutationObserver((mutations) => {
      if (mutationsOnlyTouchSafetyRoots(mutations)) {
        return;
      }
      this.scheduleScan();
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }
}
