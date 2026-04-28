/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import { SIDEBAR_TEMPLATE } from './template.js';
import { getSidebarStyles } from './styles.js';
import { AuthManager } from './auth.js';
import { SessionManager } from './session.js';
import { VaultManager } from './vault.js';
import { ReportManager } from './reports.js';
import { BuddyManager } from './buddy.js';
import { OnboardingManager } from './onboarding.js';
import { BonusManager } from './bonuses.js';
import { MINIMIZED_WIDTH, SIDEBAR_PREFS_KEY, SIDEBAR_VISIBILITY_KEY, SIDEBAR_WIDTH } from './constants.js';
import { SidebarUI } from './types.js';
import { buildLicensePresentation } from '../license-verifier.js';
import { EXT_CONFIG } from '../config.js';
import type { CasinoVerification } from '../license-verifier.js';

const SITE_REDEEM_THRESHOLDS_KEY = 'tiltcheck_site_thresholds';
const SIDEBAR_RESERVED_CLASS = 'tiltcheck-sidebar-reserved';

export class SidebarController implements SidebarUI {
  public auth: AuthManager;
  public session: SessionManager;
  public vault: VaultManager;
  public reports: ReportManager;
  public buddy: BuddyManager;
  public onboarding: OnboardingManager;
  public bonuses: BonusManager;
  private layoutObserver: MutationObserver | null = null;
  private showAdvancedTools = false;

  constructor() {
    this.auth = new AuthManager(this);
    this.session = new SessionManager(this);
    this.vault = new VaultManager(this);
    this.reports = new ReportManager(this, this.auth);
    this.buddy = new BuddyManager(this, this.auth);
    this.onboarding = new OnboardingManager(this);
    this.bonuses = new BonusManager(this);
  }

  public init() {
    this.injectStyles();
    this.createDom();
    this.observeSidebarLayout();
    this.setupListeners();
    void this.restoreSidebarPreferences();
    void this.loadRedeemThresholdSettings();
    this.auth.restoreAuth();
    this.buddy.restorePrefs();
    this.vault.init();
    this.bonuses.init();
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
    this.syncHostPageLayout();
  }

