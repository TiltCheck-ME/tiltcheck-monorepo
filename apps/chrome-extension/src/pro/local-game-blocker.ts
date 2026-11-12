/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */

/**
 * User-configured game/category filter. Nothing is blocked until the popup list is armed.
 * Core content.ts installs this. Clicks on matching lobby tiles are swallowed.
 */

import {
  loadBlockedCategories,
  loadBlockedGameSlugs,
  loadGameBlockOptIn,
  TILTCHECK_BLOCKED_CATEGORIES_KEY,
  TILTCHECK_BLOCKED_GAMES_KEY,
  TILTCHECK_GAME_BLOCK_OPT_IN_KEY,
  TILTCHECK_EXTENSION_ENABLED_KEY,
} from './blocked-games-options.js';
import {
  haystackFromElement,
  haystackFromLocation,
  matchExclusion,
  type ExclusionHit,
  type GameCategory,
} from '../exclusion-taxonomy.js';
import { isInsideTiltcheckSafetyRoot, mutationsOnlyTouchSafetyRoots } from './containment.js';

const LOCAL_OVERLAY_ID = 'tiltcheck-local-game-block-overlay';
const SANITIZED_ATTR = 'data-tiltcheck-local-blocked';
const PLACEHOLDER_LABEL = '[ GAME EXCLUDED ]';

let installed: LocalGameBlocker | null = null;

export function installLocalGameBlocker(doc: Document = document): LocalGameBlocker {
  if (installed) return installed;
  installed = new LocalGameBlocker(doc);
  void installed.init();
  return installed;
}

export class LocalGameBlocker {
  private blockedSlugs: string[] = [];
  private blockedCategories: GameCategory[] = [];
  private enforcementEnabled = false;
  private observer: MutationObserver | null = null;
  private scanScheduled = false;
  private storageListenerAttached = false;
  private clickBound = false;
  private readonly doc: Document;

  constructor(doc: Document = document) {
    this.doc = doc;
  }

  private readonly onBlockedPointer = (event: Event): void => {
    if (!this.enforcementEnabled) return;
    if (this.blockedSlugs.length === 0 && this.blockedCategories.length === 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (isInsideTiltcheckSafetyRoot(target)) return;
    const hit = matchExclusion(haystackFromElement(target), this.blockedSlugs, this.blockedCategories);
    if (!hit) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const card = target.closest('a, button, [role="button"], article, li, div');
    if (card instanceof HTMLElement) {
      this.sanitizeNode(card, hit.value);
    }
  };

  private readonly handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ) => {
    if (area !== 'local') return;
    if (
      changes[TILTCHECK_BLOCKED_GAMES_KEY] ||
      changes[TILTCHECK_BLOCKED_CATEGORIES_KEY] ||
      changes[TILTCHECK_GAME_BLOCK_OPT_IN_KEY] ||
      changes[TILTCHECK_EXTENSION_ENABLED_KEY]
    ) {
      void this.reloadAndScan();
    }
  };

  async init(): Promise<void> {
    await this.reloadAndScan();
    this.startObserver();
    this.attachStorageListener();
    this.attachClickGuard();
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
    this.detachClickGuard();
    if (installed === this) installed = null;
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
    this.blockedCategories = this.enforcementEnabled ? await loadBlockedCategories() : [];
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
    if (this.blockedSlugs.length === 0 && this.blockedCategories.length === 0) {
      this.removeUrlOverlay();
      return;
    }

    const urlHit = this.matchHref(window.location.href);
    if (urlHit) {
      this.injectUrlOverlay(urlHit.value);
      return;
    }

    this.removeUrlOverlay();
    this.redactDomMatches();
  }

  /** Returns matched slug/category when URL path/search references a blocked game. */
  matchUrl(
    href: string,
    slugs: readonly string[] = this.blockedSlugs,
    categories: readonly GameCategory[] = this.blockedCategories,
  ): string | null {
    return this.matchHref(href, slugs, categories)?.value ?? null;
  }

  private matchHref(
    href: string,
    slugs: readonly string[] = this.blockedSlugs,
    categories: readonly GameCategory[] = this.blockedCategories,
  ): ExclusionHit | null {
    let loc = { pathname: href, search: '', href };
    try {
      const parsed = new URL(href, window.location.origin);
      loc = { pathname: parsed.pathname, search: parsed.search, href: parsed.href };
    } catch {
      // keep raw href
    }
    return matchExclusion(haystackFromLocation(loc), slugs, categories);
  }

  private redactDomMatches(): void {
    const nodesByKey = this.collectBlockedNodes();
    for (const [key, nodes] of nodesByKey) {
      for (const node of nodes) {
        this.sanitizeNode(node, key);
      }
    }
  }

  /** Single-pass DOM scan: map each blocked slug/category to nodes that reference it. */
  private collectBlockedNodes(): Map<string, HTMLElement[]> {
    const buckets = new Map<string, Set<HTMLElement>>();

    const tryAdd = (el: Element | null, key: string) => {
      if (!el || !(el instanceof HTMLElement)) return;
      if (isInsideTiltcheckSafetyRoot(el)) return;
      if (el.closest(`#${LOCAL_OVERLAY_ID}`)) return;
      const card = el.closest('a, button, [role="button"], article, li, div') as HTMLElement | null;
      if (!buckets.has(key)) buckets.set(key, new Set());
      buckets.get(key)?.add(card ?? el);
    };

    const consider = (el: Element) => {
      const hit = matchExclusion(haystackFromElement(el), this.blockedSlugs, this.blockedCategories);
      if (hit) tryAdd(el, hit.value);
    };

    for (const anchor of this.doc.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      consider(anchor);
    }

    for (const el of this.doc.querySelectorAll<HTMLElement>(
      'button, [role="button"], [data-game-name], [data-game-id], [data-game], [data-testid*="game"]'
    )) {
      consider(el);
    }

    const result = new Map<string, HTMLElement[]>();
    for (const [key, set] of buckets) {
      if (set.size > 0) {
        result.set(key, [...set]);
      }
    }
    return result;
  }

  private attachClickGuard(): void {
    if (this.clickBound) return;
    this.doc.addEventListener('click', this.onBlockedPointer, true);
    this.doc.addEventListener('pointerdown', this.onBlockedPointer, true);
    this.clickBound = true;
  }

  private detachClickGuard(): void {
    if (!this.clickBound) return;
    this.doc.removeEventListener('click', this.onBlockedPointer, true);
    this.doc.removeEventListener('pointerdown', this.onBlockedPointer, true);
    this.clickBound = false;
  }

  private disableInteractiveTarget(target: HTMLElement): void {
    target.style.pointerEvents = 'none';
    if (target instanceof HTMLButtonElement) {
      target.disabled = true;
    }
    if (target.getAttribute('role') === 'button') {
      target.setAttribute('aria-disabled', 'true');
      target.tabIndex = -1;
    }
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
      this.disableInteractiveTarget(target);
      target.setAttribute(SANITIZED_ATTR, slug);
      return;
    }

    target.replaceChildren(placeholder);
    this.disableInteractiveTarget(target);
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
          You put this on your list. It does not click. Edit the list in the extension Guards tab.
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
    if (!this.doc.body) return;
    this.observer = new MutationObserver((mutations) => {
      if (mutationsOnlyTouchSafetyRoots(mutations)) {
        return;
      }
      this.scheduleScan();
    });
    this.observer.observe(this.doc.body, { childList: true, subtree: true });
  }
}
