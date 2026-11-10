/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */
/**
 * decoupled-sidebar.ts
 * Lightweight, non-custodial spotter sidebar interface.
 * Decoupled from legacy bonuses, simulated blockchain, and unmaintained sidebar tree.
 * Zero custody of player funds.
 */

import type { CasinoVerification } from './license-verifier.js';

export const INJECTION_DISABLED_KEY = 'tiltcheck_injection_disabled';

export interface SessionStats {
  startTime: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  currentBalance: number;
}

export interface SidebarUI {
  syncAccountUi(): void;
  showMainContent(): void;
  addFeedMessage(msg: string): void;
  getStorage(keys: string[]): Promise<Record<string, any>>;
  setStorage(data: Record<string, any>): Promise<void>;
  updateStatus(message: string, type: 'success' | 'warning' | 'thinking' | 'danger' | 'info'): void;
  updateRealityCheck(active: boolean): void;
  updateLicense(data: CasinoVerification | null): void;
  updateTilt(score: number, indicators: string[]): void;
  updateStats(stats: Partial<SessionStats>): void;
  notifyBuddy(event: string, data: any): void;
  openPremium?(): Promise<void>;
}

export function initSidebar(_onDisable?: () => void | Promise<void>): SidebarUI {
  const existing = document.getElementById('tiltcheck-sidebar');
  if (existing) existing.remove();

  const sidebarEl = document.createElement('div');
  sidebarEl.id = 'tiltcheck-sidebar';
  sidebarEl.style.cssText =
    'position:fixed;top:0;right:0;width:340px;height:100vh;background:#0f1115;color:#fff;z-index:2147483640;display:none;font-family:ui-monospace,monospace;border-left:1px solid #2a3140;padding:1rem;box-sizing:border-box;overflow-y:auto;';
  sidebarEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2a3140;padding-bottom:0.75rem;margin-bottom:1rem;">
      <span style="font-weight:800;color:#17c3b2;font-size:0.875rem;letter-spacing:0.05em;">TiltCheck Spotter</span>
      <button id="tg-hide" type="button" style="background:transparent;border:0;color:#9aa3b2;cursor:pointer;font:inherit;">Close</button>
    </div>
    <div id="tg-sidebar-status" style="font-size:0.75rem;color:#9aa3b2;margin-bottom:1rem;">Spotter active. Zero custody. Non-custodial checks and brakes.</div>
    <div id="tg-sidebar-feed" style="font-size:0.75rem;color:#e2e8f0;display:flex;flex-direction:column;gap:0.5rem;"></div>
  `;
  document.body.appendChild(sidebarEl);

  sidebarEl.querySelector('#tg-hide')?.addEventListener('click', () => {
    sidebarEl.style.display = 'none';
  });

  return {
    syncAccountUi: () => {},
    showMainContent: () => {},
    addFeedMessage: (msg: string) => {
      const feed = sidebarEl.querySelector('#tg-sidebar-feed');
      if (feed) {
        const item = document.createElement('div');
        item.style.cssText = 'padding:0.5rem;background:#1a1f29;border-radius:4px;border-left:3px solid #17c3b2;';
        item.textContent = msg;
        feed.prepend(item);
      }
    },
    getStorage: async (keys: string[]) => {
      return chrome.storage.local.get(keys);
    },
    setStorage: async (data: Record<string, any>) => {
      return chrome.storage.local.set(data);
    },
    updateStatus: (msg: string, type: 'success' | 'warning' | 'thinking' | 'danger' | 'info') => {
      const el = sidebarEl.querySelector('#tg-sidebar-status');
      if (el) {
        el.textContent = msg;
        el.setAttribute('data-status-type', type);
      }
    },
    updateRealityCheck: () => {},
    updateLicense: (data: CasinoVerification | null) => {
      const el = sidebarEl.querySelector('#tg-sidebar-status');
      if (el && data?.warningMessage) {
        el.textContent = data.warningMessage;
      }
    },
    updateTilt: () => {},
    updateStats: () => {},
    notifyBuddy: () => {},
    openPremium: async () => {},
  };
}
