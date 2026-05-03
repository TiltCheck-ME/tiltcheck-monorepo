/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-07 */
import { getDiscordLoginUrl } from '../config.js';
import { API_BASE } from './constants.js';
import { SidebarUI } from './types.js';

interface AuthSessionResponse {
  userId: string;
  username?: string | null;
  email?: string | null;
  discordId?: string | null;
  discordUsername?: string | null;
  walletAddress?: string | null;
  wallet_address?: string | null;
}

interface OnboardingPreferencesResponse {
  completedSteps?: string[];
  riskLevel?: 'conservative' | 'moderate' | 'degen';
  preferences?: {
    cooldownEnabled?: boolean;
    voiceInterventionEnabled?: boolean;
    redeemThreshold?: number;
  };
}

interface ExtensionUserData {
  id: string;
  username: string;
  email?: string | null;
  discordId?: string | null;
  discordUsername?: string | null;
  walletAddress?: string | null;
  wallet_address?: string | null;
  isDemo?: boolean;
}

export class AuthManager {
  private ui: SidebarUI;
  private discordAuthPollIntervalId: ReturnType<typeof setInterval> | null = null;

  public authToken: string | null = null;
  public userData: ExtensionUserData | null = null;
  public isAuthenticated = false;
  public isConnecting = false;
  public demoMode = false;

  constructor(ui: SidebarUI) {
    this.ui = ui;
  }

  public clearDiscordAuthPolling() {
      if (this.discordAuthPollIntervalId) {
          clearInterval(this.discordAuthPollIntervalId);
          this.discordAuthPollIntervalId = null;
      }
  }

  private normalizeUserData(
    user: Partial<AuthSessionResponse & ExtensionUserData> | Record<string, unknown>,
  ): ExtensionUserData | null {
    const rawId = typeof user.id === 'string' ? user.id : typeof user.userId === 'string' ? user.userId : null;
    if (!rawId) {
      return null;
    }

    const email = typeof user.email === 'string' ? user.email : null;
    const discordId = typeof user.discordId === 'string' ? user.discordId : null;
    const discordUsername = typeof user.discordUsername === 'string' ? user.discordUsername : null;
    const walletAddress =
      typeof user.walletAddress === 'string'
        ? user.walletAddress
        : typeof (user as { wallet_address?: unknown }).wallet_address === 'string'
          ? (user as { wallet_address: string }).wallet_address
          : null;
    const usernameCandidate = typeof user.username === 'string' ? user.username.trim() : '';
    const username =
      usernameCandidate ||
      discordUsername ||
      email ||
      rawId.slice(0, 10);

    return {
      id: rawId,
      username,
      email,
      discordId,
      discordUsername,
      walletAddress,
    };
  }

  private async persistAuthState(token: string, user: ExtensionUserData): Promise<void> {
    await this.ui.setStorage({
      authToken: token,
      userData: user,
      tiltguard_user_id: user.id,
    });
  }

  private async clearStoredAuthState(): Promise<void> {
    await this.ui.setStorage({
      authToken: null,
      userData: null,
      tiltguard_user_id: null,
    });
  }

  private resetToGuestMode(): void {
    this.clearDiscordAuthPolling();
    this.authToken = null;
    this.userData = null;
    this.isAuthenticated = false;
    this.isConnecting = false;
    this.demoMode = true;
  }

  private stopConnecting(message: string): void {
    this.clearDiscordAuthPolling();
    this.isConnecting = false;
    this.ui.syncAccountUi();
    this.ui.addFeedMessage(message);
  }

