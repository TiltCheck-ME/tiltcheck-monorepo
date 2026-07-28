// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDashboardHandoffUrl, getWebLoginRedirect } from '@/lib/dashboard-handoff';
import DiscordIcon from './DiscordIcon';
import { DISCORD_INVITE_URL } from '@/lib/site-links';

const DASHBOARD_URL = getDashboardHandoffUrl('/dashboard');
const LOGIN_URL = getWebLoginRedirect('/dashboard');

type NavLink = { href: string; label: string; accent?: string };

/**
 * Player-first top nav. Explainer / About / Contact / Ask / Bonuses live in Tools + footer.
 * Login is Account (dashboard handoff) — not required to install or browse trust.
 */
const NAV_LINKS: NavLink[] = [
  { href: '/casinos', label: 'Casinos' },
  { href: '/tools', label: 'Tools' },
  { href: '/operators', label: 'Operators', accent: 'amber' },
];

const STACKED_ACCENT_CLASS: Record<string, string> = {
  danger: 'nav-sidebar-link-danger',
  amber: 'nav-sidebar-link-amber',
  purple: 'nav-sidebar-link-purple',
};

const DESKTOP_ACCENT_CLASS: Record<string, string> = {
  danger: 'nav-desktop-link-danger',
  amber: 'nav-desktop-link-amber',
  purple: 'nav-desktop-link-purple',
};

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth();
  const close = () => setIsOpen(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 16);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const AuthButton = ({ compact }: { compact?: boolean }) => {
    if (loading) return null;
    if (user) {
      return (
        <a
          href={DASHBOARD_URL}
          onClick={close}
          className={compact ? 'nav-auth-compact nav-auth-user' : 'nav-auth-full nav-auth-user'}
          data-funnel-event="dashboard_handoff_click"
          data-funnel-source={compact ? 'web-nav-compact-auth' : 'web-nav-auth'}
          data-funnel-label="Open dashboard controls"
          title="Open your dashboard"
        >
          {compact ? 'Account' : (user.discordUsername || user.username || 'Account')}
        </a>
      );
    }
    return (
      <Link
        href={LOGIN_URL}
        onClick={close}
        className={compact ? 'nav-auth-compact nav-auth-discord' : 'nav-auth-full nav-auth-discord'}
        title="Account — vault rules, sync, buddies. Not required to install."
      >
        Account
      </Link>
    );
  };

  const DesktopLinks = () => (
    <>
      <Link
        href="/extension"
        className="nav-desktop-link nav-desktop-beta"
        data-funnel-event="nav_install_click"
        data-funnel-source="web-nav-desktop"
        data-funnel-label="Install"
      >
        Install
      </Link>
      {NAV_LINKS.map(({ href, label, accent }) => (
        <Link
          key={href}
          href={href}
          className={`nav-desktop-link${accent ? ` ${DESKTOP_ACCENT_CLASS[accent]}` : ''}`}
        >
          {label}
        </Link>
      ))}
    </>
  );

  const MobileLinks = () => (
    <>
      <Link
        href="/extension"
        onClick={close}
        className="nav-sidebar-link nav-sidebar-beta"
        data-funnel-event="nav_install_click"
        data-funnel-source="web-nav-mobile"
        data-funnel-label="Install the Extension"
      >
        Install the Extension
      </Link>
      {NAV_LINKS.map(({ href, label, accent }) => (
        <Link
          key={href}
          href={href}
          onClick={close}
          className={`nav-sidebar-link${accent ? ` ${STACKED_ACCENT_CLASS[accent]}` : ''}`}
        >
          {label}
        </Link>
      ))}
      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={close}
        className="nav-sidebar-link nav-discord-link"
      >
        <DiscordIcon size={16} />
        Join Discord
      </a>
    </>
  );

  return (
    <>
      <div className={`nav-topbar${scrolled ? ' nav-topbar--scrolled' : ''}`}>
        <Link href="/" className="nav-logo" aria-label="TiltCheck home">
          <span className="nav-logo-icon">
            <img src="/icon.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} aria-hidden="true" />
          </span>
          <span className="nav-logo-text">TILTCHECK</span>
        </Link>

        <nav className="nav-desktop-links" aria-label="Primary navigation">
          <DesktopLinks />
        </nav>

        <div className="nav-desktop-actions">
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-desktop-link nav-discord-link"
          >
            <DiscordIcon size={16} />
            JOIN DISCORD
          </a>
          <AuthButton />
        </div>

        <div className="nav-topbar-right">
          <AuthButton compact />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="nav-hamburger"
            aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
            aria-controls="site-mobile-nav"
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="nav-overlay" onClick={close} aria-hidden="true" />
      )}

      {isOpen && (
        <div
          id="site-mobile-nav"
          className="nav-collapse nav-collapse--open"
          aria-label="Navigation menu"
        >
          <nav className="nav-collapse-links">
            <MobileLinks />
          </nav>
          <div className="nav-collapse-foot">
            <AuthButton />
          </div>
        </div>
      )}
    </>
  );
};

export default Nav;