  private setupListeners() {
    document.getElementById('tg-minimize')?.addEventListener('click', () => {
      const sidebar = this.getSidebarElement();
      const minimized = !!sidebar?.classList.contains('minimized');
      this.setSidebarMinimized(!minimized);
    });
    document.getElementById('tg-hide')?.addEventListener('click', () => {
      this.setSidebarVisibility(false);
    });
    document.getElementById('tg-settings')?.addEventListener('click', () => {
      this.togglePanelVisibility('tg-settings-panel');
    });
    document.getElementById('close-settings')?.addEventListener('click', () => {
      this.setPanelVisibility('tg-settings-panel', false);
    });
    document.getElementById('tg-discord-login')?.addEventListener('click', () => this.auth.startDiscordLoginFlow());
    document.getElementById('tg-connect-discord-inline')?.addEventListener('click', () => this.auth.startDiscordLoginFlow());
    document.getElementById('tg-guest-login')?.addEventListener('click', () => this.auth.continueAsGuest());
    document.getElementById('tg-logout')?.addEventListener('click', () => this.auth.logout());
    document.getElementById('tg-open-dashboard')?.addEventListener('click', () => this.openDashboard());
    document.getElementById('tg-open-buddies')?.addEventListener('click', () => this.openDashboard('buddies'));
    document.getElementById('tg-open-vault')?.addEventListener('click', () => this.openDashboard('vault'));
    document.getElementById('tg-open-report')?.addEventListener('click', () => {
      this.setPanelVisibility('tg-report-panel', true);
    });
    document.getElementById('close-report')?.addEventListener('click', () => {
      this.setPanelVisibility('tg-report-panel', false);
    });
    
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

    document.getElementById('tg-save-redeem-threshold')?.addEventListener('click', () => {
        void this.saveRedeemThresholdForSite();
    });

    document.getElementById('tg-redeem-threshold')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void this.saveRedeemThresholdForSite();
        }
    });

    document.getElementById('tg-toggle-advanced')?.addEventListener('click', () => {
      this.setAdvancedToolsVisibility(!this.showAdvancedTools);
    });

    // BONUS SCANNER — toggle the daily bonuses section
    document.getElementById('tg-open-predictor')?.addEventListener('click', () => {
        const body = document.getElementById('tg-bonuses-body');
        if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    // Onboarding
    document.getElementById('ob-next')?.addEventListener('click', () => this.onboarding.next());
    document.getElementById('ob-skip')?.addEventListener('click', () => this.onboarding.finish());

    // Emergency Brake
    document.getElementById('tg-emergency-lock')?.addEventListener('click', () => {
        this.vault.lockTheBag(1.0); // Default to 1 SOL for now or show a prompt
    });

    // Vibe Check Actions
    document.getElementById('vibe-lock-bag')?.addEventListener('click', () => {
        this.vault.lockTheBag(1.0);
        this.dismissSessionPause();
    });
    document.getElementById('vibe-discord')?.addEventListener('click', () => {
        window.open('https://discord.gg/gdBsEJfCar', '_blank');
        this.dismissSessionPause();
    });
    document.getElementById('vibe-ignore')?.addEventListener('click', () => {
        this.addFeedMessage('TiltCheck warning suppressed. Good luck.');
        this.dismissSessionPause();
    });

    // AutoVault Controls
    const avToggle = document.getElementById('tg-autovault-toggle') as HTMLInputElement | null;
    avToggle?.addEventListener('change', () => {
        this.vault.toggleAutoVault(avToggle.checked);
    });

    const avPct = document.getElementById('tg-autovault-pct') as HTMLInputElement | null;
    const avPctVal = document.getElementById('tg-autovault-pct-val');
    avPct?.addEventListener('input', () => {
        const val = parseInt(avPct.value);
        if (avPctVal) avPctVal.textContent = `${val}%`;
        this.vault.setAutoVaultPct(val);
    });
  }

  private setPanelVisibility(panelId: string, visible: boolean): void {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.style.display = visible ? 'block' : 'none';
    }
  }

  private togglePanelVisibility(panelId: string): void {
    const panel = document.getElementById(panelId);
    if (!panel) {
      return;
    }

    this.setPanelVisibility(panelId, panel.style.display === 'none');
  }

  private getSidebarElement(): HTMLElement | null {
    return document.getElementById('tiltcheck-sidebar');
  }

  private getReservedWidth(): number {
    const sidebar = this.getSidebarElement();
    if (!sidebar || sidebar.style.display === 'none') {
      return 0;
    }
    return sidebar.classList.contains('minimized') ? MINIMIZED_WIDTH : SIDEBAR_WIDTH;
  }

  private applyHostPageLayout(offset: number): void {
    const value = `${Math.max(offset, 0)}px`;
    for (const element of [document.documentElement, document.body]) {
      element.classList.toggle(SIDEBAR_RESERVED_CLASS, offset > 0);
      element.style.setProperty('--tiltcheck-sidebar-offset', value);
    }
  }

  private syncHostPageLayout(): void {
    this.applyHostPageLayout(this.getReservedWidth());
  }

  private observeSidebarLayout(): void {
    this.layoutObserver?.disconnect();
    const sidebar = this.getSidebarElement();
    if (!sidebar) {
      return;
    }

    this.layoutObserver = new MutationObserver(() => this.syncHostPageLayout());
    this.layoutObserver.observe(sidebar, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  }

  private async updateSidebarPrefs(partial: Record<string, unknown>): Promise<void> {
    const stored = await this.getStorage([SIDEBAR_PREFS_KEY]) as Record<string, unknown>;
    const existing = stored[SIDEBAR_PREFS_KEY];
    const prefs = existing && typeof existing === 'object' && !Array.isArray(existing)
      ? existing as Record<string, unknown>
      : {};
    await this.setStorage({ [SIDEBAR_PREFS_KEY]: { ...prefs, ...partial } });
  }

  private setSidebarMinimized(minimized: boolean, persist = true): void {
    const sidebar = this.getSidebarElement();
    if (!sidebar) {
      return;
    }

    sidebar.classList.toggle('minimized', minimized);
    const button = document.getElementById('tg-minimize');
    if (button) {
      button.textContent = minimized ? '+' : '−';
      button.setAttribute('title', minimized ? 'Expand' : 'Minimize');
      button.setAttribute('aria-label', minimized ? 'Expand sidebar' : 'Minimize sidebar');
    }

    this.syncHostPageLayout();

    if (persist) {
      void this.updateSidebarPrefs({ minimized });
    }
  }

  private setSidebarVisibility(visible: boolean, persist = true): void {
    const sidebar = this.getSidebarElement();
    if (!sidebar) {
      return;
    }

    sidebar.style.display = visible ? 'block' : 'none';
    this.syncHostPageLayout();

    if (persist) {
      void this.setStorage({ [SIDEBAR_VISIBILITY_KEY]: visible });
    }
  }

  private setAdvancedToolsVisibility(show: boolean, persist = true): void {
    this.showAdvancedTools = show;
    const sidebar = this.getSidebarElement();
    const toggleBtn = document.getElementById('tg-toggle-advanced') as HTMLButtonElement | null;
    if (!sidebar) {
      return;
    }

    sidebar.classList.toggle('tg-show-advanced', show);
    if (toggleBtn) {
      toggleBtn.textContent = show ? 'Hide Pro Tools' : 'Show Pro Tools';
      toggleBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
    }

    if (!show) {
      const advancedPanels = ['tg-settings-panel', 'tg-report-panel'];
      advancedPanels.forEach((panelId) => {
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.style.display = 'none';
        }
      });
    }

    if (persist) {
      void this.updateSidebarPrefs({ showAdvanced: show });
    }
  }

  private async restoreSidebarPreferences(): Promise<void> {
    const stored = await this.getStorage([SIDEBAR_PREFS_KEY]) as Record<string, unknown>;
    const prefs = stored[SIDEBAR_PREFS_KEY];
    if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
      const sidebarPrefs = prefs as Record<string, unknown>;
      if (typeof sidebarPrefs.minimized === 'boolean') {
        this.setSidebarMinimized(sidebarPrefs.minimized, false);
      } else {
        this.setSidebarMinimized(false, false);
      }

      if (typeof sidebarPrefs.showAdvanced === 'boolean') {
        this.setAdvancedToolsVisibility(sidebarPrefs.showAdvanced, false);
      } else {
        this.setAdvancedToolsVisibility(false, false);
      }
    } else {
      this.setSidebarMinimized(false, false);
      this.setAdvancedToolsVisibility(false, false);
    }

    this.syncHostPageLayout();
  }

  private getCurrentSiteHost(): string {
    return (window.location.hostname || 'unknown').replace(/^www\./, '').toLowerCase();
  }

  private getStoredRedeemThresholds(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const thresholds: Record<string, number> = {};

    for (const [host, rawValue] of Object.entries(value as Record<string, unknown>)) {
      const threshold = Number(rawValue);
      if (Number.isFinite(threshold) && threshold > 0) {
        thresholds[host] = threshold;
      }
    }

    return thresholds;
  }

  private parseRedeemThresholdInput(): number | null {
    const input = document.getElementById('tg-redeem-threshold') as HTMLInputElement | null;
    if (!input) return null;

    const parsed = Number(input.value || '0');
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return Math.round(parsed * 100) / 100;
  }

  private setRedeemThresholdInputValue(threshold: number): void {
    const input = document.getElementById('tg-redeem-threshold') as HTMLInputElement | null;
    if (!input) return;
    input.value = threshold > 0 ? threshold.toFixed(2).replace(/\.00$/, '') : '';
  }

  private updateRedeemSiteLabel(): void {
    const label = document.getElementById('tg-redeem-site-label');
    if (label) {
      label.textContent = this.getCurrentSiteHost();
    }
  }

  private async loadRedeemThresholdSettings(): Promise<void> {
    this.updateRedeemSiteLabel();

    const siteHost = this.getCurrentSiteHost();
    const stored = await this.getStorage([SITE_REDEEM_THRESHOLDS_KEY, 'redeemThreshold']) as Record<string, unknown>;
    const thresholds = this.getStoredRedeemThresholds(stored[SITE_REDEEM_THRESHOLDS_KEY]);
    const fallbackThreshold = Number(stored.redeemThreshold) || 0;
    const activeThreshold = thresholds[siteHost] ?? fallbackThreshold;

    this.setRedeemThresholdInputValue(activeThreshold);
  }

  private async saveRedeemThresholdForSite(): Promise<void> {
    const threshold = this.parseRedeemThresholdInput();
    if (threshold === null) {
      this.updateStatus('Use a valid redeem line or 0 to disable it.', 'warning');
      return;
    }

    const siteHost = this.getCurrentSiteHost();
    const stored = await this.getStorage([SITE_REDEEM_THRESHOLDS_KEY]) as Record<string, unknown>;
    const thresholds = this.getStoredRedeemThresholds(stored[SITE_REDEEM_THRESHOLDS_KEY]);

    if (threshold === 0) {
      delete thresholds[siteHost];
    } else {
      thresholds[siteHost] = threshold;
    }

    await this.setStorage({
      [SITE_REDEEM_THRESHOLDS_KEY]: thresholds,
      redeemThreshold: threshold,
    });

    this.setRedeemThresholdInputValue(threshold);
    window.dispatchEvent(new CustomEvent('tg-redeem-threshold-updated', {
      detail: { hostname: siteHost, threshold },
    }));

    if (threshold === 0) {
      this.updateStatus(`Redeem nudge disabled for ${siteHost}.`, 'info');
      this.addFeedMessage(`Redeem nudge disabled for ${siteHost}.`);
      return;
    }

    this.updateStatus(`Redeem line armed at $${threshold.toFixed(2)} for ${siteHost}.`, 'success');
    this.addFeedMessage(`Redeem line armed for ${siteHost} at $${threshold.toFixed(2)}.`);
  }

  // SidebarUI implementation
  public syncAccountUi() {
    const accountText = document.getElementById('tg-account-text');
    const usernameEl = document.getElementById('tg-username');
    const connectBtn = document.getElementById('tg-connect-discord-inline') as HTMLButtonElement | null;
    
    if (this.auth.isConnecting) {
      if (accountText) accountText.textContent = 'Syncing...';
      if (connectBtn) {
        connectBtn.hidden = false;
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
      }
      return;
    }

    if (this.auth.demoMode || !this.auth.authToken) {
      if (accountText) accountText.textContent = 'Standard Mode.';
      if (usernameEl) usernameEl.textContent = 'Guest';
      if (connectBtn) {
        connectBtn.hidden = false;
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Discord';
      }
    } else {
      if (accountText) accountText.textContent = `Connected as ${this.auth.userData?.username}`;
      if (usernameEl) usernameEl.textContent = this.auth.userData?.username;
      if (connectBtn) {
        connectBtn.hidden = true;
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Discord';
      }
    }
  }

  private openDashboard(tab: 'profile' | 'vault' | 'buddies' | 'safety' = 'profile'): void {
    const dashboardUrl = new URL(EXT_CONFIG.DASHBOARD_URL);
    if (tab !== 'profile') {
      dashboardUrl.searchParams.set('tab', tab);
    }
    chrome.tabs.create({ url: dashboardUrl.toString(), active: true });
    this.addFeedMessage(tab === 'profile' ? 'Opening dashboard.' : `Opening dashboard ${tab} controls.`);
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

  public updateStatus(message: string, type: 'success' | 'warning' | 'thinking' | 'danger' | 'info') {
    const statusBar = document.getElementById('tg-status-bar');
    if (!statusBar) return;
    statusBar.textContent = message;
    statusBar.className = `tg-status-bar ${type}`;
    statusBar.style.display = 'block';
    setTimeout(() => {
        if (statusBar.textContent === message) statusBar.style.display = 'none';
    }, 4000);
  }

  public updateRealityCheck(active: boolean): void {
    const indicator = document.getElementById('tg-status-indicator');
    if (indicator) {
      indicator.className = `tg-status-indicator ${active ? 'active' : ''}`;
    }
  }

  public updateLicense(data: CasinoVerification | null) {
    const strip = document.getElementById('tg-license-strip');
    if (!strip) return;

    const presentation = buildLicensePresentation(data);
    strip.textContent = presentation.summary;
    strip.className = `tg-license-strip ${presentation.tone}`;
  }

  public updateTilt(score: number, indicators: string[]) {
    const scoreVal = document.getElementById('tg-score-value');
    if (scoreVal) {
      scoreVal.textContent = score.toString();
      // Add a visual heat class based on score
      if (score > 80) scoreVal.style.color = '#ff4444';
      else if (score > 50) scoreVal.style.color = '#ff8800';
      else scoreVal.style.color = '#17c3b2';
    }
    
    // Add first indicator to feed if new/critical
    if (indicators.length > 0 && score > 60) {
        this.addFeedMessage(`Risk Alert: ${indicators[0]}`);
        this.buddy.notifyMonitor(indicators[0]);
    }

    if (score >= 80) {
        this.triggerSessionPause();
    }
  }

  public triggerSessionPause() {
    const overlay = document.getElementById('tg-vibe-check-overlay');
    if (overlay && overlay.style.display !== 'flex') {
        overlay.style.display = 'flex';
        this.addFeedMessage('SESSION PAUSE TRIGGERED: TILTCHECK INTERVENTION RECOMMENDED.');
    }
  }

  public dismissSessionPause() {
    const overlay = document.getElementById('tg-vibe-check-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  public updateStats(stats: any) {
    if (stats.totalBets !== undefined) {
      const el = document.getElementById('tg-bets');
      if (el) el.textContent = stats.totalBets.toString();
    }
    if (stats.totalWagered !== undefined) {
      const el = document.getElementById('tg-wagered');
      if (el) el.textContent = `$${stats.totalWagered.toFixed(2)}`;
    }
    if (stats.totalWon !== undefined) {
        const el = document.getElementById('tg-profit');
        if (el) {
            const pnl = stats.totalWon - (stats.totalWagered || 0);
            el.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
            el.style.color = pnl >= 0 ? '#17c3b2' : '#ff4444';
        }
    }
  }

  public notifyBuddy(event: string, data: any) {
    if (this.buddy) {
      const interventionType = data?.type || event;
      const interventionPayload = data?.data ?? data ?? 'Intervention triggered';
      this.buddy.notifyIntervention(interventionType, interventionPayload);
    }
  }

  public async openPremium() {
    const premiumUrl = new URL(EXT_CONFIG.DASHBOARD_URL);
    premiumUrl.pathname = '/premium';
    premiumUrl.search = '';
    chrome.tabs.create({ url: premiumUrl.toString(), active: true });
    console.log('[SidebarController] Redirecting to premium upgrade page...');
  }
}

// Entry point for content script to call
export function initSidebar() {
  const controller = new SidebarController();
  controller.init();
  return controller;
}
