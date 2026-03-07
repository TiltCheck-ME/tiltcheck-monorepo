/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'TiltCheck - Built by a degen, for degens',
  description: 'Smart tools for casino communities. Scam detection, tipping, bonuses, tilt prevention, and trivia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0E0E0F] text-[#B8C4CE] font-sans antialiased">
        <nav className="bg-[#111316] border-b border-[#00FFC6]/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-2xl font-black font-space tracking-tight group">
                  <span className="bg-gradient-to-r from-[#00FFC6] to-[#00C2FF] bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                    TILTCHECK
                  </span>
                </Link>
                <div className="hidden md:flex items-center gap-6 text-sm font-semibold uppercase tracking-wider text-[#6B7280]">
                  <Link href="/qualify" className="hover:text-[#00FFC6] transition-colors">Earn</Link>
                  <Link href="/bonus" className="hover:text-[#00FFC6] transition-colors">Timers</Link>
                  <Link href="/wallet-check" className="hover:text-[#00FFC6] transition-colors">Security</Link>
                  <Link href="/safety" className="hover:text-[#00FFC6] transition-colors">Safety</Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link 
                  href="/justthetip" 
                  className="px-4 py-2 border border-[#00FFC6] text-[#00FFC6] rounded font-bold text-sm hover:bg-[#00FFC6]/10 transition-all"
                >
                  JUSTTHETIP
                </Link>
                <button className="px-5 py-2 bg-[#00FFC6] text-[#0E0E0F] rounded font-bold text-sm hover:opacity-90 transition-all">
                  JOIN DISCORD
                </button>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
