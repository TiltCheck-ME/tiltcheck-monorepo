/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface DocsGateProps {
  children: React.ReactNode;
  isSensitive?: boolean;
}

/**
 * DocsGate
 * Enforces wallet-based gating for sensitive documentation.
 * Allows public access if isSensitive is false.
 */
export default function DocsGate({ children, isSensitive = false }: DocsGateProps) {
  const { isConnected } = useAccount();

  // If not sensitive, always show. 
  // If sensitive, only show if connected.
  if (!isSensitive || isConnected) {
    return <>{children}</>;
  }

  return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-[#283347] bg-black/40 animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col items-center">
        <div className="w-16 h-16 border-2 border-[#17c3b2] rounded-full flex items-center justify-center mb-4 relative">
            <span className="absolute inset-0 bg-[#17c3b2]/20 rounded-full animate-ping"></span>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#17c3b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">This part&apos;s invite-only.</h2>
        <p className="text-[#17c3b2] text-sm font-bold uppercase tracking-widest mt-1">Connect your wallet and we&apos;ll know you&apos;re one of us.</p>
      </div>

      <div className="max-w-md">
        <p className="text-gray-400 mb-8 italic">
          The technical docs, architecture notes, and runbooks live here. We keep them behind a wallet check
          to prevent scrapers and bots from treating our work like a buffet.
          If you&apos;re legit, this takes 10 seconds.
        </p>
      </div>

      <div className="scale-110">
        <ConnectButton label="Connect Wallet" />
      </div>
    </div>
  );
}
