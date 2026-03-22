'use client';
import React from 'react';
import Link from 'next/link';
import LiveStatusIndicator from './LiveStatusIndicator';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Nav = () => {
  return (
    <nav className="flex items-center justify-between w-full">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-bold text-lg">
          TILTCHECK
        </Link>
        <div className="hidden md:flex items-center gap-4 text-sm">
          <Link href="#tools" className="hover:text-[color:var(--color-primary)] transition-colors">Tools</Link>
          <Link href="/extension" className="hover:text-[color:var(--color-primary)] transition-colors">Extension</Link>
          <Link href="#faq" className="hover:text-[color:var(--color-primary)] transition-colors">FAQ</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
            <LiveStatusIndicator />
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
};

export default Nav;
