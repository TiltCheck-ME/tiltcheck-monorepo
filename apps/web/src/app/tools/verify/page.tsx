"use client";

// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
import React, { useState, useEffect, useCallback } from 'react';
import { FairnessService } from '@tiltcheck/shared/fairness';

const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
];

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

  // Blockhash fetcher state
  const [isFetchingHash, setIsFetchingHash] = useState(false);
  const [fetchHashError, setFetchHashError] = useState('');
  const [fetchedSlot, setFetchedSlot] = useState<number | null>(null);
  const [hashWasFetched, setHashWasFetched] = useState(false);

  const fairness = new FairnessService();

  const fetchLatestBlockhash = useCallback(async () => {
    setIsFetchingHash(true);
    setFetchHashError('');
    setHashWasFetched(false);

    for (const endpoint of SOLANA_RPC_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getLatestBlockhash',
            params: [{ commitment: 'finalized' }],
          }),
        });
        const data = await res.json() as {
          result?: { value?: { blockhash?: string }; context?: { slot?: number } };
        };
        if (data?.result?.value?.blockhash) {
          setSolanaHash(data.result.value.blockhash);
          setFetchedSlot(data.result.context?.slot ?? null);
          setHashWasFetched(true);
          setIsFetchingHash(false);
          return;
        }
      } catch {
        // try next endpoint
      }
    }

    setFetchHashError('RPC unavailable. Paste manually from solscan.io.');
    setIsFetchingHash(false);
  }, []);

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
            <h1 className="terminal-title" data-slang="VERIFY_OS">THE RECEIPT — Prove they&apos;re not screwing you.</h1>
            <p className="terminal-subtitle text-[#17c3b2]">Because &quot;provably fair&quot; is just a marketing term until you check the math yourself.</p>
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
                    mode === 'legacy' ? 'bg-[#17c3b2] text-black border-[#17c3b2]' : 'border-[#283347] text-gray-500 hover:border-[#17c3b2]'
                }`}
             >
                Legacy Mode
             </button>
           </div>

           <div className="space-y-6">
             {mode === 'tiltcheck' ? (
               <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em]">
                      Solana Block Hash (The Casino&apos;s Public Fingerprint)
                    </label>
                    <button
                      onClick={fetchLatestBlockhash}
                      disabled={isFetchingHash}
                      className="text-[9px] font-black uppercase tracking-widest border border-[#17c3b2] text-[#17c3b2] px-3 min-h-[44px] hover:bg-[#17c3b2]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap ml-2"
                    >
                      {isFetchingHash ? '[FETCHING...]' : '[GRAB LATEST]'}
                    </button>
                  </div>
                   <input 
                     value={solanaHash}
                     onChange={(e) => { setSolanaHash(e.target.value); setHashWasFetched(false); setFetchedSlot(null); }}
                     placeholder="Paste a Solana block hash or hit [GRAB LATEST]..."
                     aria-label="Solana Block Hash"
                     className="w-full bg-black border border-[#283347] p-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
                   />
                   {fetchHashError && (
                     <p className="mt-1 text-[9px] font-mono text-[#ef4444] uppercase tracking-wider">{fetchHashError}</p>
                   )}
                   {solanaHash && (
                     <div className="mt-2 flex items-center justify-between">
                       <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">
                         {hashWasFetched && fetchedSlot ? `SLOT: ${fetchedSlot.toLocaleString()}` : 'MANUALLY ENTERED'}
                       </span>
                       <a
                         href={
                           fetchedSlot
                             ? `https://solscan.io/block/${fetchedSlot}`
                             : `https://solscan.io/?q=${encodeURIComponent(solanaHash)}`
                         }
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-[9px] font-mono text-[#17c3b2] hover:underline uppercase tracking-widest"
                       >
                         [VERIFY ON SOLSCAN]
                       </a>
                     </div>
                   )}
                </div>
                <div>
                   <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Your Discord ID (Your Fingerprint)</label>
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
                   <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Revealed Server Seed (The one they give you AFTER they&apos;ve taken your money)</label>
                   <input 
                     value={serverSeed}
                     onChange={(e) => setServerSeed(e.target.value)}
                     placeholder="Enter revealed Server Seed..."
                     className="w-full bg-black border border-[#283347] p-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
                   />
                </div>
             )}

             <div>
                <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Your Client Seed (The one part you control)</label>
                <input 
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  placeholder="Whatever you typed in before you started."
                  className="w-full bg-black border border-[#283347] p-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
                />
             </div>

             <div>
                <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Nonce (The number of bets you&apos;ve made)</label>
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
                        {resultHash || 'Feed me the seeds...'}
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
                         <span className="text-[10px] font-bold text-[#17c3b2] uppercase block mb-1">Dice (0-100)</span>
                         <span className="text-2xl font-black text-white">{fairness.getDiceResult(resultFloat).toFixed(2)}</span>
                     </div>
                     <div className="p-4 bg-black/40 border border-[#283347] text-center">
                         <span className="text-[10px] font-bold text-[#17c3b2] uppercase block mb-1">Limbo / Crash</span>
                         <span className="text-2xl font-black text-white">{fairness.getLimboResult(resultFloat).toFixed(2)}x</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#283347] text-center">
               <p className="text-[10px] text-gray-600 font-medium uppercase tracking-widest italic">
                  We use the same boring math as everyone else. The only difference is we&apos;re showing it to you.
               </p>
            </div>
        </div>
      </div>

      <footer className="mt-16 text-center max-w-2xl px-6">
        <div className="p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20">
          <h3 className="text-sm font-black text-[#17c3b2] uppercase tracking-widest mb-2 italic underline underline-offset-4">Why is the old way dumb?</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-mono">
             Because checking the math after you&apos;ve already lost is just masochism. The old way lets you confirm you got screwed. Our way uses live Solana block hashes so you can prove they&apos;re <span className="text-white">not</span> screwing you, <span className="text-white">before</span> you click.
          </p>
          <p className="text-[9px] text-gray-700 font-mono mt-3 uppercase tracking-wider">
            Blockhash sourced from Solana mainnet via <a href="https://solana.com/docs/rpc/http/getlatestblockhash" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline">getLatestBlockhash RPC</a>. Verify independently at <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline">solscan.io</a>.
          </p>
        </div>
      </footer>
    </main>
  );
}
