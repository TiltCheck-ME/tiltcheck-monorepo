"use client";

import React, { useState, useEffect } from 'react';
import LegalModal from '@/components/LegalModal';
import { LEGAL_DISCLAIMERS } from '@tiltcheck/shared/legal';

/**
 * JustTheTipPage
 * Implements the peer-to-peer tipping protocol with explicit fee transparency.
 * Enforces mandatory legal acceptance and fee acknowledgement.
 */
export default function JustTheTipPage() {
  const [showLegal, setShowLegal] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [feeAcknowledged, setFeeAcknowledged] = useState(false);

  useEffect(() => {
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
        title="TIPPING PROTOCOL COMPLIANCE"
      />

      <header className="tool-header terminal-header w-full max-w-4xl">
        <div className="container mx-auto text-center">
          <h1 className="terminal-title" data-slang="TIP_OS">Tip v1.8.2 // JUSTTHETIP</h1>
          <p className="terminal-subtitle text-[#17c3b2]">P2P Non-Custodial Tipping Layer</p>
        </div>
      </header>

      <div className="w-full max-w-2xl mx-auto mt-8">
        {!hasAccepted ? (
          <div className="p-12 border-2 border-dashed border-[#283347] text-center bg-black/20">
            <span className="text-4xl mb-4 block">💸</span>
            <h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest">
              Legal Authorization Required
            </h2>
            <button 
              onClick={() => setShowLegal(true)}
              className="mt-6 text-[#17c3b2] underline hover:text-[#48d5c6] font-bold uppercase tracking-tighter"
            >
              Expose Disclaimers
            </button>
          </div>
        ) : (
          <div className="terminal-box border-[#d946ef] animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="terminal-prompt">
                <span className="prompt-prefix">$</span>
                <span className="prompt-text">READY FOR P2P DISBURSEMENT...</span>
             </div>
             
             <div className="mt-6 space-y-6">
                <div className="p-4 bg-[#ff3366]/10 border border-[#ff3366]/40 text-[#ff3366]">
                    <span className="font-bold uppercase text-xs block mb-1">Fee Disclosure</span>
                    <p className="text-sm font-mono">
                       {LEGAL_DISCLAIMERS.FEE_DISCLOSURE}
                    </p>
                </div>

                <div className="space-y-4">
                    <label className="block">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recipient Discord ID / Wallet</span>
                        <input type="text" placeholder="e.g. 123456789 or 5Z9..." className="w-full bg-black border border-[#283347] p-3 mt-1 text-white font-mono focus:border-[#17c3b2] outline-none" />
                    </label>

                    <label className="block">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Amount (SOL)</span>
                        <input type="number" placeholder="0.05" className="w-full bg-black border border-[#283347] p-3 mt-1 text-white font-mono focus:border-[#17c3b2] outline-none" />
                    </label>
                </div>

                <div className="pt-4 border-t border-[#283347]">
                   <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={feeAcknowledged}
                        onChange={(e) => setFeeAcknowledged(e.target.checked)}
                        className="w-5 h-5 accent-[#d946ef]" 
                      />
                      <span className="text-xs text-gray-400 font-bold group-hover:text-white transition-colors">
                         I acknowledge the $0.07 processing fee and non-custodial risk.
                      </span>
                   </label>
                </div>

                <button 
                  disabled={!feeAcknowledged}
                  className={`btn w-full py-4 text-lg font-black tracking-widest uppercase ${
                    feeAcknowledged 
                    ? 'bg-[#d946ef] text-white hover:bg-[#f062ff] hover:shadow-[4px_4px_0_#17c3b2]' 
                    : 'bg-[#141922] text-gray-600 border border-[#283347] cursor-not-allowed opacity-50'
                  }`}
                >
                  SEND TIP VIA SOLANA
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Compliance Indicator */}
      {hasAccepted && (
        <div className="mt-8 flex items-center gap-2">
            <span className="text-[10px] text-gray-600 font-mono tracking-widest">
                VERIFIED TRANSACTION CONTEXT // [NJ-B-A3454 COMPLIANT]
            </span>
        </div>
      )}
    </main>
  );
}
