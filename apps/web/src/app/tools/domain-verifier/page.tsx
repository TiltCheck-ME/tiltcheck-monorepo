// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
"use client";

import React, { useState } from 'react';

type Mode = 'domain' | 'email';

interface LicenseInfo {
  found: boolean;
  brand?: string;
  regulator?: string;
  regulatorName?: string;
  regulatorTier?: number;
  licenseId?: string | null;
  type?: string;
  note?: string;
}

interface LinkScan {
  url: string;
  riskLevel: string;
  reason: string;
}

interface BonusSignal {
  type: string;
  amount: string | null;
  currency: string;
  wageringRequirement: string | null;
  expiresIn: string | null;
  rawText: string;
}

interface EmailResult {
  intel: {
    senderDomain: string | null;
    senderEmail: string | null;
    casinoBrand: string | null;
    subject: string | null;
    bonusSignals: BonusSignal[];
    embeddedUrls: string[];
    urgencyFlags: string[];
    hasUnsubscribeLink: boolean;
    hasSPFHint: boolean;
    rawSignals: string[];
  };
  domainScan: { riskLevel: string; reason: string } | null;
  licenseInfo: LicenseInfo | null;
  linkScans: LinkScan[];
}

interface DomainResult {
  safe: boolean;
  riskLevel: string;
  message: string;
  result?: Record<string, unknown>;
}

const TIER_LABEL: Record<number, string> = {
  1: 'Tier 1 — Strict',
  2: 'Tier 2 — Standard',
  3: 'Tier 3 — Minimal',
  4: 'Sweepstakes Model',
};

const RISK_COLOR: Record<string, string> = {
  safe: 'text-[#17c3b2]',
  low: 'text-[#17c3b2]',
  medium: 'text-yellow-400',
  high: 'text-[#ef4444]',
  critical: 'text-[#ef4444]',
  unknown: 'text-gray-400',
};

