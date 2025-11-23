/**
 * Authentication and user management
 */

class AuthManager {
  constructor() {
    this.user = null;
    this.init();
  }

  async init() {
    await this.checkAuthStatus();
    this.setupEventListeners();
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        this.user = await response.json();
        this.showUserInfo();
      } else {
        this.showLoginPrompt();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.showLoginPrompt();
    }
  }

  setupEventListeners() {
    const discordLogin = document.getElementById('discord-login');
    const enterArena = document.getElementById('enter-arena');
    const logout = document.getElementById('logout');

    if (discordLogin) {
      discordLogin.addEventListener('click', () => {
        window.location.href = '/auth/discord';
      });
    }

    if (enterArena) {
      enterArena.addEventListener('click', () => {
        window.location.href = '/arena';
      });
    }

    if (logout) {
      logout.addEventListener('click', async () => {
        try {
          await fetch('/auth/logout');
          window.location.reload();
        } catch (error) {
          console.error('Logout failed:', error);
        }
      });
    }
  }

  showUserInfo() {
    const userInfo = document.getElementById('user-info');
    const loginPrompt = document.getElementById('login-prompt');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    if (userInfo && loginPrompt && userName && userAvatar && this.user) {
      userName.textContent = `${this.user.username}#${this.user.discriminator}`;
      
      // Discord avatar URL format
      if (this.user.avatar) {
        userAvatar.src = `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?size=128`;
      } else {
        // Default Discord avatar
        const defaultAvatarIndex = parseInt(this.user.discriminator) % 5;
        userAvatar.src = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
      }
      
      userInfo.classList.remove('hidden');
      loginPrompt.classList.add('hidden');
    }
  }

  showLoginPrompt() {
    const userInfo = document.getElementById('user-info');
    const loginPrompt = document.getElementById('login-prompt');

    if (userInfo && loginPrompt) {
      userInfo.classList.add('hidden');
      loginPrompt.classList.remove('hidden');
    }
  }

  getUser() {
    return this.user;
  }
}

// Initialize auth manager
const authManager = new AuthManager();
