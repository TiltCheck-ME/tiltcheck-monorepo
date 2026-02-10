/**
 * Shared Authentication Script for TiltCheck
 * Uses Supabase OAuth for cross-ecosystem Discord authentication
 * 
 * This script provides:
 * - Discord login via Supabase OAuth
 * - Persistent session across all pages
 * - User profile dropdown in navigation
 * - Cross-ecosystem identity management
 */

// Supabase configuration - loaded from window or defaults
// NOTE: The anon key is intentionally public and designed to be exposed in client-side code.
// It has Row Level Security (RLS) policies that control data access.
// See: https://supabase.com/docs/guides/api/api-keys
const SUPABASE_URL = window.TILTCHECK_SUPABASE_URL || 'https://ypyvqddzrdjzfdwhcacb.supabase.co';
const SUPABASE_ANON_KEY = window.TILTCHECK_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweXZxZGR6cmRqemZkd2hjYWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NjgxNzAsImV4cCI6MjA0ODA0NDE3MH0.placeholder';

// Simple Supabase auth client for browser
class SupabaseAuthBrowser {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.storageKey = 'sb-' + url.split('//')[1].split('.')[0] + '-auth-token';
  }

  async getSession() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;
      
      const session = JSON.parse(stored);
      if (!session || !session.access_token) return null;
      
      // Verify session is still valid
      const response = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': this.key
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        return { user, session };
      }
      
      // Try to refresh token
      if (session.refresh_token) {
        return await this.refreshSession(session.refresh_token);
      }
      
      return null;
    } catch (e) {
      console.error('[Auth] Session check error:', e);
      return null;
    }
  }

  async refreshSession(refreshToken) {
    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.saveSession(data);
        return { user: data.user, session: data };
      }
      
      return null;
    } catch (e) {
      console.error('[Auth] Refresh error:', e);
      return null;
    }
  }

  saveSession(session) {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  clearSession() {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Generate a random code verifier for PKCE
   */
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate code challenge from verifier for PKCE
   */
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Get OAuth URL with proper PKCE parameters
   */
  async getOAuthUrl(provider, redirectTo) {
    // Generate and store code verifier for PKCE
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    sessionStorage.setItem('supabase-code-verifier', codeVerifier);
    
    // Store current page for return after auth
    sessionStorage.setItem('auth-return-url', window.location.href);
    
    const params = new URLSearchParams({
      provider: provider,
      redirect_to: redirectTo || window.location.origin + '/auth/callback',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    return `${this.url}/auth/v1/authorize?${params.toString()}`;
  }

  async exchangeCodeForSession(code) {
    try {
      const codeVerifier = sessionStorage.getItem('supabase-code-verifier') || '';
      
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=authorization_code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key
        },
        body: JSON.stringify({ 
          auth_code: code,
          code_verifier: codeVerifier
        })
      });
      
      // Clear the code verifier after use
      sessionStorage.removeItem('supabase-code-verifier');
      
      if (response.ok) {
        const data = await response.json();
        this.saveSession(data);
        return { user: data.user, session: data };
      }
      
      return null;
    } catch (e) {
      console.error('[Auth] Code exchange error:', e);
      return null;
    }
  }

  async signOut() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const session = JSON.parse(stored);
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': this.key
          }
        });
      }
    } catch (e) {
      console.error('[Auth] Logout error:', e);
    }
    this.clearSession();
  }
}

// Initialize Supabase auth
const supabaseAuth = new SupabaseAuthBrowser(SUPABASE_URL, SUPABASE_ANON_KEY);

class TiltCheckAuth {
  constructor() {
    this.user = null;
    this.session = null;
    this.init();
  }

  async init() {
    // Handle OAuth callback if we're on the callback page
    await this.handleAuthCallback();
    
    // Check existing session
    await this.checkAuthStatus();
    
    // Show terms modal if needed
    if (this.user && !this.hasAcceptedTerms()) {
      this.showTermsModal();
    }
    
    // Update all login buttons on the page
    this.updateNavigation();
  }

