/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SidebarUI } from './types.js';
import { apiCall } from './api.js';

export class ReportManager {
  private ui: SidebarUI;
  private auth: { demoMode: boolean; authToken: string | null };

  constructor(ui: SidebarUI, auth: { demoMode: boolean; authToken: string | null }) {
    this.ui = ui;
    this.auth = auth;
  }

  public async submitReport(type: string, details: string, casino: string) {
    if (!details) {
      alert('Add a quick note first.');
      return;
    }

    this.ui.addFeedMessage('Sending signal...');

    try {
      const result = await apiCall('/safety/report', {
        method: 'POST',
        body: JSON.stringify({ type, details, casino })
      }, this.auth);

      if (result.success) {
        this.ui.addFeedMessage(`Signal sent: ${type}`);
        const detailsEl = document.getElementById('report-details') as HTMLTextAreaElement | null;
        if (detailsEl) detailsEl.value = '';
        const panel = document.getElementById('tg-report-panel');
        if (panel) panel.style.display = 'none';
      } else {
        this.ui.addFeedMessage(`Signal failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('[ReportManager] submit error:', err);
      this.ui.addFeedMessage('Network issue. Try again later.');
    }
  }

  public async fetchRecentSignals() {
      try {
          const result = await apiCall('/safety/signals/recent', {}, this.auth);
          if (result.success && Array.isArray(result.signals)) {
              result.signals.forEach((s: { type: string; casino: string }) => {
                  this.ui.addFeedMessage(`Signal: ${s.type} @ ${s.casino}`);
              });
          }
      } catch (err) {
          console.warn('[ReportManager] Could not fetch recent signals', err);
      }
  }
}