  private async fetchCurrentSession(token: string): Promise<ExtensionUserData | null> {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as AuthSessionResponse;
      return this.normalizeUserData(data);
    } catch (error) {
      console.warn('[TiltCheck] Failed to verify stored auth session:', error);
      return null;
    }
  }

  public async applyDiscordAuthSuccess(token: string, user: Record<string, unknown>) {
      const normalizedUser = this.normalizeUserData(user);
      if (!normalizedUser) {
          throw new Error('Discord auth payload missing user id');
      }
      // Clear polling immediately before any await to prevent double-invocation:
      // the 500ms interval can fire again during persistAuthState / syncSafetyPreferences
      // and find the same token in storage, triggering a second call.
      this.clearDiscordAuthPolling();
      this.isConnecting = false;

      await this.persistAuthState(token, normalizedUser);
      await this.syncSafetyPreferences(token);
      this.demoMode = false;
      this.authToken = token;
      this.userData = { ...normalizedUser, isDemo: false };
      this.isAuthenticated = true;
      this.ui.showMainContent();
      this.ui.syncAccountUi();
      this.ui.addFeedMessage(`Connected: ${this.userData.username || 'TiltCheck user'}`);
  }

  public handleDiscordAuthMessage(_event: MessageEvent) {
      // Not wired to window.addEventListener in the active sidebar (sidebar/index.ts).
      // The OAuth flow completes via chrome.storage.local polling in startDiscordLoginFlow.
      // Kept as a no-op stub to avoid breaking any future wiring.
  }

  public startDiscordLoginFlow() {
      const authUrl = getDiscordLoginUrl('extension');
      const maxPollMs = 5 * 60 * 1000;
      const startedAt = Date.now();
      this.clearDiscordAuthPolling();
      this.isConnecting = true;
      this.ui.syncAccountUi();

      const startStoragePolling = () => {
          this.discordAuthPollIntervalId = setInterval(async () => {
              try {
                  const stored = await this.ui.getStorage(['authToken', 'userData']);

                  if (stored?.authToken && stored?.userData) {
                      await this.applyDiscordAuthSuccess(stored.authToken, stored.userData);
                      return;
                  }

                   if (Date.now() - startedAt > maxPollMs) {
                       this.stopConnecting('Discord connect timed out. Try again.');
                   }
               } catch (error) {
                   console.warn('[TiltCheck] Discord connect polling failed:', error);
                   this.stopConnecting('Discord connect interrupted. Reload the tab and try again.');
               }
           }, 500);
       };

       try {
           chrome.runtime.sendMessage({ type: 'open_auth_bridge', url: authUrl }, (response) => {
               if (chrome.runtime.lastError) {
                   const msg = chrome.runtime.lastError.message || 'Could not open Discord login tab.';
                   this.stopConnecting(
                       msg.includes('Extension context invalidated')
                           ? 'Extension refreshed mid-login. Reload this tab and retry Connect Discord.'
                           : 'Could not open Discord login helper. Try again.'
                   );
                   return;
              }

               if (response?.success) {
                   this.ui.addFeedMessage(`Opened Discord login helper tab.`);
                   startStoragePolling();
               } else {
                   this.stopConnecting('Discord login tab could not be opened. Double check popup blockers.');
               }
           });
       } catch (err) {
           console.error('[TiltCheck] startDiscordLoginFlow error:', err);
           this.stopConnecting('Discord login flow failed. Reload and try again.');
       }
   }

  public async logout() {
      let serverLogoutFailed = false;

      try {
          const response = await fetch(`${API_BASE}/auth/logout`, {
              method: 'POST',
              credentials: 'include',
              headers: this.authToken
                  ? { Authorization: `Bearer ${this.authToken}` }
                  : {},
          });

          if (!response.ok) {
              serverLogoutFailed = true;
              console.warn('[TiltCheck] Shared session logout failed:', response.status);
          }
      } catch (error) {
          serverLogoutFailed = true;
          console.warn('[TiltCheck] Shared session logout request failed:', error);
      }

      await this.clearStoredAuthState();
      this.resetToGuestMode();
      this.ui.syncAccountUi();
      this.ui.addFeedMessage(
        serverLogoutFailed
          ? 'Logged out locally. Shared session may still be active.'
          : 'Logged out successfully.',
      );
  }

  public continueAsGuest() {
    this.demoMode = true;
    this.isAuthenticated = false; // explicitly not authenticated with Discord
    this.ui.showMainContent();
    this.ui.syncAccountUi();
    this.ui.addFeedMessage('Continuing in Guest mode. Discord features (Buddy Mirror, Global Leaderboard) disabled.');
  }

  public async restoreAuth() {
    const stored = await this.ui.getStorage(['authToken', 'userData']);
    if (typeof stored?.authToken === 'string' && stored.authToken) {
      const sessionUser = await this.fetchCurrentSession(stored.authToken);
      if (!sessionUser) {
        await this.clearStoredAuthState();
        this.resetToGuestMode();
        this.ui.syncAccountUi();
        this.ui.addFeedMessage('Saved sign-in could not be verified. Connect Discord again.');
        return false;
      }

      await this.persistAuthState(stored.authToken, sessionUser);
      await this.syncSafetyPreferences(stored.authToken);
      this.clearDiscordAuthPolling();
      this.authToken = stored.authToken;
      this.userData = { ...sessionUser, isDemo: false };
      this.isAuthenticated = true;
      this.demoMode = false;
      this.ui.showMainContent();
      this.ui.syncAccountUi();
      return true;
    }
    this.resetToGuestMode();
    this.ui.syncAccountUi();
    return false;
  }

  private async syncSafetyPreferences(token: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/me/onboarding-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json() as OnboardingPreferencesResponse;
      const nextStorage: Record<string, boolean | number | string> = {};

      if (data.riskLevel) {
        nextStorage.riskLevel = data.riskLevel;
      }

      if (typeof data.preferences?.cooldownEnabled === 'boolean') {
        nextStorage.cooldownEnabled = data.preferences.cooldownEnabled;
      }

      if (typeof data.preferences?.voiceInterventionEnabled === 'boolean') {
        nextStorage.voiceInterventionEnabled = data.preferences.voiceInterventionEnabled;
      }

      if (typeof data.preferences?.redeemThreshold === 'number' && Number.isFinite(data.preferences.redeemThreshold)) {
        nextStorage.redeemThreshold = data.preferences.redeemThreshold;
      }

      if (Object.keys(nextStorage).length > 0) {
        await this.ui.setStorage(nextStorage);
      }
    } catch (error) {
      console.warn('[TiltCheck] Failed to sync onboarding preferences:', error);
    }
  }
}
