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
    this.updateNavigation();
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
}

// Initialize auth on page load
if (typeof window !== 'undefined') {
  window.tiltCheckAuth = new TiltCheckAuth();
}
