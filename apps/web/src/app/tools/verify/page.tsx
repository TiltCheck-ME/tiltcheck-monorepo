"use client";

// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { auditSeedHealth } from '@tiltcheck/shared';
import { FairnessService } from '@tiltcheck/shared/fairness';
import type {
  SeedAuditAlgorithmReference,
  SeedAuditSingleBetVerificationInput,
  SeedAuditSingleBetVerificationResult,
} from '@tiltcheck/types';
import { extractSeedAuditSupportMetadata, summarizeSeedAuditResult } from '@/lib/seed-audit-surface';

const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
];

type VerifyMode = 'tiltcheck' | 'legacy';

const VERIFY_ALGORITHMS: Record<VerifyMode, SeedAuditAlgorithmReference> = {
  tiltcheck: {
    algorithmId: 'tiltcheck-4-key-hmac-sha256',
    name: 'TiltCheck 4-Key HMAC-SHA256',
    hashFamily: 'hmac-sha256',
    formulaVariant: 'external-entropy-client-seed-nonce',
  },
  legacy: {
    algorithmId: 'generic-server-seed-client-seed-nonce-hmac-sha256',
    name: 'Generic Server Seed + Client Seed + Nonce',
    hashFamily: 'hmac-sha256',
    formulaVariant: 'server-seed-client-seed-nonce',
  },
};

/**
 * VerifyPage
 * The manual bet verifier for raw provably fair verification.
 * Supports the TiltCheck 4-Key Lock and Legacy Server/Client Seed models.
 */
