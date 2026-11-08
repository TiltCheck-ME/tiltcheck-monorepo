// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ToolPageHeader from '@/components/ToolPageHeader';
import Link from 'next/link';
import { auditSeedHealth, ClientSeedManager, evaluateSeedHygiene, calculateSeedEntropy } from '@tiltcheck/shared';
import { FairnessService } from '@tiltcheck/shared/fairness';
import type {
  ClientSeedFormat,
  ClientSeedMetadata,
  ClientSeedRotationHistoryEntry,
  SeedAuditAlgorithmReference,
  SeedAuditSingleBetVerificationInput,
  SeedAuditSingleBetVerificationResult,
} from '@tiltcheck/types';
import { extractSeedAuditSupportMetadata, summarizeSeedAuditResult } from '@/lib/seed-audit-surface';
import {
  computeProvablyFair,
  computeSha256,
  PROVABLY_FAIR_PRESETS,
  verifyServerSeedHash,
  type ProvablyFairPreset,
  type ProvablyFairResult,
} from '@/lib/provably-fair';

const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
];

type VerifyMode = 'casino' | 'tiltcheck';

const VERIFY_ALGORITHMS: Record<VerifyMode, SeedAuditAlgorithmReference> = {
  tiltcheck: {
    algorithmId: 'tiltcheck-4-key-hmac-sha256',
    name: 'TiltCheck 4-Key HMAC-SHA256',
    hashFamily: 'hmac-sha256',
    formulaVariant: 'external-entropy-client-seed-nonce',
  },
  casino: {
    algorithmId: 'generic-server-seed-client-seed-nonce-hmac-sha256',
    name: 'Generic Server Seed + Client Seed + Nonce',
    hashFamily: 'hmac-sha256',
    formulaVariant: 'server-seed-client-seed-nonce',
  },
};

/**
 * VerifyPage
 * Interactive client-side Provably Fair HMAC-SHA256 Bet Verifier.
 * Supports standard casino seeds (Stake, Roobet, BC.Game) and TiltCheck 4-Key Solana entropy.
 */
