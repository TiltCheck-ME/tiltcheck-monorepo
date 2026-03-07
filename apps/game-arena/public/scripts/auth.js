/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Authentication and user management
 * Uses Supabase Discord OAuth for authentication
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
        // Redirect to Discord OAuth via Supabase
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
      // Display username (discriminator is deprecated in Discord)
      userName.textContent = this.user.username;
      
      // Use avatar URL from Supabase auth or Discord CDN
      if (this.user.avatar) {
        // Check if it's a full URL (from Supabase) or just an avatar ID (Discord)
        if (this.user.avatar.startsWith('http')) {
          userAvatar.src = this.user.avatar;
        } else {
          userAvatar.src = `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?size=128`;
        }
      } else {
        // Default Discord avatar based on user ID
        const defaultAvatarIndex = parseInt(this.user.id) % 5;
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
