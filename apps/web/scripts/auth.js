/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Shared Authentication Script for TiltCheck
 * Checks auth status and updates navigation across all pages
 */

import { createUserAvatar, showTermsModal } from './auth.ui.js';
class TiltCheckAuth {
  constructor() {
    this.user = null;
    this.init();
  }

  getAuthProbeEndpoints() {
    return [
      '/api/auth/me',
      '/auth/me',
      '/play/api/user',
      '/api/user',
    ];
  }

  normalizeAuthUser(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const raw = payload.user && typeof payload.user === 'object' ? payload.user : payload;
    const id = raw.id || raw.userId || raw.discordId || raw.discord_id;
    if (!id) return null;

    return {
      id,
      username: raw.username || raw.discordUsername || raw.discord_username || null,
      avatar: raw.avatar || raw.discordAvatar || raw.discord_avatar || null,
      roles: Array.isArray(raw.roles) ? raw.roles : [],
    };
  }

  async init() {
    await this.checkAuthStatus();

    // If user is already logged in and on the login page, redirect them.
    if (this.user && window.location.pathname.endsWith('/login.html')) {
      window.location.href = '/play/profile.html'; // Or a dashboard page
      return; // Stop further execution on this page
    }
    if (this.user && !this.hasAcceptedTerms()) {
      showTermsModal({
        onAccept: () => this.acceptTerms(),
        onDecline: () => this.logout(),
      });
    }
    await this.waitForNavReady();
    this.bindLoginButtons();
    this.updateNavigation();

    // React to shared component injection if it fires later
    document.addEventListener('tc:componentsLoaded', () => {
      this.bindLoginButtons();
      this.updateNavigation();
    });
  }

  async checkAuthStatus() {
    this.user = null; // Assume logged out until proven otherwise

    // Probe known auth endpoints in priority order.
    // This avoids false "logged out" states when one surface is unavailable.
    const probePromises = this.getAuthProbeEndpoints().map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, { credentials: 'include' });
        if (response.ok) {
          const payload = await response.json();
          const user = this.normalizeAuthUser(payload);
          if (user) return user;
        }
      } catch (_error) {
        // Ignore fetch errors and continue.
      }
      return null;
    });

    // Find the first successful probe result.
    const results = await Promise.all(probePromises);
    this.user = results.find(user => user !== null) || null;
  }

  updateNavigation() {
    const loginButtons = document.querySelectorAll('.discord-login-btn, a[href="/play/"]');
    
    if (loginButtons.length === 0) return;

    if (this.user) {
      // Replace login button with user avatar dropdown
      const avatar = createUserAvatar(this.user, () => this.logout());
      loginButtons[0].replaceWith(avatar);
      // Remove any other login buttons
      for (let i = 1; i < loginButtons.length; i++) {
        loginButtons[i].remove();
      }
    } 
  }

  bindLoginButtons() {
    document.querySelectorAll('.discord-login-btn').forEach((el) => {
      if (el.dataset.authBound === 'true') return;
      el.dataset.authBound = 'true';

      const href = el.getAttribute('href');
      if (href && href !== '#') return;

      el.setAttribute('role', 'button');
      el.addEventListener('click', (event) => {
        event.preventDefault();
        this.loginWithDiscord();
      });
    });
  }

  loginWithDiscord(nextPath = '/play/profile.html') {
    const base = '/api/auth/discord/login';
    const redirect = encodeURIComponent(`${window.location.origin}${nextPath}`);
    window.location.href = `${base}?redirect=${redirect}`;
  }

  // Wait for shared nav injection to complete or for login button to exist
  waitForNavReady() {
    const hasNavPlaceholder = !!document.getElementById('shared-nav');
    const loginSelector = '.discord-login-btn, a[href="/play/"]';
    const maxWaitMs = 2000; // 2s safety
    const intervalMs = 50;

    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const loginBtn = document.querySelector(loginSelector);
        const injected = !hasNavPlaceholder || (hasNavPlaceholder && loginBtn);
        if (injected || Date.now() - start > maxWaitMs) {
          resolve();
        } else {
          setTimeout(check, intervalMs);
        }
      };
      // If DOM already has the element, resolve immediately
      if (document.querySelector(loginSelector)) {
        resolve();
      } else {
        check();
      }
    });
  }

  async logout() {
    try {
      await fetch('/play/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/';
    }
  }

  getUser() {
    return this.user;
  }

  hasAcceptedTerms() {
    if (!this.user) return false;
    const accepted = localStorage.getItem(`terms_accepted_${this.user.id}`);
    return accepted === 'true';
  }

  acceptTerms() {
    if (this.user) {
      localStorage.setItem(`terms_accepted_${this.user.id}`, 'true');
      localStorage.setItem(`terms_accepted_date_${this.user.id}`, new Date().toISOString());
    });
  }
}

// Initialize auth on page load
if (typeof window !== 'undefined') {
  window.TiltCheckAuth = TiltCheckAuth;
  if (!window.__TC_AUTH_DISABLE_AUTO_INIT) {
    window.tiltCheckAuth = new TiltCheckAuth();
  }
}
