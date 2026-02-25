/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'integrations' | 'features' | 'security';

const INTEGRATIONS = [
  { label: 'SUPABASE URL', envKey: 'SUPABASE_URL', hint: 'Your Supabase project URL' },
  { label: 'DISCORD CLIENT ID', envKey: 'DISCORD_CLIENT_ID', hint: 'OAuth2 app client ID' },
  { label: 'OPENAI API KEY', envKey: 'OPENAI_API_KEY', hint: 'For AI Gateway features' },
  { label: 'SOLANA RPC URL', envKey: 'SOLANA_RPC_URL', hint: 'mainnet-beta or devnet' },
  { label: 'STRIPE SECRET KEY', envKey: 'STRIPE_SECRET_KEY', hint: 'Chrome Extension subscriptions' },
];

const INITIAL_FEATURES = [
  { label: 'Wallet Check', description: 'EIP7702 and approval scanning', enabled: true },
  { label: 'QualifyFirst', description: 'Survey matching and rewards', enabled: true },
  { label: 'CollectClock', description: 'Bonus cycle tracking', enabled: true },
  { label: 'SusLink Scanner', description: 'Malicious link detection', enabled: true },
  { label: 'AI Gateway', description: 'OpenAI-powered features', enabled: false },
  { label: 'Telegram Ingest', description: 'Code drop monitoring', enabled: false },
];

export default function AdminSettingsPage() {
  const [section, setSection] = useState<Section>('integrations');
  const [features, setFeatures] = useState(INITIAL_FEATURES);

  const toggleFeature = (i: number) =>
    setFeatures(prev => prev.map((f, idx) => idx === i ? { ...f, enabled: !f.enabled } : f));

  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight mb-2">ADMIN SETTINGS</h1>
          <p className="text-[#6B7280]">Platform configuration and integrations</p>
        </header>

        <div className="flex gap-2 mb-8">
          {(['integrations', 'features', 'security'] as Section[]).map(s => (
            <button key={s} onClick={() => setSection(s)}
              className="px-6 py-2 rounded font-bold text-xs tracking-widest transition-all"
              style={{ backgroundColor: section === s ? '#00FFC6' : '#1A1F24', color: section === s ? '#0E0E0F' : '#6B7280' }}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {section === 'integrations' && (
          <div className="space-y-3">
            <div className="bg-[#1A1F24] rounded-xl border border-[#FFC107]/20 p-4 mb-4 flex gap-3 items-start text-sm">
              <span>⚠️</span>
              <span className="text-[#FFC107]">Env vars are set in <code className="bg-[#0E0E0F] px-1 rounded">.env</code> files on the server — not editable here.</span>
            </div>
            {INTEGRATIONS.map(item => (
              <div key={item.label} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-5 flex items-center justify-between">
                <div>
                  <div className="text-white font-black font-space text-sm">{item.label}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{item.hint}</div>
                </div>
                <code className="text-xs text-[#00FFC6] bg-[#0E0E0F] px-2 py-1 rounded font-mono">{item.envKey}</code>
              </div>
            ))}
          </div>
        )}

        {section === 'features' && (
          <div className="space-y-3">
            <p className="text-[#6B7280] text-sm mb-4">Toggle features on/off. Changes are session-only until wired to a config store.</p>
            {features.map((f, i) => (
              <div key={f.label} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-5 flex items-center justify-between">
                <div>
                  <div className="text-white font-black font-space">{f.label}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{f.description}</div>
                </div>
                <button onClick={() => toggleFeature(i)}
                  className="w-12 h-6 rounded-full transition-colors relative flex-shrink-0"
                  style={{ backgroundColor: f.enabled ? '#00FFC6' : '#374151' }}>
                  <span className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                    style={{ left: f.enabled ? '1.75rem' : '0.25rem' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {section === 'security' && (
          <div className="space-y-4">
            {[
              { title: 'SESSION SECRET', detail: 'Set SESSION_SECRET in .env (min 32 chars)', icon: '🔑' },
              { title: 'JWT SECRET', detail: 'Set JWT_SECRET in .env (min 32 chars)', icon: '🔐' },
              { title: 'RATE LIMITING', detail: 'Configured in control-room Express middleware', icon: '🚦' },
              { title: 'DISCORD OAUTH', detail: 'Set DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET', icon: '🤖' },
              { title: 'AUDIT LOGGING', detail: 'All admin actions logged to server console', icon: '📝' },
            ].map(item => (
              <div key={item.title} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-5 flex items-center gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-white font-black font-space text-sm">{item.title}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
