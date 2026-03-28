'use client';
import React from 'react';
import Link from 'next/link';
import LiveStatusIndicator from './LiveStatusIndicator';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Nav = () => {
  const { isConnected } = useAccount();

  return (
    <nav className="flex items-center justify-between w-full">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-bold text-lg">
          TILTCHECK
        </Link>
        <div className="hidden md:flex items-center gap-4 text-sm">
          {!isConnected ? (
            <>
              <Link href="/features" className="hover:text-[color:var(--color-primary)] transition-colors">Features</Link>
              <Link href="/blog" className="hover:text-[color:var(--color-primary)] transition-colors">Blog</Link>
              <Link href="/casinos" className="hover:text-[color:var(--color-primary)] transition-colors">Casinos</Link>
              <Link href="/settings" className="hover:text-[color:var(--color-primary)] transition-colors">Settings</Link>
              <Link href="#faq" className="hover:text-[color:var(--color-primary)] transition-colors">FAQ</Link>
              <Link href="/extension" className="hover:text-[color:var(--color-primary)] transition-colors">Extension</Link>
            </>
          ) : (
            <>
              <Link href="/audit" className="hover:text-[color:var(--color-primary)] transition-colors">Audit</Link>
              <Link href="/casinos" className="hover:text-[color:var(--color-primary)] transition-colors">Casinos</Link>
              <Link href="/vault" className="hover:text-[color:var(--color-primary)] transition-colors">Vault</Link>
              <Link href="/buddies" className="hover:text-[color:var(--color-primary)] transition-colors">Buddies</Link>
              <Link href="https://hub.tiltcheck.me" className="hover:text-[color:var(--color-primary)] transition-colors text-[color:var(--color-primary)] font-bold">[DASHBOARD]</Link>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
            <LiveStatusIndicator />
        </div>
        <ConnectButton label="DEGEN LOGIN" />
      </div>
    </nav>
  );
};

export default Nav;
