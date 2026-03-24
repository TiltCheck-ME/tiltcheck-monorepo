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
          <h1 className="terminal-title" data-slang="VAULT_OS">Vault v2.4.0 // LOCKVAULT</h1>
          <p className="terminal-subtitle text-[#d946ef]">Non-Custodial Capital Protection</p>
        </div>
      </header>

      <div className="w-full max-w-4xl mx-auto mt-8">
        {!hasAccepted ? (
          <div className="p-12 border-2 border-dashed border-[#283347] text-center bg-black/20">
            <span className="text-4xl mb-4 block">🔒</span>
            <h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest">
              Legal Authorization Required
            </h2>
            <p className="text-gray-600 mt-2 max-w-md mx-auto">
              Please review and accept the mandatory risk disclosures to enable the LockVault interface.
            </p>
            <button 
              onClick={() => setShowLegal(true)}
              className="mt-6 text-[#17c3b2] underline hover:text-[#48d5c6] font-bold uppercase tracking-tighter"
            >
              Expose Disclaimers
            </button>
          </div>
        ) : (
          <div className="terminal-box border-[#17c3b2] animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="terminal-prompt">
                <span className="prompt-prefix">$</span>
                <span className="prompt-text">INITIALIZING NON-CUSTODIAL VAULT...</span>
             </div>
             
             <div className="p-8 text-center">
                <p className="text-[#17c3b2] mb-4">Vault Engine Active. Monitoring live Solana block hashes for profit triggers.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="p-4 border border-[#283347] bg-black/40 text-left">
                        <span className="text-xs text-[#d946ef] font-bold uppercase block mb-1">Status</span>
                        <span className="font-mono">STANDBY — READY TO LOCK</span>
                    </div>
                    <div className="p-4 border border-[#283347] bg-black/40 text-left">
                        <span className="text-xs text-[#d946ef] font-bold uppercase block mb-1">Fee Tier</span>
                        <span className="font-mono">ELITE (1% CAP)</span>
                    </div>
                </div>
                
                <p className="mt-12 text-gray-500 italic text-sm">
                   Configure your auto-vault thresholds in the extension or dashboard settings.
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
            REGULATORY COMPLIANCE ACTIVE // ZERO SECRETS STORED
          </span>
        </div>
      )}
    </main>
  );
}
