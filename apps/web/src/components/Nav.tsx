// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDashboardHandoffUrl, getWebLoginRedirect } from '@/lib/dashboard-handoff';

const DASHBOARD_URL = getDashboardHandoffUrl('/dashboard');
const LOGIN_URL = getWebLoginRedirect('/dashboard');

type NavLink = { href: string; label: string; accent?: string };

const NAV_LINKS_PRIMARY: NavLink[] = [
  { href: '/extension',   label: 'Extension' },
  { href: '/casinos',     label: 'Casinos' },
  { href: '/#tools',      label: 'Tools' },
  { href: '/how-it-works', label: 'How it works' },
];

const NAV_LINKS_SECONDARY: NavLink[] = [
  { href: '/blog',      label: 'Blog' },
  { href: '/docs',      label: 'Docs' },
  { href: '/bonuses',   label: 'Bonuses' },
  { href: '/collab',    label: 'Contact', accent: 'purple' },
];

const ALL_LINKS = [...NAV_LINKS_PRIMARY, ...NAV_LINKS_SECONDARY];

const STACKED_ACCENT_CLASS: Record<string, string> = {
  danger: 'nav-sidebar-link-danger',
  purple: 'nav-sidebar-link-purple',
};

const DESKTOP_ACCENT_CLASS: Record<string, string> = {
  danger: 'nav-desktop-link-danger',
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const AuthButton = ({ compact }: { compact?: boolean }) => {
    if (loading) return null;
    if (user) {
      return (
        <a href={DASHBOARD_URL} onClick={close} className={compact ? 'nav-auth-compact nav-auth-user' : 'nav-auth-full nav-auth-user'}>
          {user.discordUsername || user.username}
        </a>
      );
    }
    return (
      <Link
        href={LOGIN_URL}
        onClick={close}
        className={compact ? 'nav-auth-compact nav-auth-discord' : 'nav-auth-full nav-auth-discord'}
      >
        {compact ? 'Login' : 'Login with Discord'}
      </Link>
    );
  };

  const DesktopLinks = () => (
    <>
      {ALL_LINKS.map(({ href, label, accent }) => (
        <Link
          key={href}
          href={href}
          className={`nav-desktop-link${accent ? ` ${DESKTOP_ACCENT_CLASS[accent]}` : ''}`}
        >
          {label}
        </Link>
      ))}
      <Link href="/extension" className="nav-desktop-link nav-desktop-beta">
        Install
      </Link>
    </>
  );

  const MobileLinks = () => (
    <>
      {ALL_LINKS.map(({ href, label, accent }) => (
        <Link
          key={href}
          href={href}
          onClick={close}
          className={`nav-sidebar-link${accent ? ` ${STACKED_ACCENT_CLASS[accent]}` : ''}`}
        >
          {label}
        </Link>
      ))}
      <Link href="/extension" onClick={close} className="nav-sidebar-link nav-sidebar-beta">
        Install the Extension
      </Link>
    </>
  );

  return (
    <>
      <div className={`nav-topbar${scrolled ? ' nav-topbar--scrolled' : ''}`}>
        {/* Logo */}
        <Link href="/" className="nav-logo" aria-label="TiltCheck home">
          <span className="nav-logo-icon">
            <img src="/icon.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} aria-hidden="true" />
          </span>
          <span className="nav-logo-text">TILTCHECK</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="nav-desktop-links" aria-label="Primary navigation">
          <DesktopLinks />
        </nav>

        {/* Desktop right actions */}
        <div className="nav-desktop-actions">
          <AuthButton />
        </div>

        {/* Mobile right cluster */}
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

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="nav-overlay" onClick={close} aria-hidden="true" />
      )}

      {/* Mobile menu panel */}
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
