/**
 * Shared Authentication Script for TiltCheck
 * Checks auth status and updates navigation across all pages
 */

class TiltCheckAuth {
  constructor() {
    this.user = null;
    this.init();
  }

  async init() {
    await this.checkAuthStatus();
    if (this.user && !this.hasAcceptedTerms()) {
      this.showTermsModal();
    }
    await this.waitForNavReady();
    this.updateNavigation();

    // React to shared component injection if it fires later
    document.addEventListener('tc:componentsLoaded', () => {
      this.updateNavigation();
    });
  }

  async checkAuthStatus() {
    try {
      // Check game arena auth endpoint
      const response = await fetch('/play/api/user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        this.user = await response.json();
      }
    } catch (error) {
      // User not logged in or game arena not available
      this.user = null;
    }
  }

  updateNavigation() {
    const loginButton = document.querySelector('.discord-login-btn, a[href="/play/"]');
    
    if (!loginButton) return;

    if (this.user) {
      // Replace login button with user avatar dropdown
      const avatar = this.createUserAvatar();
      loginButton.replaceWith(avatar);
    }
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
        if (loginBtn || Date.now() - start > maxWaitMs) {
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

    // User info header
    const userInfo = document.createElement('div');
    userInfo.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #2a2f34;';
    userInfo.innerHTML = `
      <div style="font-weight: 600; color: #00d4aa;">${this.user.username}</div>
      <div style="font-size: 0.85rem; color: #888;">Logged in via Discord</div>
    `;

    // Menu items
    const menuItems = document.createElement('div');
    menuItems.style.cssText = 'padding: 8px 0;';
    
    const items = [
      { label: '🎮 Game Arena', href: '/play/arena' },
      { label: '👤 Profile', href: '/play/profile.html' },
      { label: '⚙️ Settings', href: '/settings.html' },
      { label: '📊 Dashboard', href: '/dashboard' },
      { label: '🚪 Logout', href: '#', id: 'logout-link' }
    ];

    items.forEach(item => {
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      link.style.cssText = 'display: block; padding: 10px 16px; color: #eee; text-decoration: none; transition: background 0.2s;';
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
    
    modal.innerHTML = `
      <div style="background: #1a1f24; border: 2px solid #00d4aa; border-radius: 12px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 30px;">
        <h2 style="color: #00d4aa; margin-bottom: 20px; font-size: 1.8rem;">⚖️ Terms & Conditions</h2>
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

    document.getElementById('terms-accept').onclick = () => {
      this.acceptTerms();
      document.body.removeChild(modal);
    };

    document.getElementById('terms-decline').onclick = () => {
      this.logout();
    };

    // Prevent closing by clicking outside
    modal.onclick = (e) => {
      if (e.target === modal) {
        e.stopPropagation();
      }
    };
  }
}

// Initialize auth on page load
if (typeof window !== 'undefined') {
  window.tiltCheckAuth = new TiltCheckAuth();
}
