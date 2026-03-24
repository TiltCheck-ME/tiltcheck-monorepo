"use client";

import React, { useState, useEffect } from 'react';
import { FairnessService } from '@tiltcheck/shared/fairness';

/**
 * VerifyPage
 * The "Check My Bet" tool for independent provably fair verification.
 * Supports the TiltCheck 4-Key Lock and Legacy Server/Client Seed models.
 */
export default function VerifyPage() {
  const [mode, setMode] = useState<'tiltcheck' | 'legacy'>('tiltcheck');
  
  // TiltCheck 4-Key Inputs
  const [solanaHash, setSolanaHash] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState(0);

  // Legacy Inputs
  const [serverSeed, setServerSeed] = useState('');
  
  // Results
  const [resultHash, setResultHash] = useState('');
  const [resultFloat, setResultFloat] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const fairness = new FairnessService();

  useEffect(() => {
    const calculate = async () => {
      setIsCalculating(true);
      try {
        let hash = '';
        if (mode === 'tiltcheck') {
          if (solanaHash && discordId && clientSeed) {
            hash = await fairness.generateHash(solanaHash, discordId, clientSeed, nonce);
          }
        } else {
          if (serverSeed && clientSeed) {
            hash = await fairness.verifyCasinoResult(serverSeed, clientSeed, nonce);
          }
        }

        if (hash) {
          setResultHash(hash);
          setResultFloat(fairness.hashToFloat(hash));
        }
      } catch (err) {
        console.error('Fairness calculation failed:', err);
      } finally {
        setIsCalculating(false);
      }
    };

    calculate();
  }, [mode, solanaHash, discordId, clientSeed, nonce, serverSeed]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 bg-[#0a0c10]">
      <header className="terminal-header w-full max-w-4xl mb-8">
        <div className="container mx-auto text-center font-mono">
            <h1 className="terminal-title" data-slang="VERIFY_OS">Verify v1.0.4 // CHECK_YOURSELF</h1>
            <p className="terminal-subtitle text-[#17c3b2]">Independent Auditing UI</p>
        </div>
      </header>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="terminal-box border-[#283347] p-6 bg-black/40">
           <div className="flex gap-4 mb-8">
             <button 
                onClick={() => setMode('tiltcheck')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 transition-all ${
                    mode === 'tiltcheck' ? 'bg-[#17c3b2] text-black border-[#17c3b2]' : 'border-[#283347] text-gray-500 hover:border-[#17c3b2]'
                }`}
             >
                TiltCheck 4-Key
             </button>
             <button 
                onClick={() => setMode('legacy')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 transition-all ${
                    mode === 'legacy' ? 'bg-[#d946ef] text-black border-[#d946ef]' : 'border-[#283347] text-gray-500 hover:border-[#d946ef]'
                }`}
             >
                Legacy Mode
             </button>
           </div>

           <div className="space-y-6">
             {mode === 'tiltcheck' ? (
               <>
                <div>
                   <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Solana Block Hash (Platform Salt)</label>
                   <input 
                     value={solanaHash}
                     onChange={(e) => setSolanaHash(e.target.value)}
                     placeholder="Enter Solana Block Hash..."
                     className="w-full bg-black border border-[#283347] p-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
                   />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Discord Identity (User ID)</label>
                   <input 
                     value={discordId}
                     onChange={(e) => setDiscordId(e.target.value)}
                     placeholder="e.g. 248912384..."
                     className="w-full bg-black border border-[#283347] p-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
                   />
                </div>
               </>
             ) : (
                <div>
                   <label className="text-[10px] font-bold text-[#d946ef] uppercase tracking-[0.2em] block mb-2">Server Seed (Raw Hex)</label>
                   <input 
                     value={serverSeed}
                     onChange={(e) => setServerSeed(e.target.value)}
                     placeholder="Enter revealed Server Seed..."
                     className="w-full bg-black border border-[#283347] p-3 text-white font-mono text-sm focus:border-[#d946ef] outline-none"
                   />
                </div>
             )}

             <div>
                <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Client Seed</label>
                <input 
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  placeholder="The user-defined seed..."
                  className="w-full bg-black border border-[#283347] p-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
                />
             </div>

             <div>
                <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Nonce (Counter)</label>
                <input 
                  type="number"
                  value={nonce}
                  onChange={(e) => setNonce(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-[#283347] p-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
                />
             </div>
           </div>
        </div>

        {/* Output Section */}
        <div className="terminal-box border-[#17c3b2] p-8 bg-black/60 relative overflow-hidden flex flex-col justify-between">
            <div className={`absolute inset-0 bg-[#17c3b2]/5 pointer-events-none transition-opacity ${isCalculating ? 'opacity-100' : 'opacity-0'}`}></div>
            
            <div>
               <div className="flex items-center gap-2 mb-6">
                 <span className="w-2 h-2 bg-[#17c3b2] rounded-full animate-pulse"></span>
                 <h2 className="text-xl font-black tracking-tighter text-white uppercase italic">LIVE VERIFICATION</h2>
               </div>

               <div className="space-y-8">
                  <div className="bg-black/80 border border-[#283347] p-4">
                     <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">HMAC-SHA256 Sig</span>
                     <code className="text-xs break-all text-[#17c3b2] font-mono leading-relaxed">
                        {resultHash || 'Awaiting Valid Input Configuration...'}
                     </code>
                  </div>

                  <div className="space-y-2">
                     <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Normalized Float</span>
                        <span className="text-lg font-mono text-white">{(resultFloat).toFixed(8)}</span>
                     </div>
                     <div className="h-2 w-full bg-black/40 border border-[#283347] relative">
                        <div 
                          className="absolute h-full bg-[#17c3b2] transition-all duration-500 shadow-[0_0_10px_rgba(23,195,178,0.5)]" 
                          style={{ width: `${resultFloat * 100}%` }}
                        ></div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-black/40 border border-[#283347] text-center">
                         <span className="text-[10px] font-bold text-[#d946ef] uppercase block mb-1">Dice (0-100)</span>
                         <span className="text-2xl font-black text-white">{fairness.getDiceResult(resultFloat).toFixed(2)}</span>
                     </div>
                     <div className="p-4 bg-black/40 border border-[#283347] text-center">
                         <span className="text-[10px] font-bold text-[#8b5cf6] uppercase block mb-1">Limbo / Crash</span>
                         <span className="text-2xl font-black text-white">{fairness.getLimboResult(resultFloat).toFixed(2)}x</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#283347] text-center">
               <p className="text-[10px] text-gray-600 font-medium uppercase tracking-widest italic">
                  Results are verified against the standard HMAC-SHA256 normalizers used by major crypto platforms.
               </p>
            </div>
        </div>
      </div>

      <footer className="mt-16 text-center max-w-2xl px-6">
        <div className="p-6 bg-[#d946ef]/5 border border-[#d946ef]/20">
          <h3 className="text-sm font-black text-[#d946ef] uppercase tracking-widest mb-2 italic underline underline-offset-4">Why use the 4-Key Lock?</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-mono">
             Legacy verification relies on a revealed Server Seed—meaning you can only check fairness AFTER the session ends. 
             TiltCheck&apos;s 4-Key model uses <span className="text-white">Solana Block Hashes</span> as live, immutable entropy, allowing you to lock in a commitment BEFORE you see the result.
          </p>
        </div>
      </footer>
    </main>
  );
}
