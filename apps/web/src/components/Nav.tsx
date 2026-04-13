// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import LiveStatusIndicator from './LiveStatusIndicator';
import { useAuth } from '../hooks/useAuth';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:6001';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me';

const NAV_LINKS: Array<{ href: string; label: string; accent?: string }> = [
  { href: '/#tools',     label: 'Tools' },
  { href: '/casinos',    label: 'Casinos' },
  { href: '/bonuses',    label: 'Bonuses' },
  { href: '/intel/rtp',  label: 'Nerf Radar' },
  { href: '/blog',       label: 'Blog' },
  { href: '/docs',       label: 'Docs' },
  { href: '/extension',  label: 'Extension' },
  { href: '/collab',     label: 'Contact',        accent: 'purple' },
];

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
  const { user, loading } = useAuth();
  const close = () => setIsOpen(false);

  const AuthButton = ({ compact }: { compact?: boolean }) => {
    if (loading) return null;
    if (user) {
      return (
        <a href={DASHBOARD_URL} onClick={close} className={compact ? 'nav-auth-compact nav-auth-user' : 'nav-auth-full nav-auth-user'}>
          {user.discordUsername}
        </a>
      );
    }
    return (
      <a
        href={`${API_URL}/auth/discord/login?redirect=${encodeURIComponent(DASHBOARD_URL)}`}
        onClick={close}
        className={compact ? 'nav-auth-compact nav-auth-discord' : 'nav-auth-full nav-auth-discord'}
      >
        {compact ? 'Login' : 'Login with Discord'}
      </a>
    );
  };

  const Links = ({ variant = 'stacked' }: { variant?: 'stacked' | 'desktop' }) => (
    <>
      {NAV_LINKS.map(({ href, label, accent }) => (
        <Link
          key={href}
          href={href}
          onClick={close}
          className={
            variant === 'desktop'
              ? `nav-desktop-link${accent ? ` ${DESKTOP_ACCENT_CLASS[accent]}` : ''}`
              : `nav-sidebar-link${accent ? ` ${STACKED_ACCENT_CLASS[accent]}` : ''}`
          }
        >
          {label}
        </Link>
      ))}
      <Link
        href="/beta-tester"
        onClick={close}
        className={variant === 'desktop' ? 'nav-desktop-link nav-desktop-beta' : 'nav-sidebar-link nav-sidebar-beta'}
      >
        Beta
      </Link>
    </>
  );

  return (
    <>
      <div className="nav-topbar">
        <Link href="/" className="nav-logo">
          <img src="/icon.png" alt="TiltCheck" width={28} height={28} style={{ objectFit: 'contain' }} />
          <span>TILTCHECK</span>
        </Link>

        <nav className="nav-desktop-links" aria-label="Primary navigation">
          <Links variant="desktop" />
        </nav>

        <div className="nav-desktop-actions">
          <LiveStatusIndicator />
          <AuthButton />
        </div>

        <div className="nav-topbar-right">
          <LiveStatusIndicator />
          <AuthButton compact />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="nav-hamburger"
            aria-label="Toggle navigation"
            aria-controls="site-mobile-nav"
            aria-expanded={isOpen}
          >
            {isOpen
              ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>
      </div>

      {isOpen && (
        <div id="site-mobile-nav" className="nav-collapse" aria-label="Navigation menu">
          <nav className="nav-collapse-links">
            <Links variant="stacked" />
          </nav>
          <div className="nav-collapse-foot">
            <LiveStatusIndicator />
            <AuthButton />
          </div>
        </div>
      )}
    </>
  );
};

export default Nav;
