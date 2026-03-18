/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SIDEBAR_TEMPLATE } from './template.js';
import { getSidebarStyles } from './styles.js';
import { AuthManager } from './auth.js';
import { SessionManager } from './session.js';
import { VaultManager } from './vault.js';
import { ReportManager } from './reports.js';
import { BlockchainManager } from './blockchain.js';
import { BuddyManager } from './buddy.js';
import { PredictorManager } from './predictor.js';
import { OnboardingManager } from './onboarding.js';
import { SidebarUI } from './types.js';

export class SidebarController implements SidebarUI {
  public auth: AuthManager;
  public session: SessionManager;
  public vault: VaultManager;
  public reports: ReportManager;
  public blockchain: BlockchainManager;
  public buddy: BuddyManager;
  public predictor: PredictorManager;
  public onboarding: OnboardingManager;

  constructor() {
    this.auth = new AuthManager(this);
    this.session = new SessionManager(this);
    this.vault = new VaultManager(this);
    this.reports = new ReportManager(this, this.auth);
    this.blockchain = new BlockchainManager(this);
    this.buddy = new BuddyManager(this, this.auth);
    this.predictor = new PredictorManager(this);
    this.onboarding = new OnboardingManager(this);
  }

  public init() {
    this.injectStyles();
    this.createDom();
    this.setupListeners();
    this.auth.restoreAuth();
    this.buddy.restorePrefs();
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = getSidebarStyles();
    document.head.appendChild(style);
  }

  private createDom() {
    const existing = document.getElementById('tiltcheck-sidebar');
    if (existing) existing.remove();

    const sidebar = document.createElement('div');
    sidebar.id = 'tiltcheck-sidebar';
    sidebar.innerHTML = SIDEBAR_TEMPLATE;
    document.body.appendChild(sidebar);
  }

  private setupListeners() {
    document.getElementById('tg-discord-login')?.addEventListener('click', () => this.auth.startDiscordLoginFlow());
    document.getElementById('tg-logout')?.addEventListener('click', () => this.auth.logout());
    
    document.getElementById('submit-report')?.addEventListener('click', () => {
        const typeEl = document.getElementById('report-type') as HTMLSelectElement | null;
        const detailsEl = document.getElementById('report-details') as HTMLTextAreaElement | null;
        if (typeEl && detailsEl) {
            this.reports.submitReport(typeEl.value, detailsEl.value, window.location.hostname);
        }
    });

    document.getElementById('cfg-buddy-mirror')?.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.buddy.setMirrorEnabled(target.checked);
    });

    // Predictor
    document.getElementById('tg-open-predictor')?.addEventListener('click', () => {
        const panel = document.getElementById('tg-predictor-panel');
        if (panel) panel.style.display = 'block';
        this.predictor.init();
    });
    document.getElementById('close-predictor')?.addEventListener('click', () => {
        const panel = document.getElementById('tg-predictor-panel');
        if (panel) panel.style.display = 'none';
        this.predictor.destroy();
    });

    // Onboarding
    document.getElementById('ob-next')?.addEventListener('click', () => this.onboarding.next());
    document.getElementById('ob-skip')?.addEventListener('click', () => this.onboarding.finish());
  }

  // SidebarUI implementation
  public syncAccountUi() {
    const accountText = document.getElementById('tg-account-text');
    const usernameEl = document.getElementById('tg-username');
    
    if (this.auth.isConnecting) {
      if (accountText) accountText.textContent = '📞 Syncing...';
      return;
    }

    if (this.auth.demoMode || !this.auth.authToken) {
      if (accountText) accountText.textContent = 'Demo mode is live.';
      if (usernameEl) usernameEl.textContent = 'Guest (Demo)';
      this.blockchain.setWallet(null);
    } else {
      if (accountText) accountText.textContent = `Connected as ${this.auth.userData?.username}`;
      if (usernameEl) usernameEl.textContent = this.auth.userData?.username;
      
      const walletAddr = this.auth.userData?.wallet_address || null;
      this.blockchain.setWallet(walletAddr);
    }
  }

  public showMainContent() {
    const authSection = document.getElementById('tg-auth-section');
    const mainContent = document.getElementById('tg-main-content');
    if (authSection) authSection.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    this.reports.fetchRecentSignals();
    this.onboarding.startIntro();
  }

  public addFeedMessage(msg: string) {
    const feed = document.getElementById('tg-message-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'tg-feed-item';
    item.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    feed.insertBefore(item, feed.firstChild);
  }

  public async getStorage(keys: string[]) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  public async setStorage(data: any) {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  public updateStatus(message: string, type: 'success' | 'warning' | 'thinking' | 'danger') {
    const statusBar = document.getElementById('tg-status-bar');
    if (!statusBar) return;
    statusBar.textContent = message;
    statusBar.className = `tg-status-bar tg-status-${type}`;
    statusBar.style.display = 'block';
    setTimeout(() => {
        if (statusBar.textContent === message) statusBar.style.display = 'none';
    }, 4000);
  }

  public async openPremium() {
    // For now, just open a new tab to the premium page.
    // In a real scenario, this might open an in-app modal or a more sophisticated flow.
    chrome.tabs.create({ url: 'https://tiltcheck.com/premium', active: true });
    console.log('[SidebarController] Redirecting to premium upgrade page...');
  }
}

// Entry point for content script to call
export function initSidebar() {
  const controller = new SidebarController();
  controller.init();
  return controller;
}