export default function VerifyPage() {
  const [mode, setMode] = useState<VerifyMode>('casino');

  // Casino Standard Inputs
  const [serverSeed, setServerSeed] = useState(PROVABLY_FAIR_PRESETS[0].serverSeed);
  const [committedHash, setCommittedHash] = useState(PROVABLY_FAIR_PRESETS[0].committedHash);
  const [clientSeed, setClientSeed] = useState(PROVABLY_FAIR_PRESETS[0].clientSeed);
  const [nonce, setNonce] = useState(PROVABLY_FAIR_PRESETS[0].nonce);
  const [houseEdge, setHouseEdge] = useState(1.0);

  // TiltCheck 4-Key Inputs
  const [solanaHash, setSolanaHash] = useState('');
  const [discordId, setDiscordId] = useState('');

  // Results & UI State
  const [copiedHash, setCopiedHash] = useState(false);
  const [auditResult, setAuditResult] = useState<SeedAuditSingleBetVerificationResult | null>(null);
  const [auditError, setAuditError] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  // Solana Blockhash Fetcher State
  const [isFetchingHash, setIsFetchingHash] = useState(false);
  const [fetchHashError, setFetchHashError] = useState('');
  const [fetchedSlot, setFetchedSlot] = useState<number | null>(null);
  const [hashWasFetched, setHashWasFetched] = useState(false);

  const fairness = useMemo(() => new FairnessService(), []);

  // Seed Manager States (Issue #539)
  const seedManager = useMemo(() => new ClientSeedManager({ defaultSite: 'stake' }), []);
  const [selectedSeedSite, setSelectedSeedSite] = useState<'stake' | 'bcgame' | 'roobet' | 'shuffle' | 'default'>('stake');
  const [seedFormat, setSeedFormat] = useState<ClientSeedFormat>('alphanumeric');
  const [siteSeedMeta, setSiteSeedMeta] = useState<ClientSeedMetadata | null>(null);
  const [siteSeedHistory, setSiteSeedHistory] = useState<ClientSeedRotationHistoryEntry[]>([]);
  const [showSeedHistory, setShowSeedHistory] = useState(false);
  const [copiedSeedToast, setCopiedSeedToast] = useState(false);

  useEffect(() => {
    let isMounted = true;
    seedManager.getActiveSeed(selectedSeedSite).then((meta) => {
      if (isMounted) setSiteSeedMeta(meta);
    });
    seedManager.getHistory(selectedSeedSite).then((hist) => {
      if (isMounted) setSiteSeedHistory(hist);
    });
    return () => {
      isMounted = false;
    };
  }, [seedManager, selectedSeedSite]);

  const activeInputHygiene = useMemo(() => {
    return evaluateSeedHygiene(clientSeed);
  }, [clientSeed]);

  const handleRotateSiteSeed = async () => {
    const len = seedFormat === 'hex' ? 64 : 32;
    const { newSeed } = await seedManager.rotateSeed(selectedSeedSite, {
      format: seedFormat,
      length: len,
      reason: 'manual-rotation',
    });
    setSiteSeedMeta(newSeed);
    setClientSeed(newSeed.seed);
    const hist = await seedManager.getHistory(selectedSeedSite);
    setSiteSeedHistory(hist);
  };

  const handleCopySiteSeed = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSeedToast(true);
      setTimeout(() => setCopiedSeedToast(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Compute Provably Fair math client-side
  const pfResult: ProvablyFairResult | null = useMemo(() => {
    if (mode === 'casino') {
      if (!serverSeed.trim() || !clientSeed.trim()) return null;
      try {
        return computeProvablyFair(serverSeed.trim(), clientSeed.trim(), nonce, {
          committedHash: committedHash.trim(),
          houseEdgePercent: houseEdge,
        });
      } catch {
        return null;
      }
    } else {
      // TiltCheck mode: derive hash using FairnessService
      if (!solanaHash.trim() || !discordId.trim() || !clientSeed.trim()) return null;
      try {
        const compositeKey = solanaHash.trim();
        const compositeMessage = `${discordId.trim()}${clientSeed.trim()}:${nonce}`;
        const outcome = computeProvablyFair(compositeKey, compositeMessage, nonce, {
          houseEdgePercent: houseEdge,
        });
        return outcome;
      } catch {
        return null;
      }
    }
  }, [mode, serverSeed, clientSeed, nonce, committedHash, houseEdge, solanaHash, discordId]);

  // Pre-commitment audit
  const preCommitmentStatus = useMemo(() => {
    if (mode !== 'casino') return null;
    return verifyServerSeedHash(serverSeed, committedHash);
  }, [mode, serverSeed, committedHash]);

  const auditSummary = useMemo(() => (auditResult ? summarizeSeedAuditResult(auditResult) : null), [auditResult]);
  const auditSupport = useMemo(() => (auditResult ? extractSeedAuditSupportMetadata(auditResult) : null), [auditResult]);

  const loadPreset = (preset: ProvablyFairPreset) => {
    setMode('casino');
    setServerSeed(preset.serverSeed);
    setCommittedHash(preset.committedHash);
    setClientSeed(preset.clientSeed);
    setNonce(preset.nonce);
    setHouseEdge(preset.houseEdgePercent);
  };

  const copyHashToClipboard = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // ignore clipboard error in restricted environments
    }
  };

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
      algorithm: VERIFY_ALGORITHMS.casino,
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
        const data = (await res.json()) as {
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

  // Update auditSeedHealth integration
  useEffect(() => {
    const calculateAudit = async () => {
      setIsCalculating(true);
      setAuditError('');
      try {
        const verificationInput = buildVerificationInput();
        if (!verificationInput || !pfResult) {
          setAuditResult(null);
          return;
        }

        setAuditResult(
          await auditSeedHealth({
            ...verificationInput,
            record: {
              ...verificationInput.record,
              reportedHash: pfResult.receipt.hmacSha256,
            },
          })
        );
      } catch (err) {
        console.error('Fairness calculation failed:', err);
        setAuditResult(null);
        setAuditError('Seed health layer unavailable for this receipt.');
      } finally {
        setIsCalculating(false);
      }
    };

    calculateAudit();
  }, [buildVerificationInput, pfResult]);

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        centered
        eyebrow="Provably fair verifier"
        title="The Receipt"
        description={
          <>
            Mathematically recompute and audit casino outcomes (Dice, Limbo, Crash, Roulette, Plinko, Mines) client-side.
            Independent of casino servers. Compare operator trust at{' '}
            <Link href="/casinos" className="text-[#17c3b2] hover:underline">
              /casinos
            </Link>
            .
          </>
        }
      />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-16">
        {/* Preset Selector Banner */}
        <div className="mb-6 w-full border border-[#283347] bg-black/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Instant Sample Audit Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {PROVABLY_FAIR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset)}
                  className="border border-[#283347] bg-black px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#17c3b2] transition-colors hover:border-[#17c3b2] hover:bg-[#17c3b2]/10"
                >
                  [{preset.tag}]
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid: Inputs + Receipts */}
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Input Section */}
          <div className="border border-[#283347] bg-black/40 p-6">
            {/* Mode Tabs */}
            <div className="mb-8 flex gap-4">
              <button
                onClick={() => setMode('casino')}
                className={`flex-1 border-2 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                  mode === 'casino'
                    ? 'border-[#17c3b2] bg-[#17c3b2] text-black'
                    : 'border-[#283347] text-gray-400 hover:border-[#17c3b2]'
                }`}
              >
                Casino Standard (Stake / Roobet)
              </button>
              <button
                onClick={() => setMode('tiltcheck')}
                className={`flex-1 border-2 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                  mode === 'tiltcheck'
                    ? 'border-[#17c3b2] bg-[#17c3b2] text-black'
                    : 'border-[#283347] text-gray-400 hover:border-[#17c3b2]'
                }`}
              >
                TiltCheck 4-Key (Solana)
              </button>
            </div>

            <div className="space-y-6">
              {mode === 'casino' ? (
                <>
                  {/* Revealed Server Seed */}
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#17c3b2]">
                      Revealed Server Seed (Post-Session)
                    </label>
                    <input
                      value={serverSeed}
                      onChange={(e) => setServerSeed(e.target.value)}
                      placeholder="Paste revealed 64-character server seed..."
                      aria-label="Revealed Server Seed"
                      className="w-full border border-[#283347] bg-black p-3 font-mono text-sm text-white outline-none focus:border-[#17c3b2]"
                    />
                  </div>

                  {/* Pre-Committed Hash */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#17c3b2]">
                        Committed Server Seed Hash (Pre-Bet SHA-256)
                      </label>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-gray-500">
                        Optional Pre-Commitment
                      </span>
                    </div>
                    <input
                      value={committedHash}
                      onChange={(e) => setCommittedHash(e.target.value)}
                      placeholder="Paste SHA-256 hash published before you placed your bet..."
                      aria-label="Committed Server Seed Hash"
                      className="w-full border border-[#283347] bg-black p-3 font-mono text-sm text-white outline-none focus:border-[#17c3b2]"
                    />
                    {/* Pre-Commitment Audit Badge */}
                    {preCommitmentStatus && (
                      <div
                        className={`mt-2 border p-2 font-mono text-[11px] leading-relaxed ${
                          preCommitmentStatus.status === 'match'
                            ? 'border-[#17c3b2]/50 bg-[#17c3b2]/10 text-[#17c3b2]'
                            : preCommitmentStatus.status === 'mismatch'
                              ? 'border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ef4444]'
                              : 'border-[#283347] bg-black/60 text-gray-400'
                        }`}
                      >
                        <span className="font-bold uppercase tracking-wider">
                          [{preCommitmentStatus.status === 'match'
                            ? 'PRE-COMMITMENT MATCH: VERIFIED UNALTERED'
                            : preCommitmentStatus.status === 'mismatch'
                              ? 'TAMPER ALERT: HASH MISMATCH'
                              : 'PRE-COMMITMENT AUDIT'}]
                        </span>{' '}
                        {preCommitmentStatus.message}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Solana Block Hash */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#17c3b2]">
                        Solana Block Hash (Public External Fingerprint)
                      </label>
                      <button
                        onClick={fetchLatestBlockhash}
                        disabled={isFetchingHash}
                        className="ml-2 min-h-[44px] border border-[#17c3b2] px-3 font-mono text-[9px] font-black uppercase tracking-widest text-[#17c3b2] transition-all hover:bg-[#17c3b2]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isFetchingHash ? '[FETCHING...]' : '[GRAB LATEST]'}
                      </button>
                    </div>
                    <input
                      value={solanaHash}
                      onChange={(e) => {
                        setSolanaHash(e.target.value);
                        setHashWasFetched(false);
                        setFetchedSlot(null);
                      }}
                      placeholder="Paste a Solana block hash or hit [GRAB LATEST]..."
                      aria-label="Solana Block Hash"
                      className="w-full border border-[#283347] bg-black p-3 font-mono text-sm text-white outline-none focus:border-[#17c3b2]"
                    />
                    {fetchHashError && (
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#ef4444]">
                        {fetchHashError}
                      </p>
                    )}
                    {solanaHash && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-gray-600">
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
                          className="font-mono text-[9px] uppercase tracking-widest text-[#17c3b2] hover:underline"
                        >
                          [VERIFY ON SOLSCAN]
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Discord ID */}
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#17c3b2]">
                      Your Discord ID (User Fingerprint)
                    </label>
                    <input
                      value={discordId}
                      onChange={(e) => setDiscordId(e.target.value)}
                      placeholder="e.g. 248912384..."
                      aria-label="Discord ID"
                      className="w-full border border-[#283347] bg-black p-3 font-mono text-sm text-white outline-none focus:border-[#17c3b2]"
                    />
                  </div>
                </>
              )}

              {/* Client Seed */}
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#17c3b2]">
                  Client Seed (The Input You Controlled)
                </label>
                <input
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  placeholder="Whatever client seed was active during the round..."
                  aria-label="Client Seed"
                  className="w-full border border-[#283347] bg-black p-3 font-mono text-sm text-white outline-none focus:border-[#17c3b2]"
                />

                {/* Seed Hygiene Feedback */}
                {clientSeed.trim() && (
                  <div
                    className={`mt-2 border p-2 font-mono text-[11px] leading-relaxed ${
                      activeInputHygiene.status === 'compromised'
                        ? 'border-[#ef4444]/60 bg-[#ef4444]/10 text-[#ef4444]'
                        : activeInputHygiene.status === 'weak'
                          ? 'border-[#fbbf24]/60 bg-[#fbbf24]/10 text-[#fbbf24]'
                          : 'border-[#17c3b2]/40 bg-[#17c3b2]/5 text-[#17c3b2]'
                    }`}
                  >
                    <span className="font-bold uppercase tracking-wider">
                      [{activeInputHygiene.status === 'compromised'
                        ? 'COMPROMISED SEED ALERT'
                        : activeInputHygiene.status === 'weak'
                          ? 'WEAK SEED WARNING'
                          : 'HIGH ENTROPY CLIENT SEED'}]
                    </span>{' '}
                    {activeInputHygiene.notes[0]}
                  </div>
                )}

                {/* Seed Manager Tool (Issue #539) */}
                <div className="mt-3 border border-[#283347] bg-black/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#283347] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-300">
                        Seed Manager
                      </span>
                      <span className="border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#17c3b2]">
                        ON-DEVICE CSPRNG
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(['stake', 'bcgame', 'roobet', 'shuffle', 'default'] as const).map((site) => (
                        <button
                          key={site}
                          type="button"
                          onClick={() => setSelectedSeedSite(site)}
                          className={`px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors ${
                            selectedSeedSite === site
                              ? 'bg-[#17c3b2] text-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {site}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-gray-400">Format:</span>
                      {(['alphanumeric', 'hex', 'readable'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setSeedFormat(fmt)}
                          className={`px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                            seedFormat === fmt ? 'border border-[#17c3b2] text-[#17c3b2]' : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRotateSiteSeed}
                        className="border border-[#17c3b2] bg-[#17c3b2]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#17c3b2] transition-colors hover:bg-[#17c3b2] hover:text-black"
                      >
                        [Rotate New Seed]
                      </button>
                      {siteSeedMeta && (
                        <button
                          type="button"
                          onClick={() => handleCopySiteSeed(siteSeedMeta.seed)}
                          className="border border-[#283347] bg-black px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:border-[#17c3b2] hover:text-white"
                        >
                          {copiedSeedToast ? '[Copied!]' : '[Copy Active]'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowSeedHistory(!showSeedHistory)}
                        className="font-mono text-[10px] text-gray-400 underline hover:text-white"
                      >
                        {showSeedHistory ? 'Hide History' : `History (${siteSeedHistory.length})`}
                      </button>
                    </div>
                  </div>

                  {showSeedHistory && (
                    <div className="mt-3 border-t border-[#283347] pt-2">
                      <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Rotation History for {selectedSeedSite.toUpperCase()}:
                      </div>
                      {siteSeedHistory.length === 0 ? (
                        <p className="font-mono text-[10px] text-gray-500">No previous rotations recorded yet.</p>
                      ) : (
                        <div className="max-h-24 space-y-1 overflow-y-auto font-mono text-[10px]">
                          {siteSeedHistory.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between border-b border-[#283347]/50 py-0.5 text-gray-300"
                            >
                              <span className="truncate pr-2 font-mono text-gray-400">{item.seed}</span>
                              <span className="shrink-0 text-[9px] text-gray-500">
                                {new Date(item.retiredAt).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Nonce & House Edge */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#17c3b2]">
                    Nonce (Bet Counter)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={nonce}
                    onChange={(e) => setNonce(Math.max(0, parseInt(e.target.value) || 0))}
                    aria-label="Nonce"
                    className="w-full border border-[#283347] bg-black p-3 font-mono text-sm text-white outline-none focus:border-[#17c3b2]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#17c3b2]">
                    House Edge % (Limbo/Crash)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={houseEdge}
                    onChange={(e) => setHouseEdge(Math.max(0, Math.min(10, parseFloat(e.target.value) || 1.0)))}
                    aria-label="House Edge"
                    className="w-full border border-[#283347] bg-black p-3 font-mono text-sm text-white outline-none focus:border-[#17c3b2]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="relative flex flex-col justify-between overflow-hidden border border-[#17c3b2] bg-black/60 p-6 lg:p-8">
            <div
              className={`pointer-events-none absolute inset-0 bg-[#17c3b2]/5 transition-opacity ${
                isCalculating ? 'opacity-100' : 'opacity-0'
              }`}
            />

            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#17c3b2]" />
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                    LIVE MATHEMATICAL AUDIT
                  </h2>
                </div>
                {pfResult && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#17c3b2]">
                    [HMAC-SHA256 VERIFIED]
                  </span>
                )}
              </div>

              {pfResult ? (
                <div className="space-y-6">
                  {/* Hash Receipt */}
                  <div className="border border-[#283347] bg-black/80 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-gray-500">
                        HMAC-SHA256 Result Signature
                      </span>
                      <button
                        onClick={() => copyHashToClipboard(pfResult.receipt.hmacSha256)}
                        className="font-mono text-[9px] uppercase tracking-widest text-[#17c3b2] hover:underline"
                      >
                        {copiedHash ? '[COPIED]' : '[COPY HASH]'}
                      </button>
                    </div>
                    <code className="block break-all font-mono text-xs leading-relaxed text-[#17c3b2]">
                      {pfResult.receipt.hmacSha256}
                    </code>
                  </div>

                  {/* Byte Breakdown */}
                  <div className="grid grid-cols-2 gap-3 border border-[#283347] bg-black/40 p-3 font-mono text-xs">
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-gray-500">Leading 4 Bytes (Hex)</span>
                      <span className="text-[#17c3b2]">0x{pfResult.receipt.leadingBytesHex}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-gray-500">32-Bit Unsigned Int</span>
                      <span className="text-white">{pfResult.receipt.leadingBytesInt.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Normalized Float */}
                  <div className="space-y-2">
                    <div className="flex items-end justify-between font-mono">
                      <span className="text-[10px] font-bold uppercase text-gray-500">
                        Normalized Float [0.0 - 1.0)
                      </span>
                      <span className="text-lg text-white">{pfResult.receipt.normalizedFloat.toFixed(8)}</span>
                    </div>
                    <div className="relative h-2 w-full border border-[#283347] bg-black/40">
                      <div
                        className="absolute h-full bg-[#17c3b2] shadow-[0_0_10px_rgba(23,195,178,0.5)] transition-all duration-500"
                        style={{ width: `${pfResult.receipt.normalizedFloat * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Derived Game Outcomes Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {/* Dice */}
                    <div className="border border-[#283347] bg-black/40 p-3 text-center">
                      <span className="mb-1 block text-[9px] font-bold uppercase text-[#17c3b2]">Dice (0.00-100)</span>
                      <span className="text-xl font-black text-white">{pfResult.outcomes.dice.toFixed(2)}</span>
                    </div>

                    {/* Limbo / Crash */}
                    <div className="border border-[#283347] bg-black/40 p-3 text-center">
                      <span className="mb-1 block text-[9px] font-bold uppercase text-[#17c3b2]">Limbo / Crash</span>
                      <span className="text-xl font-black text-white">
                        {pfResult.outcomes.crashMultiplier.toFixed(2)}x
                      </span>
                    </div>

                    {/* Roulette */}
                    <div className="border border-[#283347] bg-black/40 p-3 text-center">
                      <span className="mb-1 block text-[9px] font-bold uppercase text-[#17c3b2]">Roulette Pocket</span>
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-black uppercase text-white ${
                            pfResult.outcomes.roulette.color === 'green'
                              ? 'bg-green-600'
                              : pfResult.outcomes.roulette.color === 'red'
                                ? 'bg-red-600'
                                : 'bg-gray-800'
                          }`}
                        >
                          {pfResult.outcomes.roulette.pocket}
                        </span>
                        <span className="font-mono text-[9px] uppercase text-gray-400">
                          {pfResult.outcomes.roulette.color}
                        </span>
                      </div>
                    </div>

                    {/* Plinko */}
                    <div className="col-span-2 border border-[#283347] bg-black/40 p-3 sm:col-span-1">
                      <span className="mb-1 block text-[9px] font-bold uppercase text-[#17c3b2]">Plinko (12 Rows)</span>
                      <span className="font-mono text-sm text-white">
                        Slot {pfResult.outcomes.plinko.landingSlot} / 12
                      </span>
                    </div>

                    {/* Mines Summary */}
                    <div className="col-span-2 border border-[#283347] bg-black/40 p-3 text-center">
                      <span className="mb-1 block text-[9px] font-bold uppercase text-[#17c3b2]">
                        Mines (3 Mines in 25 Tiles)
                      </span>
                      <div className="flex items-center justify-center gap-1.5 font-mono text-xs">
                        <span className="text-gray-400">Mine Tiles:</span>
                        <span className="font-bold text-[#ef4444]">
                          {pfResult.outcomes.mines.minePositions.map((p) => `#${p + 1}`).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Mines Board Preview */}
                  <div className="border border-[#283347] bg-black/40 p-3">
                    <span className="mb-2 block text-center font-mono text-[9px] font-bold uppercase tracking-widest text-gray-500">
                      5x5 Mines Tile Layout (Red = Derived Mine, Green = Safe)
                    </span>
                    <div className="mx-auto grid max-w-[200px] grid-cols-5 gap-1.5">
                      {Array.from({ length: 25 }, (_, idx) => {
                        const isMine = pfResult.outcomes.mines.minePositions.includes(idx);
                        return (
                          <div
                            key={idx}
                            className={`flex h-7 w-7 items-center justify-center font-mono text-[10px] font-bold border transition-all ${
                              isMine
                                ? 'border-[#ef4444] bg-[#ef4444]/20 text-[#ef4444]'
                                : 'border-[#17c3b2]/30 bg-[#17c3b2]/5 text-[#17c3b2]'
                            }`}
                            title={`Tile #${idx + 1}: ${isMine ? 'Mine' : 'Safe'}`}
                          >
                            {idx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center border border-dashed border-[#283347] p-8 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
                    Awaiting valid seed parameters...
                  </span>
                  <p className="mt-2 text-xs text-gray-600">
                    Click any sample preset above or paste your casino seeds to recompute results.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-[#283347] pt-4 text-center">
              <p className="font-mono text-[10px] font-medium uppercase italic tracking-widest text-gray-500">
                Pure client-side cryptographic receipt. Zero remote calls. Made for Degens. By Degens.
              </p>
            </div>
          </div>
        </div>

        {/* Engine-Backed Distinction & Seed Health Section */}
        <section className="mt-12 w-full">
          <div className="border border-[#283347] bg-black/40 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">
                  Engine-backed audit layer
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                  One verified round vs whole-session trust.
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-gray-400">
                  Single-bet provably fair verification confirms mathematics for this specific round only. It cannot
                  verify whether other casino games have stealth RTP downgrades or whether platform reserves are solvent.
                </p>
              </div>
              <span
                className={`inline-flex items-center border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${
                  auditSummary?.statusTone === 'live'
                    ? 'border-[#17c3b2]/40 bg-[#17c3b2]/10 text-[#17c3b2]'
                    : auditSummary?.statusTone === 'warning'
                      ? 'border-[#ffd700]/30 bg-[#ffd700]/10 text-[#ffd700]'
                      : 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]'
                }`}
              >
                {auditSummary?.categoryLabel ?? 'Awaiting seeds'}
              </span>
            </div>

            {auditError && <p className="mt-4 text-sm text-[#ef4444]">{auditError}</p>}

            {auditResult && auditSummary && auditSupport ? (
              <div className="mt-6 space-y-4 text-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border border-[#283347] bg-black/30 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Proof-quality evaluation
                    </p>
                    <p className="mt-2 text-sm text-white">{auditResult.proofQuality.summary}</p>
                    <p className="mt-2 text-sm text-gray-400">{auditSummary.sampleSummary}</p>
                  </div>
                  <div className="border border-[#283347] bg-black/30 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Algorithm specification
                    </p>
                    <p className="mt-2 text-sm text-white">{auditSummary.formulaSummary}</p>
                    <p className="mt-2 text-sm text-gray-400">{auditSummary.continuitySummary}</p>
                  </div>
                </div>

                <div className="border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Support metadata</p>
                  <p className="mt-2 text-sm text-white">{auditSupport.summary}</p>
                  <p className="mt-2 font-mono text-[11px] text-gray-500">
                    {auditSupport.algorithmName} - {auditSupport.hashFamily} - {auditSupport.formulaVariant}
                  </p>
                </div>

                <div className="border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Seed health checks</p>
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
                Enter seed inputs above to activate the engine-backed proof-quality audit.
              </p>
            )}
          </div>
        </section>

        {/* 4-Step Provably Fair Educational Guide */}
        <section className="mt-8 w-full border border-[#283347] bg-black/40 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Educational Reference</p>
          <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-white">
            The 4-Step Provably Fair Security Guarantee
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-[#283347] bg-black/30 p-4">
              <span className="font-mono text-xs font-bold uppercase text-[#17c3b2]">01. Pre-Commitment</span>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Before you place a bet, the casino generates a Server Seed and shares only its SHA-256 hash. Because
                SHA-256 is one-way, they cannot alter the server-seed later without changing this hash.
              </p>
            </div>
            <div className="border border-[#283347] bg-black/30 p-4">
              <span className="font-mono text-xs font-bold uppercase text-[#17c3b2]">02. Player Entropy</span>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                You customize your Client Seed in your casino profile. Because the casino does not control your client
                client-seed, they cannot predetermine winning or losing rolls.
              </p>
            </div>
            <div className="border border-[#283347] bg-black/30 p-4">
              <span className="font-mono text-xs font-bold uppercase text-[#17c3b2]">03. Deterministic Nonce</span>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Every bet increments a counter (nonce = 1, 2, 3...). The round signature is generated by HMAC-SHA256 of
                both seeds combined with the nonce.
              </p>
            </div>
            <div className="border border-[#283347] bg-black/30 p-4">
              <span className="font-mono text-xs font-bold uppercase text-[#17c3b2]">04. Post-Session Reveal</span>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                When you rotate your seed pair, the casino reveals the unhashed server seed. Paste it into this verifier
                to confirm both the pre-commitment hash and the exact roll numbers.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center font-mono text-[10px] text-gray-600">
          Client-side HMAC-SHA256 verifier. Zero cookies, zero analytics tracking, zero hot-wallet dependencies.
        </p>
      </div>
    </main>
  );
}
