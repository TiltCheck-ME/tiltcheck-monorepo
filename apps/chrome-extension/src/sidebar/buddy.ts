// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
import { SidebarUI } from './types.js';
import { apiCall } from './api.js';

type InterventionPayload = string | Record<string, unknown>;

export class BuddyManager {
  private ui: SidebarUI;
  private auth: { demoMode: boolean; authToken: string | null };
  private mirrorEnabled: boolean = false;

  constructor(ui: SidebarUI, auth: { demoMode: boolean; authToken: string | null }) {
    this.ui = ui;
    this.auth = auth;
  }

  public setMirrorEnabled(enabled: boolean) {
      this.mirrorEnabled = enabled;
      this.ui.setStorage({ buddyMirrorEnabled: enabled });
      if (enabled) {
          this.ui.addFeedMessage('Buddy Mirror active: Partners can see your risk state.');
      }
  }

  public async notifyMonitor(indicator: string) {
      return this.notifyBuddy('alert', `Risk detected: ${indicator}`);
  }

  public async notifyIntervention(type: string, payload: InterventionPayload) {
      // We always allow interventions to be sent even if mirror is off, 
      // as they are critical safety events.
      try {
          const userId = await this.getUserId();
          const data = this.normalizePayload(payload);
          const result = await apiCall('/safety/notify-buddy', {
              method: 'POST',
              body: JSON.stringify({
                  userId,
                  type,
                  data
              })
          }, this.auth);

          if (result.success) {
              this.ui.updateStatus('Buddy notified via Discord', 'info');
              console.log('[BuddyManager] Intervention signal sent to Discord.');
          }
      } catch (err) {
          console.warn('[BuddyManager] Failed to send intervention signal', err);
      }
  }

  public async notifyBuddy(type: string, details: string) {
      if (!this.mirrorEnabled && !this.auth.demoMode) return;

      try {
          const userId = await this.getUserId();
          const result = await apiCall('/safety/notify-buddy', {
              method: 'POST',
              body: JSON.stringify({
                  userId,
                  type: `buddy_mirror_${type}`,
                  data: {
                      message: details,
                      casino: window.location.hostname,
                      timestamp: new Date().toISOString()
                  }
              })
          }, this.auth);

          if (result.success) {
              console.log('[BuddyManager] Notification sent to accountability partners.');
          }
      } catch (err) {
          console.warn('[BuddyManager] Failed to notify buddy', err);
      }
  }

  public async restorePrefs() {
      const prefs = await this.ui.getStorage(['buddyMirrorEnabled']);
      this.mirrorEnabled = !!prefs.buddyMirrorEnabled;
      const checkbox = document.getElementById('cfg-buddy-mirror') as HTMLInputElement | null;
      if (checkbox) checkbox.checked = this.mirrorEnabled;
  }

  private async getUserId(): Promise<string | undefined> {
      const stored = await this.ui.getStorage(['userData', 'tiltguard_user_id']);
      if (typeof stored.userData?.id === 'string' && stored.userData.id.trim() !== '') {
          return stored.userData.id;
      }
      if (typeof stored.tiltguard_user_id === 'string' && stored.tiltguard_user_id.trim() !== '') {
          return stored.tiltguard_user_id;
      }
      return undefined;
  }

  private normalizePayload(payload: InterventionPayload): Record<string, unknown> {
      const basePayload = typeof payload === 'string'
          ? { message: payload }
          : { ...payload };

      return {
          casino: window.location.hostname,
          timestamp: new Date().toISOString(),
          ...basePayload,
          message: typeof basePayload.message === 'string' && basePayload.message.trim() !== ''
              ? basePayload.message
              : 'Intervention triggered'
      };
  }
}
