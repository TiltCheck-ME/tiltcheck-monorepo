/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * UI component builders for the shared authentication script.
 * Separates DOM creation and manipulation from the auth logic.
 */

/**
 * Creates the user avatar button and dropdown menu.
 * @param {object} user - The user object.
 * @param {function} onLogout - The function to call on logout.
 * @returns {HTMLElement} The container element for the avatar and dropdown.
 */
export function createUserAvatar(user, onLogout) {
  const container = document.createElement('div');
  container.className = 'user-avatar-container';
  container.style.position = 'relative';
  container.style.display = 'inline-block';

  const dropdown = createDropdownMenu(user, onLogout);
  const avatarBtn = createAvatarButton(user, dropdown);

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

function createAvatarButton(user, dropdown) {
  const avatarBtn = document.createElement('button');
  avatarBtn.className = 'user-avatar-btn';
  avatarBtn.style.cssText =
    'background: none; border: 2px solid #00d4aa; border-radius: 50%; padding: 2px; cursor: pointer; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;';
  avatarBtn.setAttribute('aria-label', 'User menu');
  avatarBtn.setAttribute('aria-expanded', 'false');

  const img = document.createElement('img');
  img.style.cssText = 'width: 36px; height: 36px; border-radius: 50%; object-fit: cover;';
  img.alt = user.username || 'User';

  if (user.avatar) {
    img.src = user.avatar.startsWith('http')
      ? user.avatar
      : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  } else {
    const defaultIndex = parseInt(user.id, 10) % 5;
    img.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }

  avatarBtn.appendChild(img);

  avatarBtn.onclick = () => {
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    avatarBtn.setAttribute('aria-expanded', String(!isOpen));
    dropdown.setAttribute('aria-hidden', String(isOpen));
  };

  return avatarBtn;
}

function createDropdownMenu(user, onLogout) {
  const dropdown = document.createElement('div');
  dropdown.className = 'user-dropdown-menu';
  dropdown.style.cssText =
    'display: none; position: absolute; right: 0; top: 50px; background: #1a1f24; border: 1px solid #00d4aa; border-radius: 8px; min-width: 200px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); z-index: 1000;';
  dropdown.setAttribute('aria-hidden', 'true');
  dropdown.setAttribute('role', 'menu');

  const userInfo = document.createElement('div');
  userInfo.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #2a2f34;';
  const usernameEl = document.createElement('div');
  usernameEl.style.cssText = 'font-weight: 600; color: #00d4aa;';
  usernameEl.textContent = user.username || '';
  const loginInfoEl = document.createElement('div');
  loginInfoEl.style.cssText = 'font-size: 0.85rem; color: #888;';
  loginInfoEl.textContent = 'Logged in via Discord';
  userInfo.appendChild(usernameEl);
  userInfo.appendChild(loginInfoEl);

  const menuItems = document.createElement('div');
  menuItems.style.padding = '8px 0';

  const items = [
    { label: 'Game Arena', href: 'https://arena.tiltcheck.me' },
    { label: 'Profile', href: 'https://dashboard.tiltcheck.me' },
    { label: 'Settings', href: '/settings.html' },
    { label: 'Dashboard', href: 'https://dashboard.tiltcheck.me' },
    { label: 'Logout', href: '#', id: 'logout-link' },
  ];

  items.forEach((item) => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    link.style.cssText =
      'display: block; padding: 10px 16px; color: #eee; text-decoration: none; transition: background 0.2s;';
    link.setAttribute('role', 'menuitem');
    link.onmouseenter = () => (link.style.background = '#2a2f34');
    link.onmouseleave = () => (link.style.background = 'transparent');

    if (item.id === 'logout-link') {
      link.onclick = (e) => {
        e.preventDefault();
        onLogout();
      };
    }
    menuItems.appendChild(link);
  });

  dropdown.appendChild(userInfo);
  dropdown.appendChild(menuItems);

  return dropdown;
}

/**
 * Creates and displays the terms and conditions modal.
 * @param {object} callbacks - Object with `onAccept` and `onDecline` functions.
 */
export function showTermsModal({ onAccept, onDecline }) {
  const modal = document.createElement('div');
  modal.style.cssText =
    'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'terms-heading');

  modal.innerHTML = `
    <div style="background: #1a1f24; border: 2px solid #00d4aa; border-radius: 12px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 30px;">
      <h2 id="terms-heading" style="color: #00d4aa; margin-bottom: 20px; font-size: 1.8rem;">
        <span role="img" aria-label="Scales of justice">⚖️</span> Terms & Conditions</h2>
      <div style="color: #ccc; line-height: 1.6; margin-bottom: 24px;">
        <p style="margin-bottom: 16px;">Welcome to TiltCheck! Before you continue, please review and accept our terms.</p>
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

  const closeModal = () => document.body.removeChild(modal);

  acceptBtn.onclick = () => {
    onAccept();
    closeModal();
  };

  declineBtn.onclick = () => {
    onDecline();
    // The onDecline (logout) function will typically reload the page, removing the modal.
  };

  // Basic focus trapping
  acceptBtn.focus();
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') declineBtn.click();
  });
}