/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
"use client";

import React, { useState, useEffect } from 'react';
import LegalModal from '@/components/LegalModal';

/**
 * AutoVaultPage
 * Implements the non-custodial capital protection interface.
 * Enforces mandatory legal acceptance before displaying configuration.
 */
export default function AutoVaultPage() {
  const [showLegal, setShowLegal] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  useEffect(() => {
    // Check if user has already accepted legal terms in this session
    const consent = localStorage.getItem('tiltcheck_legal_consent');
    if (!consent) {
      setShowLegal(true);
    } else {
      setHasAccepted(true);
    }
  }, []);

  const handleLegalAccept = () => {
    localStorage.setItem('tiltcheck_legal_consent', 'true');
    setShowLegal(false);
    setHasAccepted(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 bg-[#0a0c10]">
      <LegalModal 
        isOpen={showLegal} 
        onAccept={handleLegalAccept} 
        title="VAULT DEPLOYMENT COMPLIANCE"
      />

      <header className="tool-header terminal-header w-full max-w-4xl">
        <div className="container mx-auto text-center">
          <h1 className="terminal-title" data-slang="VAULT_OS">LockVault // The Digital Piggy Bank</h1>
          <p className="terminal-subtitle text-[#17c3b2]">This is where your profits go to hide from your bad decisions. Automatically.</p>
        </div>
      </header>

      <div className="w-full max-w-4xl mx-auto mt-8">
        {!hasAccepted ? (
          <div className="p-12 border-2 border-dashed border-[#283347] text-center bg-black/20">
            <h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest">
              REGULATORY DISCLOSURE REQUIRED
            </h2>
            <p className="text-gray-600 mt-2 max-w-md mx-auto">
              You need to agree that you understand how this works before you can use it. It&apos;s for your own good. And ours.
            </p>
            <button 
              onClick={() => setShowLegal(true)}
              className="mt-6 text-[#17c3b2] underline hover:text-[#48d5c6] font-bold uppercase tracking-tighter"
            >
              Get it Over With
            </button>
          </div>
        ) : (
          <div className="terminal-box border-[#17c3b2] animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="terminal-prompt">
                <span className="prompt-prefix">$</span>
                <span className="prompt-text">Vault initialized. TiltCheck is non-custodial. We do not hold keys.</span>
             </div>
             
             <div className="p-8 text-center">
                <p className="text-[#17c3b2] mb-4">Alright, we&apos;re watching. When you hit a profit trigger, we&apos;ll automatically move the money here.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="p-4 border border-[#283347] bg-black/40 text-left">
                        <span className="text-xs text-[#17c3b2] font-bold uppercase block mb-1">Current Mood</span>
                        <span className="font-mono">WAITING FOR YOU TO ACTUALLY WIN SOMETHING</span>
                    </div>
                    <div className="p-4 border border-[#283347] bg-black/40 text-left">
                        <span className="text-xs text-[#17c3b2] font-bold uppercase block mb-1">Our Cut</span>
                        <span className="font-mono">ELITE (1% CAP)</span>
                    </div>
                </div>
                
                <p className="mt-12 text-gray-500 italic text-sm">
                   Go to your dashboard if you want to change when and how much this thing grabs. Or don&apos;t. Your call.
                </p>
             </div>
          </div>
        )}
      </div>

      {/* Compliance Badge */}
      {hasAccepted && (
        <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-[#17c3b2]/10 border border-[#17c3b2]/30 rounded-full">
          <span className="w-2 h-2 bg-[#17c3b2] rounded-full animate-pulse"></span>
          <span className="text-[10px] text-[#17c3b2] font-black uppercase tracking-widest">
            WE&apos;RE NOT HOLDING YOUR BAGS // ZERO SECRETS STORED
          </span>
        </div>
      )}
    </main>
  );
}
