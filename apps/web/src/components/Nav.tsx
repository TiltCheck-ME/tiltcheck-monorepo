'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import LiveStatusIndicator from './LiveStatusIndicator';

const Nav = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const NavLinks = () => (
    <>
      <Link href="/#tools" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold uppercase tracking-wider hover:text-[#17c3b2] transition-colors duration-200">Tools</Link>
      <Link href="/casinos" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold uppercase tracking-wider hover:text-[#17c3b2] transition-colors duration-200">Casinos</Link>
      <Link href="/bonuses" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold uppercase tracking-wider hover:text-[#17c3b2] transition-colors duration-200">Bonuses</Link>
      <Link href="/intel/rtp" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold uppercase tracking-wider hover:text-[#17c3b2] transition-colors duration-200">Nerf Radar</Link>
      <Link href="/blog" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold uppercase tracking-wider hover:text-[#17c3b2] transition-colors duration-200">Blog</Link>
      <Link href="/docs" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold uppercase tracking-wider hover:text-[#17c3b2] transition-colors duration-200">Docs</Link>
      <Link href="/extension" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold uppercase tracking-wider hover:text-[#17c3b2] transition-colors duration-200">Extension</Link>
      <Link href="/microgrant" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold uppercase tracking-wider hover:text-[#ef4444] text-gray-400 transition-colors duration-200">Recovery Fund</Link>
      <Link href="/beta-tester" onClick={() => setIsMenuOpen(false)} className="px-3 py-1 text-sm font-black uppercase tracking-widest rounded-full bg-[#17c3b2]/15 border border-[#17c3b2] text-[#17c3b2] hover:bg-[#17c3b2]/25 hover:shadow-[0_0_12px_rgba(23,195,178,0.4)] transition-all duration-200">Beta</Link>
    </>
  );

  return (
    <nav className="flex items-center justify-between w-full relative z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tighter hover:text-[color:var(--color-primary)] transition-colors">
          <img src="/icon.png" alt="TiltCheck Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <span className="hidden sm:inline">TILTCHECK</span>
        </Link>
        
        {/* Desktop Links */}
        <div className="nav-desktop-links items-center gap-4 text-sm font-medium uppercase tracking-widest" style={{ fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.1em' }}>
          <NavLinks />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="hidden sm:block">
            <LiveStatusIndicator />
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={toggleMenu}
          className="nav-mobile-toggle p-2 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10 transition-colors"
          aria-label="Toggle Menu"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[72px] bg-black/95 backdrop-blur-xl z-40 md:hidden animate-in fade-in duration-300">
          <div className="flex flex-col items-center justify-center h-full gap-8 p-8 text-2xl font-black uppercase tracking-[0.2em]">
            <NavLinks />
            <div className="mt-4">
              <LiveStatusIndicator />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Nav;
