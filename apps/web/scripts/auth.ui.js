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
  avatarBtn.setAttribute('aria-label', 'User menu');
  avatarBtn.setAttribute('aria-expanded', 'false');

  const img = document.createElement('img');
  img.alt = user.username || 'User Avatar';

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
    const isExpanded = avatarBtn.getAttribute('aria-expanded') === 'true';
    avatarBtn.setAttribute('aria-expanded', String(!isExpanded));
    dropdown.setAttribute('aria-hidden', String(isExpanded));
    if (!isExpanded) dropdown.querySelector('a, button')?.focus();
  };

  return avatarBtn;
}

function createDropdownMenu(user, onLogout) {
  const dropdown = document.createElement('div');
  dropdown.className = 'user-dropdown-menu';
  dropdown.setAttribute('aria-hidden', 'true');
  dropdown.setAttribute('role', 'menu');

  const userInfo = document.createElement('div');
  userInfo.className = 'user-dropdown-header';
  const usernameEl = document.createElement('div');
  usernameEl.className = 'user-dropdown-username';
  usernameEl.textContent = user.username || '';
  const loginInfoEl = document.createElement('div');
  loginInfoEl.className = 'user-dropdown-info';
  loginInfoEl.textContent = 'Logged in via Discord';
  userInfo.appendChild(usernameEl);
  userInfo.appendChild(loginInfoEl);

  const menuItems = document.createElement('div');
  menuItems.className = 'user-dropdown-items';

  const items = [
    { label: 'Profile', href: 'https://dashboard.tiltcheck.me' },
    { label: 'Logout', href: '#', id: 'logout-link' },
  ];

  items.forEach((item) => {
    const link = document.createElement('a');
    Object.assign(link, { href: item.href, textContent: item.label, className: 'user-dropdown-item' });
    link.setAttribute('role', 'menuitem');

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
  modal.className = 'auth-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'terms-heading');

  modal.innerHTML = `
    <div class="auth-modal-content">
      <h2 id="terms-heading">
        <span role="img" aria-label="Scales of justice">⚖️</span> Terms & Conditions</h2>
      <div class="modal-body">
        <p>Welcome to TiltCheck! Before you continue, please review and accept our terms.</p>
        <p class="text-sm text-muted">
          By clicking "I Accept", you agree to our 
          <a href="/terms.html" target="_blank" class="link-primary">Terms of Service</a> and 
          <a href="/privacy.html" target="_blank" class="link-primary">Privacy Policy</a>.
        </p>
      </div>
      <div class="modal-actions">
        <button id="terms-decline" class="btn btn-secondary">Decline & Logout</button>
        <button id="terms-accept" class="btn btn-primary">I Accept</button>
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