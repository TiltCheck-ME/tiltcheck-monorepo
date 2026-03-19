/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SidebarUI } from './types.js';
import { apiCall } from './api.js';

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

  public async notifyIntervention(type: string, message: string) {
      // We always allow interventions to be sent even if mirror is off, 
      // as they are critical safety events.
      try {
          const result = await apiCall('/safety/notify-buddy', {
              method: 'POST',
              body: JSON.stringify({
                  type,
                  data: {
                      message,
                      casino: window.location.hostname,
                      timestamp: new Date().toISOString()
                  }
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
          const result = await apiCall('/safety/notify-buddy', {
              method: 'POST',
              body: JSON.stringify({
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
}
