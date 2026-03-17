/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { getDiscordLoginUrl } from '../config.js';
import { API_ORIGIN, DISCORD_AUTH_MESSAGE_TYPE } from './constants.js';
import { SidebarUI } from './types.js';

export class AuthManager {
  private ui: SidebarUI;
  private discordAuthPollIntervalId: ReturnType<typeof setInterval> | null = null;
  private authBridgeAckReceived = false;

  public authToken: string | null = null;
  public userData: any = null;
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

  public async applyDiscordAuthSuccess(token: string, user: Record<string, any>) {
      await this.ui.setStorage({ authToken: token, userData: user });
      this.clearDiscordAuthPolling();
      this.isConnecting = false;
      this.demoMode = false;
      this.authToken = token;
      this.userData = { ...user, isDemo: false };
      this.isAuthenticated = true;
      this.ui.showMainContent();
      this.ui.syncAccountUi();
      this.ui.addFeedMessage(`Connected: ${this.userData.username || 'TiltCheck user'}`);
  }

  public handleDiscordAuthMessage(event: MessageEvent) {
      if (event.origin !== API_ORIGIN) return;
      const data = event.data as { type?: string; token?: unknown; user?: unknown } | null;
      if (!data || data.type !== DISCORD_AUTH_MESSAGE_TYPE) return;
      if (typeof data.token !== 'string' || !data.token) return;
      if (!data.user || typeof data.user !== 'object') return;
      void this.applyDiscordAuthSuccess(data.token, data.user as Record<string, any>);
  }

  public handleAuthBridgeAck(event: MessageEvent) {
      const data = event.data as { type?: string; success?: boolean } | null;
      if (data?.type === 'auth-bridge-ack') {
          this.authBridgeAckReceived = true;
          console.log('[TiltCheck] auth-bridge-ack received');
      }
  }

  public startDiscordLoginFlow() {
      const authUrl = getDiscordLoginUrl('extension');
      const maxPollMs = 5 * 60 * 1000;
      const startedAt = Date.now();
      this.clearDiscordAuthPolling();
      this.authBridgeAckReceived = false;
      this.isConnecting = true;
      this.ui.syncAccountUi();

      const startStoragePolling = () => {
          let pollAttempts = 0;
          let lastReadWasUndefined = false;

          this.discordAuthPollIntervalId = setInterval(async () => {
              try {
                  const stored = await this.ui.getStorage(['authToken', 'userData']);
                  
                  // If we got the auth, we're done
                  if (stored?.authToken && stored?.userData) {
                      await this.applyDiscordAuthSuccess(stored.authToken, stored.userData);
                      return;
                  }

                  // Track if reads are returning undefined (indicates storage write hasn't completed yet)
                  if (!stored?.authToken) {
                      lastReadWasUndefined = true;
                      pollAttempts++;
                      console.log(`[TiltCheck] Storage read returned undefined (attempt ${pollAttempts})`);
                      
                      // After 3 failed reads without ACK, add extra delay before next attempt
                      // This accounts for the race condition where auth-bridge is still writing
                      if (pollAttempts >= 3 && !this.authBridgeAckReceived) {
                          console.log('[TiltCheck] Polling returned undefined 3+ times without ACK. Adding backoff delay.');
                      }
                  }

                  // If ACK was received, we know storage write completed, so increase check frequency
                  if (this.authBridgeAckReceived && lastReadWasUndefined) {
                      console.log('[TiltCheck] ACK received. Storage write should be complete.');
                      lastReadWasUndefined = false;
                  }

                  if (Date.now() - startedAt > maxPollMs) {
                      this.clearDiscordAuthPolling();
                      this.ui.addFeedMessage('Discord connect timed out. Try again.');
                  }
              } catch (error) {
                  this.clearDiscordAuthPolling();
                  console.warn('[TiltCheck] Discord connect polling failed:', error);
                  this.ui.addFeedMessage('Discord connect interrupted. Reload the tab and try again.');
              }
          }, 500); // Poll every 500ms (faster than 1000ms to catch writes sooner)
      };

      try {
          // User-clicked popup preserves window.opener for callback postMessage.
          const popup = window.open(authUrl, '_blank', 'popup=yes,width=520,height=760');
          if (popup) {
              startStoragePolling();
              return;
          }

          chrome.runtime.sendMessage({ type: 'open_auth_bridge', url: authUrl }, (response) => {
              if (chrome.runtime.lastError) {
                  const msg = chrome.runtime.lastError.message || 'Could not open Discord login tab.';
                  this.ui.addFeedMessage(
                      msg.includes('Extension context invalidated')
                          ? 'Extension refreshed mid-login. Reload this tab and retry Connect Discord.'
                          : 'Could not open Discord login helper. Try again.'
                  );
                  return;
              }

              if (response?.success) {
                  this.ui.addFeedMessage(`Opened Discord login helper tab. Status: \${response.status || 'open'}`);
                  startStoragePolling();
              } else {
                  this.ui.addFeedMessage('Discord login tab could not be opened. Double check popup blockers.');
              }
          });
      } catch (err) {
          console.error('[TiltCheck] startDiscordLoginFlow error:', err);
          this.ui.addFeedMessage('Discord login flow failed. Reload and try again.');
          this.isConnecting = false;
          this.ui.syncAccountUi();
      }
  }

  public logout() {
      this.authToken = null;
      this.userData = null;
      this.isAuthenticated = false;
      this.isConnecting = false;
      this.demoMode = true;
      this.ui.setStorage({ authToken: null, userData: null });
      this.ui.syncAccountUi();
      this.ui.addFeedMessage('Logged out successfully.');
  }

  public async restoreAuth() {
    const stored = await this.ui.getStorage(['authToken', 'userData']);
    if (stored?.authToken && stored?.userData) {
      this.authToken = stored.authToken;
      this.userData = stored.userData;
      this.isAuthenticated = true;
      this.demoMode = false;
      this.ui.showMainContent();
      this.ui.syncAccountUi();
      return true;
    }
    this.demoMode = true;
    this.ui.syncAccountUi();
    return false;
  }
}