export default function DomainVerifierPage() {
  const [mode, setMode] = useState<Mode>('domain');
  const [domain, setDomain] = useState('');
  const [emailText, setEmailText] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [domainResult, setDomainResult] = useState<DomainResult | null>(null);
  const [licenseResult, setLicenseResult] = useState<LicenseInfo | null>(null);
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me';

  const handleDomainScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setStatus('scanning');
    setDomainResult(null);
    setLicenseResult(null);
    setError(null);

    try {
      const [scanRes, licenseRes] = await Promise.all([
        fetch(`${apiUrl}/rgaas/domain-check?domain=${encodeURIComponent(domain.trim())}`),
        fetch(`${apiUrl}/rgaas/license-check?domain=${encodeURIComponent(domain.trim())}`),
      ]);

      if (scanRes.ok) {
        const data = await scanRes.json();
        setDomainResult({
          safe: data.safe,
          riskLevel: data.riskLevel || (data.safe ? 'safe' : 'high'),
          message: data.message || (data.safe ? 'Domain passed all checks.' : 'Threat signals detected.'),
          result: data.result,
        });
      }

      if (licenseRes.ok) {
        setLicenseResult(await licenseRes.json());
      }
    } catch {
      setError('Could not reach the API. Do not proceed with an unverified domain.');
    } finally {
      setStatus('done');
    }
  };

  const handleEmailIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailText.trim()) return;
    setStatus('scanning');
    setEmailResult(null);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/rgaas/email-ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_email: emailText.trim() }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setEmailResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email analysis failed.');
    } finally {
      setStatus('done');
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      {/* Hero */}
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">LINKGUARD + LICENSE CHECK</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="ANTI-DRAINER DNS SENTRY">
            ANTI-DRAINER DNS SENTRY
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            Verify any casino domain or paste a marketing email. We check the sender domain, license status, embedded links, and extract bonus data for the trust engine.
          </p>
        </div>
      </section>

      {/* Mode Toggle */}
      <section className="pt-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex border border-[#283347] mb-8">
            {(['domain', 'email'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setStatus('idle'); setError(null); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${
                  mode === m
                    ? 'bg-[#17c3b2]/10 text-[#17c3b2] border-b-2 border-[#17c3b2]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {m === 'domain' ? 'Check a Domain' : 'Paste Casino Email'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Domain Mode */}
      {mode === 'domain' && (
        <section className="pb-20 px-4">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleDomainScan} className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-3">
                  Paste the domain to verify
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. stake.com or stake-bonus-promo.xyz"
                  className="w-full bg-black border border-[#283347] p-4 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'scanning' || !domain.trim()}
                className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'scanning' ? 'Scanning...' : 'Run DNS + SSL + License Check'}
              </button>
            </form>

            {error && (
              <div className="mt-8 p-6 border border-[#ef4444]/40 bg-[#ef4444]/5 font-mono text-sm text-[#ef4444]">
                {error}
              </div>
            )}

            {domainResult && (
              <div className={`mt-8 p-6 border font-mono ${domainResult.safe ? 'border-[#17c3b2]/40 bg-[#17c3b2]/5' : 'border-[#ef4444]/40 bg-[#ef4444]/5'}`}>
                <p className={`text-sm font-black uppercase tracking-widest mb-2 ${domainResult.safe ? 'text-[#17c3b2]' : 'text-[#ef4444]'}`}>
                  {domainResult.safe ? 'PASS — No threats detected' : 'WARNING — Threat signals found'}
                </p>
                <p className="text-gray-400 text-sm">{domainResult.message}</p>
              </div>
            )}

            {licenseResult && (
              <div className="mt-4 p-6 border border-[#283347] bg-black/40 font-mono">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">License Registry</p>
                {licenseResult.found ? (
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Brand:</span> <span className="text-white font-bold">{licenseResult.brand}</span></p>
                    <p><span className="text-gray-500">Type:</span> <span className="text-white capitalize">{licenseResult.type}</span></p>
                    <p><span className="text-gray-500">Regulator:</span> <span className="text-[#17c3b2]">{licenseResult.regulatorName}</span></p>
                    {licenseResult.regulatorTier && (
                      <p><span className="text-gray-500">Tier:</span> <span className="text-gray-300">{TIER_LABEL[licenseResult.regulatorTier] ?? licenseResult.regulatorTier}</span></p>
                    )}
                    {licenseResult.licenseId && (
                      <p><span className="text-gray-500">License ID:</span> <span className="text-gray-300 font-mono">{licenseResult.licenseId}</span></p>
                    )}
                    {licenseResult.note && (
                      <p className="text-gray-500 text-xs mt-2">{licenseResult.note}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-yellow-400 text-sm">Not found in TiltCheck registry. May still be licensed — registry is updated by the community.</p>
                )}
              </div>
            )}

            <div className="mt-12 p-6 border border-[#283347] bg-black/40 text-xs text-gray-500 font-mono leading-relaxed">
              <p className="text-gray-400 font-bold uppercase tracking-widest mb-2 text-[10px]">What we check</p>
              <ul className="space-y-1">
                <li>SSL certificate validity and issuer trust chain</li>
                <li>Domain age and registration anomalies</li>
                <li>Known phishing and drainer domain blocklists</li>
                <li>Typosquat similarity against verified casino domains</li>
                <li>License registry lookup (MGA, UKGC, Curacao, Sweepstakes)</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Email Mode */}
      {mode === 'email' && (
        <section className="pb-20 px-4">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs text-gray-500 font-mono mb-6 leading-relaxed">
              Forward or paste a casino marketing email below (headers included if possible). We extract the sender domain, run it through SusLink and the license registry, pull all embedded links, and log any bonus data as trust signal input.
            </p>
            <form onSubmit={handleEmailIngest} className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-3">
                  Paste email content (headers + body)
                </label>
                <textarea
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  placeholder={"From: promo@chumbacasino.com\nSubject: Your Daily Bonus is Ready\n\nHey Degen,\n\nClaim your 200 SC free play — expires in 24 hours...\n\nhttps://chumbacasino.com/claim?bonus=..."}
                  rows={12}
                  className="w-full bg-black border border-[#283347] p-4 text-white font-mono text-xs focus:border-[#17c3b2] outline-none resize-y"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'scanning' || !emailText.trim()}
                className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'scanning' ? 'Analyzing...' : 'Analyze Email'}
              </button>
            </form>

            {error && (
              <div className="mt-8 p-6 border border-[#ef4444]/40 bg-[#ef4444]/5 font-mono text-sm text-[#ef4444]">
                {error}
              </div>
            )}

            {emailResult && (
              <div className="mt-8 space-y-4 font-mono">
                {/* Sender */}
                <div className="p-6 border border-[#283347] bg-black/40">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Sender</p>
                  <p className="text-sm text-white">{emailResult.intel.senderEmail ?? 'Not detected'}</p>
                  {emailResult.intel.subject && (
                    <p className="text-xs text-gray-500 mt-1">Subject: {emailResult.intel.subject}</p>
                  )}
                  {emailResult.intel.casinoBrand && (
                    <p className="text-xs text-[#17c3b2] mt-1">Detected brand: {emailResult.intel.casinoBrand}</p>
                  )}
                </div>

                {/* Domain scan */}
                {emailResult.domainScan && (
                  <div className={`p-6 border font-mono ${emailResult.domainScan.riskLevel === 'safe' ? 'border-[#17c3b2]/40 bg-[#17c3b2]/5' : 'border-[#ef4444]/40 bg-[#ef4444]/5'}`}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sender Domain Scan</p>
                    <span className={`text-sm font-black uppercase ${RISK_COLOR[emailResult.domainScan.riskLevel] || 'text-gray-400'}`}>
                      {emailResult.domainScan.riskLevel.toUpperCase()}
                    </span>
                    {emailResult.domainScan.reason && (
                      <p className="text-xs text-gray-400 mt-1">{emailResult.domainScan.reason}</p>
                    )}
                  </div>
                )}

                {/* License */}
                {emailResult.licenseInfo && (
                  <div className="p-6 border border-[#283347] bg-black/40">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">License Registry</p>
                    {emailResult.licenseInfo.found ? (
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-500">Brand:</span> <span className="text-white font-bold">{emailResult.licenseInfo.brand}</span></p>
                        <p><span className="text-gray-500">Regulator:</span> <span className="text-[#17c3b2]">{emailResult.licenseInfo.regulatorName}</span></p>
                        {emailResult.licenseInfo.regulatorTier && (
                          <p><span className="text-gray-500">Tier:</span> <span className="text-gray-300">{TIER_LABEL[emailResult.licenseInfo.regulatorTier]}</span></p>
                        )}
                      </div>
                    ) : (
                      <p className="text-yellow-400 text-sm">Not in TiltCheck registry.</p>
                    )}
                  </div>
                )}

                {/* Bonus signals */}
                {emailResult.intel.bonusSignals.length > 0 && (
                  <div className="p-6 border border-[#283347] bg-black/40">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Bonus Signals ({emailResult.intel.bonusSignals.length})
                    </p>
                    <ul className="space-y-2">
                      {emailResult.intel.bonusSignals.map((b, i) => (
                        <li key={i} className="text-xs border-l-2 border-[#17c3b2]/30 pl-3">
                          <span className="text-[#17c3b2] uppercase font-bold">{b.type}</span>
                          {b.amount && <span className="text-white ml-2">{b.amount} {b.currency !== 'unknown' ? b.currency : ''}</span>}
                          {b.wageringRequirement && <span className="text-gray-500 ml-2">WR: {b.wageringRequirement}</span>}
                          {b.expiresIn && <span className="text-yellow-400 ml-2">{b.expiresIn}</span>}
                          <p className="text-gray-600 mt-0.5">{b.rawText}</p>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-gray-600 mt-3">Bonus data logged to trust engine signals.</p>
                  </div>
                )}

                {/* Link scans */}
                {emailResult.linkScans.length > 0 && (
                  <div className="p-6 border border-[#283347] bg-black/40">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Embedded Link Scans ({emailResult.linkScans.length} checked)
                    </p>
                    <ul className="space-y-2">
                      {emailResult.linkScans.map((l, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <span className={`font-black uppercase shrink-0 ${RISK_COLOR[l.riskLevel] || 'text-gray-400'}`}>
                            {l.riskLevel}
                          </span>
                          <span className="text-gray-500 break-all">{l.url}</span>
                        </li>
                      ))}
                    </ul>
                    {emailResult.intel.embeddedUrls.length > 5 && (
                      <p className="text-[10px] text-gray-600 mt-2">
                        {emailResult.intel.embeddedUrls.length - 5} additional links not scanned.
                      </p>
                    )}
                  </div>
                )}

                {/* Raw signals */}
                {emailResult.intel.rawSignals.length > 0 && (
                  <div className="p-6 border border-[#283347] bg-black/40">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Signal Notes</p>
                    <ul className="space-y-1">
                      {emailResult.intel.rawSignals.map((s, i) => (
                        <li key={i} className="text-xs text-gray-500">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="py-12 px-4 border-t border-[#283347] text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-sm font-mono">
            Powered by SusLink and the TiltCheck License Registry.
            Email analysis data feeds the community trust engine anonymously.
          </p>
        </div>
      </section>
    </main>
  );
}
