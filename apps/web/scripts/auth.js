/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Shared Authentication Script for TiltCheck
 * Checks auth status and updates navigation across all pages
 */

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
      this.showTermsModal();
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
      const avatar = this.createUserAvatar();
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

  createUserAvatar() {
    const container = document.createElement('div');
    container.className = 'user-avatar-container';
    container.style.cssText = 'position: relative; display: inline-block;';

    // Avatar image
    const avatarBtn = document.createElement('button');
    avatarBtn.className = 'user-avatar-btn';
    avatarBtn.style.cssText = 'background: none; border: 2px solid #00d4aa; border-radius: 50%; padding: 2px; cursor: pointer; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;';
    avatarBtn.setAttribute('aria-label', 'User menu');
    avatarBtn.setAttribute('aria-expanded', 'false');

    const img = document.createElement('img');
    img.style.cssText = 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover;';
    img.alt = this.user.username || 'User';
    
    // Set avatar URL
    if (this.user.avatar) {
      if (this.user.avatar.startsWith('http')) {
        img.src = this.user.avatar;
      } else {
        img.src = `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?size=128`;
      }
    } else {
      const defaultIndex = parseInt(this.user.id) % 5;
      img.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }

    avatarBtn.appendChild(img);

    // Dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'user-dropdown-menu';
    dropdown.style.cssText = 'display: none; position: absolute; right: 0; top: 50px; background: #1a1f24; border: 1px solid #00d4aa; border-radius: 8px; min-width: 200px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); z-index: 1000;';
    dropdown.setAttribute('aria-hidden', 'true');
    dropdown.setAttribute('role', 'menu');

    // User info header
    const userInfo = document.createElement('div');
    userInfo.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #2a2f34;';
    const usernameEl = document.createElement('div');
    usernameEl.style.cssText = 'font-weight: 600; color: #00d4aa;';
    usernameEl.textContent = this.user.username || '';
    const loginInfoEl = document.createElement('div');
    loginInfoEl.style.cssText = 'font-size: 0.85rem; color: #888;';
    loginInfoEl.textContent = 'Logged in via Discord';
    userInfo.appendChild(usernameEl);
    userInfo.appendChild(loginInfoEl);

    // Menu items
    const menuItems = document.createElement('div');
    menuItems.style.cssText = 'padding: 8px 0;';
    
    const items = [
      { label: 'Game Arena', href: 'https://arena.tiltcheck.me' },
      { label: 'Profile', href: 'https://dashboard.tiltcheck.me' },
      { label: 'Settings', href: '/settings.html' },
      { label: 'Dashboard', href: 'https://dashboard.tiltcheck.me' },
      { label: 'Logout', href: '#', id: 'logout-link' }
    ];

    items.forEach(item => {
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      link.style.cssText = 'display: block; padding: 10px 16px; color: #eee; text-decoration: none; transition: background 0.2s;';
      link.setAttribute('role', 'menuitem');
      link.onmouseenter = () => link.style.background = '#2a2f34';
      link.onmouseleave = () => link.style.background = 'transparent';
      
      if (item.id === 'logout-link') {
        link.onclick = (e) => {
          e.preventDefault();
          this.logout();
        };
      }
      
      menuItems.appendChild(link);
    });

    dropdown.appendChild(userInfo);
    dropdown.appendChild(menuItems);

    // Toggle dropdown on click
    avatarBtn.onclick = () => {
      const isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
      avatarBtn.setAttribute('aria-expanded', !isOpen);
      dropdown.setAttribute('aria-hidden', isOpen);
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        dropdown.style.display = 'none';
        avatarBtn.setAttribute('aria-expanded', 'false');
        dropdown.setAttribute('aria-hidden', 'true');
      }
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.style.display === 'block') {
        avatarBtn.click();
      }
    });

    container.appendChild(avatarBtn);
    container.appendChild(dropdown);

    return container;
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
    }
  }

  showTermsModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'terms-heading');
    
    modal.innerHTML = `
      <div style="background: #1a1f24; border: 2px solid #00d4aa; border-radius: 12px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 30px;">
        <h2 id="terms-heading" style="color: #00d4aa; margin-bottom: 20px; font-size: 1.8rem;">
          <span role="img" aria-label="Scales of justice">⚖️</span> Terms & Conditions</h2>
        <div style="color: #ccc; line-height: 1.6; margin-bottom: 24px;">
          <p style="margin-bottom: 16px;">Welcome to TiltCheck! Before you continue, please review and accept our terms:</p>
          
          <h3 style="color: #00d4aa; font-size: 1.2rem; margin: 20px 0 10px;">What You're Agreeing To:</h3>
          <ul style="margin-left: 20px; margin-bottom: 16px;">
            <li style="margin-bottom: 8px;">TiltCheck is a transparency tool, not financial advice</li>
            <li style="margin-bottom: 8px;">All crypto transactions are non-custodial (you control your keys)</li>
            <li style="margin-bottom: 8px;">Tilt detection signals are informational, not diagnostic</li>
            <li style="margin-bottom: 8px;">We collect anonymous usage analytics to improve the platform</li>
            <li style="margin-bottom: 8px;">Discord integration requires read access to messages in enabled servers</li>
          </ul>

          <h3 style="color: #00d4aa; font-size: 1.2rem; margin: 20px 0 10px;">Your Responsibilities:</h3>
          <ul style="margin-left: 20px; margin-bottom: 16px;">
            <li style="margin-bottom: 8px;">You are 18+ years old or have parental consent</li>
            <li style="margin-bottom: 8px;">You understand gambling risks and your local laws</li>
            <li style="margin-bottom: 8px;">You will not abuse, exploit, or misuse TiltCheck services</li>
            <li style="margin-bottom: 8px;">You acknowledge that TiltCheck is provided "as-is" without warranties</li>
          </ul>

          <p style="margin: 20px 0; padding: 16px; background: #0f1419; border-left: 4px solid #ff6b6b; border-radius: 4px;">
            <strong style="color: #ff6b6b;">⚠️ Important:</strong> TiltCheck cannot prevent tilt, guarantee fairness, or recover losses. Always gamble responsibly.
          </p>

          <p style="font-size: 0.9rem; color: #888;">
            By clicking "I Accept", you agree to our 
            <a href="/terms.html" target="_blank" style="color: #00d4aa; text-decoration: underline;">Terms of Service</a> and 
            <a href="/privacy.html" target="_blank" style="color: #00d4aa; text-decoration: underline;">Privacy Policy</a>.
          </p>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="terms-decline" style="padding: 12px 24px; background: #2a2f34; color: #eee; border: 1px solid #444; border-radius: 6px; cursor: pointer; font-weight: 600;">Decline & Logout</button>
          <button id="terms-accept" style="padding: 12px 24px; background: #00d4aa; color: #0a0e13; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">I Accept</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const acceptBtn = document.getElementById('terms-accept');
    const declineBtn = document.getElementById('terms-decline');
    const focusableElements = [acceptBtn, declineBtn];
    let currentFocus = 0;
    acceptBtn.focus();

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    acceptBtn.onclick = () => {
      this.acceptTerms();
      closeModal();
    };

    declineBtn.onclick = () => {
      this.logout();
    };

    // Trap focus within the modal
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        currentFocus = (currentFocus + (e.shiftKey ? -1 : 1) + focusableElements.length) % focusableElements.length;
        focusableElements[currentFocus].focus();
      } else if (e.key === 'Escape') {
        // Allow escape to decline/logout as a safety measure
        declineBtn.click();
      }
    });

    // Prevent closing by clicking outside, but allow interaction within the modal content
    modal.addEventListener('click', (e) => {
      if (e.target === modal) e.stopPropagation();
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