export default function VerifyPage() {
  const [mode, setMode] = useState<VerifyMode>('tiltcheck');
  
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
  const [auditResult, setAuditResult] = useState<SeedAuditSingleBetVerificationResult | null>(null);
  const [auditError, setAuditError] = useState('');

  // Blockhash fetcher state
  const [isFetchingHash, setIsFetchingHash] = useState(false);
  const [fetchHashError, setFetchHashError] = useState('');
  const [fetchedSlot, setFetchedSlot] = useState<number | null>(null);
  const [hashWasFetched, setHashWasFetched] = useState(false);

  const fairness = useMemo(() => new FairnessService(), []);
  const auditSummary = useMemo(() => (auditResult ? summarizeSeedAuditResult(auditResult) : null), [auditResult]);
  const auditSupport = useMemo(() => (auditResult ? extractSeedAuditSupportMetadata(auditResult) : null), [auditResult]);

  const buildVerificationInput = useCallback((): SeedAuditSingleBetVerificationInput | null => {
    if (mode === 'tiltcheck') {
      if (!solanaHash || !discordId || !clientSeed) {
        return null;
      }

      return {
        scope: 'single-bet',
        algorithm: VERIFY_ALGORITHMS.tiltcheck,
        context: {
          source: 'web',
          gameName: 'Verify Tool',
        },
        record: {
          externalEntropy: solanaHash,
          clientSeed,
          nonce,
          metadata: {
            discordId,
          },
        },
      };
    }

    if (!serverSeed || !clientSeed) {
      return null;
    }

    return {
      scope: 'single-bet',
      algorithm: VERIFY_ALGORITHMS.legacy,
      context: {
        source: 'web',
        gameName: 'Verify Tool',
      },
      record: {
        serverSeed,
        clientSeed,
        nonce,
      },
    };
  }, [clientSeed, discordId, mode, nonce, serverSeed, solanaHash]);

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
      setAuditError('');
      try {
        const verificationInput = buildVerificationInput();
        let hash = '';

        if (!verificationInput) {
          setResultHash('');
          setResultFloat(0);
          setAuditResult(null);
          return;
        }

        if (verificationInput?.algorithm.algorithmId === VERIFY_ALGORITHMS.tiltcheck.algorithmId) {
          hash = await fairness.generateHash(
            verificationInput.record.externalEntropy ?? '',
            String(verificationInput.record.metadata?.discordId ?? ''),
            verificationInput.record.clientSeed ?? '',
            verificationInput.record.nonce ?? 0,
          );
        } else if (verificationInput?.algorithm.algorithmId === VERIFY_ALGORITHMS.legacy.algorithmId) {
          hash = await fairness.verifyCasinoResult(
            verificationInput.record.serverSeed ?? '',
            verificationInput.record.clientSeed ?? '',
            verificationInput.record.nonce ?? 0,
          );
        }

        if (hash) {
          setResultHash(hash);
          setResultFloat(fairness.hashToFloat(hash));
          setAuditResult(await auditSeedHealth({
            ...verificationInput,
            record: {
              ...verificationInput.record,
              reportedHash: hash,
            },
          }));
        } else {
          setAuditResult(null);
        }
      } catch (err) {
        console.error('Fairness calculation failed:', err);
        setAuditResult(null);
        setAuditError('Seed health layer unavailable for this receipt.');
      } finally {
        setIsCalculating(false);
      }
    };

    calculate();
  }, [buildVerificationInput, fairness]);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 bg-[#0a0c10]">
      <header className="terminal-header w-full max-w-4xl mb-8">
        <div className="container mx-auto text-center font-mono">
            <h1 className="terminal-title" data-slang="VERIFY_OS">THE RECEIPT — Manual bet verification.</h1>
            <p className="terminal-subtitle text-[#17c3b2]">Raw provably fair math checker. Verify one bet. Do not confuse this with proof quality, seed hygiene, or full casino trust.</p>
        </div>
      </header>

      <section className="w-full max-w-4xl mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border border-[#283347] bg-black/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">What it does</p>
          <p className="mt-2 text-sm text-gray-400">Recomputes the outcome from the exact seeds, nonce, and public input for one bet.</p>
        </div>
        <div className="border border-[#283347] bg-black/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">What it does not do</p>
          <p className="mt-2 text-sm text-gray-400">It does not grade seed hygiene, proof quality, sample depth, or platform trust on its own.</p>
        </div>
        <div className="border border-[#283347] bg-black/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Where the rest lives</p>
          <p className="mt-2 text-sm text-gray-400">Use /casinos for licensing, payouts, scam flags, RTP evidence, and broader proof-quality framing.</p>
        </div>
      </section>

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
                    <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-2">Revealed Server Seed (Used for manual verification after reveal)</label>
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
                  Same boring math. No mystery layer. Just the raw receipt.
                </p>
             </div>
        </div>
      </div>

      <section className="mt-8 w-full max-w-4xl">
        <div className="border border-[#283347] bg-black/40 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Engine-backed distinction</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Same receipt. Broader proof-quality context.</h2>
              <p className="mt-3 max-w-2xl text-sm text-gray-400">
                The auditor can read this receipt too. One verified bet still stays a low-sample receipt, not a session-health verdict.
              </p>
            </div>
            <span className={`inline-flex items-center border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${
              auditSummary?.statusTone === 'live'
                ? 'border-[#17c3b2]/40 bg-[#17c3b2]/10 text-[#17c3b2]'
                : auditSummary?.statusTone === 'warning'
                  ? 'border-[#ffd700]/30 bg-[#ffd700]/10 text-[#ffd700]'
                  : 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]'
            }`}>
              {auditSummary?.categoryLabel ?? 'Waiting for inputs'}
            </span>
          </div>

          {auditError && (
            <p className="mt-4 text-sm text-[#ef4444]">{auditError}</p>
          )}

          {auditResult && auditSummary && auditSupport ? (
            <div className="mt-6 space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Proof-quality read</p>
                  <p className="mt-2 text-sm text-white">{auditResult.proofQuality.summary}</p>
                  <p className="mt-2 text-sm text-gray-400">{auditSummary.sampleSummary}</p>
                </div>
                <div className="border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Formula + continuity</p>
                  <p className="mt-2 text-sm text-white">{auditSummary.formulaSummary}</p>
                  <p className="mt-2 text-sm text-gray-400">{auditSummary.continuitySummary}</p>
                </div>
              </div>

              <div className="border border-[#283347] bg-black/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Support metadata</p>
                <p className="mt-2 text-sm text-white">{auditSupport.summary}</p>
                <p className="mt-2 text-[11px] font-mono text-gray-500">
                  {auditSupport.algorithmName} · {auditSupport.hashFamily} · {auditSupport.formulaVariant}
                </p>
                {auditSupport.requiredFields.length > 0 && (
                  <p className="mt-2 text-[11px] font-mono text-gray-500">
                    Needs: {auditSupport.requiredFields.join(' · ')}
                  </p>
                )}
              </div>

              <div className="border border-[#283347] bg-black/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Seed-health findings</p>
                {auditSummary.highlightedFindings.length > 0 ? (
                  <ul className="mt-3 space-y-3">
                    {auditSummary.highlightedFindings.map((finding) => (
                      <li key={`${finding.code}-${finding.summary}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
                          {finding.code.replace(/-/g, ' ')}
                        </p>
                        <p className="mt-2 text-sm text-white">{finding.summary}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-400">{auditSummary.findingSummary}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-400">
              Fill the receipt inputs to see the engine-backed proof-quality layer. It will stay low-confidence until you have a real ordered session export.
            </p>
          )}
        </div>
      </section>

      <footer className="mt-16 text-center max-w-2xl px-6">
        <div className="p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20">
          <h3 className="text-sm font-black text-[#17c3b2] uppercase tracking-widest mb-2 italic underline underline-offset-4">What this verifier actually proves</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-mono">
             It proves whether the disclosed inputs reproduce the published outcome for one bet. That is manual verification, not a full trust verdict.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed font-mono mt-3">
             Seed hygiene, proof quality, partial proof states, and insufficient-sample calls belong on the broader trust surfaces. This page stays the math checker.
          </p>
          <p className="text-[9px] text-gray-700 font-mono mt-3 uppercase tracking-wider">
            Blockhash sourced from Solana mainnet via <a href="https://solana.com/docs/rpc/http/getlatestblockhash" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline">getLatestBlockhash RPC</a>. Verify independently at <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline">solscan.io</a>.
          </p>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Made for Degens. By Degens.</p>
        </div>
      </footer>
    </main>
  );
}
