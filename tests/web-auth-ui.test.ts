import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { createUserAvatar, showTermsModal } from '../apps/web/scripts/auth.ui.js';

let dom;
let window;
let document;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://tiltcheck.me/',
  });
  window = dom.window;
  document = window.document;
  global.document = document;
  global.window = window;
  global.HTMLElement = window.HTMLElement;
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Auth UI Components', () => {
  describe('createUserAvatar', () => {
    const mockUser = {
      id: '123456789',
      username: 'TestUser',
      avatar: 'avatar_hash_123',
    };
    const onLogout = vi.fn();

    it('should create an avatar button with the correct image source', () => {
      const avatarComponent = createUserAvatar(mockUser, onLogout);
      document.body.appendChild(avatarComponent);

      const button = document.querySelector('.user-avatar-btn');
      expect(button).not.toBeNull();

      const img = button.querySelector('img');
      expect(img).not.toBeNull();
      expect(img.src).toBe(`https://cdn.discordapp.com/avatars/${mockUser.id}/${mockUser.avatar}.png?size=128`);
      expect(img.alt).toBe('TestUser Avatar');
    });

    it('should use a default avatar if one is not provided', () => {
      const userWithoutAvatar = { ...mockUser, avatar: null };
      const avatarComponent = createUserAvatar(userWithoutAvatar, onLogout);
      document.body.appendChild(avatarComponent);

      const img = document.querySelector('.user-avatar-btn img');
      expect(img.src).toContain('https://cdn.discordapp.com/embed/avatars/');
    });

    it('should toggle the dropdown menu on button click', () => {
      const avatarComponent = createUserAvatar(mockUser, onLogout);
      document.body.appendChild(avatarComponent);

      const button = document.querySelector('.user-avatar-btn');
      const dropdown = document.querySelector('.user-dropdown-menu');

      expect(dropdown.getAttribute('aria-hidden')).toBe('true');
      expect(button.getAttribute('aria-expanded')).toBe('false');

      button.click();

      expect(dropdown.getAttribute('aria-hidden')).toBe('false');
      expect(button.getAttribute('aria-expanded')).toBe('true');

      button.click();

      expect(dropdown.getAttribute('aria-hidden')).toBe('true');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('should call onLogout when the logout link is clicked', () => {
      const avatarComponent = createUserAvatar(mockUser, onLogout);
      document.body.appendChild(avatarComponent);

      const logoutLink = document.querySelector('a[href="#"]');
      logoutLink.click();

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should close the dropdown when clicking outside', () => {
      const avatarComponent = createUserAvatar(mockUser, onLogout);
      document.body.appendChild(avatarComponent);
      const button = document.querySelector('.user-avatar-btn');
      const dropdown = document.querySelector('.user-dropdown-menu');

      button.click(); // Open dropdown
      expect(dropdown.getAttribute('aria-hidden')).toBe('false');

      document.body.click(); // Click outside
      expect(dropdown.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('showTermsModal', () => {
    const callbacks = {
      onAccept: vi.fn(),
      onDecline: vi.fn(),
    };

    it('should create and append the modal to the body', () => {
      showTermsModal(callbacks);
      const modal = document.querySelector('.auth-modal-overlay');
      expect(modal).not.toBeNull();
      expect(document.body.contains(modal)).toBe(true);
    });

    it('should call onAccept and remove the modal when "I Accept" is clicked', () => {
      showTermsModal(callbacks);
      const acceptBtn = document.getElementById('terms-accept');
      
      acceptBtn.click();

      expect(callbacks.onAccept).toHaveBeenCalledTimes(1);
      const modal = document.querySelector('.auth-modal-overlay');
      expect(modal).toBeNull();
    });

    it('should call onDecline when "Decline & Logout" is clicked', () => {
      showTermsModal(callbacks);
      const declineBtn = document.getElementById('terms-decline');

      declineBtn.click();

      expect(callbacks.onDecline).toHaveBeenCalledTimes(1);
    });
  });
});