  async handleAuthCallback() {
    // Check if we're on an auth callback page
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    if (error) {
      console.error('[Auth] OAuth error:', error);
      // Remove query params and show error
      window.history.replaceState({}, '', url.pathname);
      return;
    }
    
    if (code) {
      // Exchange code for session
      const result = await supabaseAuth.exchangeCodeForSession(code);
      if (result) {
        this.user = result.user;
        this.session = result.session;
      }
      // Remove query params from URL
      window.history.replaceState({}, '', url.pathname);
    }
  }

  async checkAuthStatus() {
    const result = await supabaseAuth.getSession();
    if (result) {
      this.user = result.user;
      this.session = result.session;
    }
  }

  updateNavigation() {
    // Find all login buttons on the page
    const loginButtons = document.querySelectorAll('.discord-login-btn, a[href="/play/"], a[href="/play/auth/discord"]');
    
    loginButtons.forEach(loginButton => {
      if (this.user) {
        // Replace login button with user avatar dropdown
        const avatar = this.createUserAvatar();
        loginButton.replaceWith(avatar);
      } else {
        // Make sure login button triggers Discord OAuth
        loginButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.loginWithDiscord();
        });
        // Update href for non-JS fallback
        loginButton.href = '#';
        loginButton.setAttribute('data-auth', 'discord-login');
      }
    });
    
    // Handle email login links across the ecosystem
    const emailLoginLinks = document.querySelectorAll('#emailLoginLink, .email-login-link, [data-auth="email-login"]');
    emailLoginLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.showEmailLoginModal();
      });
    });
    
    // Add "Don't have Discord?" link dynamically to login sections if not present
    this.injectEmailLoginOption();
  }

  /**
   * Inject email login option into login sections across the ecosystem
   */
  injectEmailLoginOption() {
    // Find containers that have Discord login buttons but no email option
    const discordBtns = document.querySelectorAll('.discord-login-btn');
    
    discordBtns.forEach(btn => {
      const container = btn.parentElement;
      if (!container) return;
      
      // Check if email option already exists
      if (container.querySelector('.email-login-link, #emailLoginLink')) return;
      
      // Create email login option
      const emailOption = document.createElement('p');
      emailOption.style.cssText = 'margin-top: 16px; text-align: center;';
      emailOption.innerHTML = `
        <a href="#" class="email-login-link" style="color: #6B7280; font-size: 0.85rem; text-decoration: underline;">
          Don't have Discord? Login with email
        </a>
      `;
      
      // Insert after the Discord button
      btn.insertAdjacentElement('afterend', emailOption);
      
      // Add click handler
      emailOption.querySelector('.email-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        this.showEmailLoginModal();
      });
    });
  }

  createUserAvatar() {
    const discordUser = this.getDiscordUser();
    
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
    img.alt = discordUser.username || 'User';
    
    // Set avatar URL from Supabase user metadata
    if (discordUser.avatar) {
      img.src = discordUser.avatar;
    } else {
      // Default Discord avatar
      const defaultIndex = Math.abs(discordUser.id?.charCodeAt(0) || 0) % 5;
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
      <div style="font-weight: 600; color: #00d4aa;">${discordUser.username}</div>
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

  /**
   * Initiate Discord OAuth login via Supabase
   */
  async loginWithDiscord() {
    const redirectUrl = window.location.origin + '/auth/callback';
    const oauthUrl = await supabaseAuth.getOAuthUrl('discord', redirectUrl);
    window.location.href = oauthUrl;
  }

  /**
   * Initiate email magic link login via Supabase
   */
  async loginWithEmail(email) {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: email,
          options: {
            emailRedirectTo: window.location.origin + '/auth/callback'
          }
        })
      });
      
      if (response.ok) {
        return { success: true, message: 'Check your email for a login link!' };
      } else {
        const error = await response.json();
        return { success: false, message: error.error_description || 'Failed to send login email' };
      }
    } catch (e) {
      console.error('[Auth] Email login error:', e);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  /**
   * Check if user logged in via Discord or Email
   */
  getLoginMethod() {
    if (!this.user) return null;
    const provider = this.user.app_metadata?.provider;
    return provider === 'discord' ? 'discord' : 'email';
  }

  /**
   * Check if user needs legal notices via email (no Discord)
   */
  needsEmailLegalNotices() {
    return this.getLoginMethod() === 'email';
  }

  async logout() {
    try {
      await supabaseAuth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/';
    }
  }

  getUser() {
    return this.user;
  }

  /**
   * Get Discord-specific user info from Supabase user metadata
   */
  getDiscordUser() {
    if (!this.user) return null;
    
    const metadata = this.user.user_metadata || {};
    return {
      id: metadata.provider_id || this.user.id,
      username: metadata.full_name || metadata.name || metadata.preferred_username || this.user.email?.split('@')[0] || 'User',
      avatar: metadata.avatar_url || null,
      email: this.user.email
    };
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
      
      // If email user, record that legal notices should be sent via email
      if (this.needsEmailLegalNotices()) {
        localStorage.setItem(`legal_notice_method_${this.user.id}`, 'email');
      }
    }
  }

  /**
   * Show email login modal for users without Discord
   */
  showEmailLoginModal() {
    const modal = document.createElement('div');
    modal.id = 'email-login-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
    
    modal.innerHTML = `
      <div style="background: #1a1f24; border: 2px solid #00d4aa; border-radius: 12px; max-width: 420px; width: 100%; padding: 30px;">
        <h2 style="color: #00d4aa; margin-bottom: 8px; font-size: 1.5rem; text-align: center;">📧 Login with Email</h2>
        <p style="color: #888; text-align: center; margin-bottom: 24px; font-size: 0.9rem;">
          We'll send you a magic link to sign in instantly.
        </p>
        
        <form id="email-login-form">
          <div style="margin-bottom: 16px;">
            <label for="login-email" style="display: block; color: #ccc; margin-bottom: 8px; font-size: 0.9rem;">Email address</label>
            <input 
              type="email" 
              id="login-email" 
              required
              placeholder="you@example.com"
              style="width: 100%; padding: 12px 16px; background: #0a0e13; border: 1px solid #374151; border-radius: 6px; color: #fff; font-size: 1rem; box-sizing: border-box;"
            >
          </div>
          
          <button type="submit" id="email-submit-btn" style="width: 100%; padding: 14px; background: #00d4aa; color: #0a0e13; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;">
            Send Magic Link
          </button>
          
          <div id="email-login-status" style="margin-top: 16px; text-align: center; font-size: 0.9rem; display: none;"></div>
        </form>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #374151; text-align: center;">
          <p style="color: #888; font-size: 0.85rem; margin-bottom: 12px;">Have Discord?</p>
          <button id="switch-to-discord" style="padding: 10px 20px; background: #5865F2; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
            Login with Discord
          </button>
        </div>
        
        <button id="close-email-modal" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #888; font-size: 1.5rem; cursor: pointer; padding: 5px;">×</button>
        
        <p style="margin-top: 20px; font-size: 0.75rem; color: #6B7280; text-align: center;">
          📬 Legal notices will be sent to your email since you don't use Discord.
        </p>
      </div>
    `;

    document.body.appendChild(modal);

    const form = document.getElementById('email-login-form');
    const statusEl = document.getElementById('email-login-status');
    const submitBtn = document.getElementById('email-submit-btn');

    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      statusEl.style.display = 'none';
      
      const result = await this.loginWithEmail(email);
      
      statusEl.style.display = 'block';
      if (result.success) {
        statusEl.style.color = '#4CAF50';
        statusEl.textContent = '✓ ' + result.message;
        submitBtn.textContent = 'Email Sent!';
      } else {
        statusEl.style.color = '#FF5252';
        statusEl.textContent = '✗ ' + result.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Magic Link';
      }
    };

    document.getElementById('switch-to-discord').onclick = () => {
      document.body.removeChild(modal);
      this.loginWithDiscord();
    };

    document.getElementById('close-email-modal').onclick = () => {
      document.body.removeChild(modal);
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };
  }

  showTermsModal() {
    const isEmailUser = this.needsEmailLegalNotices();
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
            ${isEmailUser ? '' : '<li style="margin-bottom: 8px;">Discord integration requires read access to messages in enabled servers</li>'}
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

          ${isEmailUser ? `
          <p style="margin: 16px 0; padding: 12px; background: rgba(0, 212, 170, 0.1); border-left: 4px solid #00d4aa; border-radius: 4px; font-size: 0.9rem;">
            <strong style="color: #00d4aa;">📧 Legal Notices:</strong> Since you signed up with email, important legal updates and notices will be sent to your email address.
          </p>
          ` : ''}

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
