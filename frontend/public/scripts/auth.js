/**
 * TiltCheck Authentication Handler
 * Manages Discord OAuth via Supabase and shows user state
 */

const SUPABASE_URL = 'https://ypyvqddzrdjzfdwhcacb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweXZxZGR6cmRqemZkd2hjYWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NjgxNzAsImV4cCI6MjA0ODA0NDE3MH0.placeholder';

class TiltCheckAuth {
  constructor() {
    this.user = null;
    this.session = null;
    this.storageKey = `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`;
  }

  async init() {
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.hash.substring(1));
    if (params.get('access_token')) {
      await this.handleCallback(params);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load existing session
    await this.loadSession();
    this.updateUI();
  }

  async handleCallback(params) {
    const session = {
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      expires_at: Date.now() + (parseInt(params.get('expires_in') || '3600') * 1000),
      token_type: params.get('token_type') || 'bearer'
    };

    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.session = session;
    
    // Fetch user info
    await this.fetchUser();
  }

  async loadSession() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const session = JSON.parse(stored);
      
      // Check if expired
      if (session.expires_at && Date.now() > session.expires_at) {
        if (session.refresh_token) {
          await this.refreshToken(session.refresh_token);
        } else {
          this.logout();
        }
        return;
      }

      this.session = session;
      await this.fetchUser();
    } catch (e) {
      console.error('[Auth] Load session error:', e);
      this.logout();
    }
  }

  async fetchUser() {
    if (!this.session?.access_token) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${this.session.access_token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      });

      if (res.ok) {
        this.user = await res.json();
      } else {
        this.logout();
      }
    } catch (e) {
      console.error('[Auth] Fetch user error:', e);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (res.ok) {
        const data = await res.json();
        const session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + (data.expires_in * 1000),
          token_type: data.token_type
        };
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.session = session;
        this.user = data.user;
      } else {
        this.logout();
      }
    } catch (e) {
      console.error('[Auth] Refresh error:', e);
      this.logout();
    }
  }

  async login() {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(redirectTo)}`;
    window.location.href = authUrl;
  }

  logout() {
    localStorage.removeItem(this.storageKey);
    this.user = null;
    this.session = null;
    this.updateUI();
  }

  updateUI() {
    const userBtn = document.getElementById('user-btn');
    const loginBtn = document.getElementById('login-btn');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userDropdown = document.getElementById('user-dropdown');

    if (!userBtn || !loginBtn) return;

    if (this.user) {
      // User is logged in
      loginBtn.style.display = 'none';
      userBtn.style.display = 'flex';
      
      if (userAvatar && this.user.user_metadata?.avatar_url) {
        userAvatar.src = this.user.user_metadata.avatar_url;
      }
      
      if (userName && this.user.user_metadata?.full_name) {
        userName.textContent = this.user.user_metadata.full_name.split('#')[0];
      }

      // Setup dropdown click
      if (userBtn && userDropdown) {
        userBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          userDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
          userDropdown.classList.remove('show');
        });
      }

      // Setup logout
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      }
    } else {
      // User is not logged in
      loginBtn.style.display = 'flex';
      userBtn.style.display = 'none';
      
      if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.login();
        });
      }
    }
  }

  isAuthenticated() {
    return !!this.user;
  }

  getUserId() {
    return this.user?.id || null;
  }

  getDiscordId() {
    return this.user?.user_metadata?.provider_id || null;
  }

  getUsername() {
    return this.user?.user_metadata?.full_name || 'User';
  }
}

// Global instance
window.tiltCheckAuth = new TiltCheckAuth();

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.tiltCheckAuth.init());
} else {
  window.tiltCheckAuth.init();
}
