/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
"use client";

import React, { useState } from 'react';

const CONTACT_TOPICS = [
  'Partner / Platform Integration',
  'Collab / Creator / Streamer',
  'General Question',
  'Press / Media Inquiry',
  'Bug Report / Technical Issue',
  'Research / Academic',
  'Other',
];

type FormState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export default function ContactPage() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState('submitting');
    setErrorMsg(null);

    const data = new FormData(e.currentTarget);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/collab/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name') as string,
          email: data.get('email') as string,
          organization: data.get('organization') as string,
          collab_type: data.get('collab_type') as string,
          description: data.get('description') as string,
          url: data.get('url') as string,
          discord_username: data.get('discord') as string,
          referral_source: data.get('referral') as string,
          honeypot: data.get('honeypot') as string,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error || 'Submit failed. Try again.');
        setFormState('error');
        return;
      }

      setFormState(json.duplicate ? 'duplicate' : 'success');
    } catch {
      setErrorMsg('Network error. Try again or find us on Discord.');
      setFormState('error');
    }
  };

  if (formState === 'success') {
    return (
      <main className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center px-4">
        <div className="max-w-xl text-center">
          <div className="inline-block text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#17c3b2] border border-[#17c3b2]/40 px-3 py-1 mb-6">
            Message Received
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-6">
            We Got It.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-4">
            If it is worth a reply, someone will reach out. If you do not hear back within two weeks, we passed.
            No hard feelings — just capacity limits.
          </p>
          <p className="text-gray-500 text-sm font-mono">
            Deals and conversations happen faster on Discord than cold forms.
          </p>
          <a
            href="https://discord.gg/tiltcheck"
            className="inline-block mt-8 px-8 py-3 bg-[#17c3b2] text-black font-black uppercase tracking-wider text-sm hover:bg-[#14a99a] transition-colors"
          >
            Join Discord
          </a>
        </div>
      </main>
    );
  }

  if (formState === 'duplicate') {
    return (
      <main className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center px-4">
        <div className="max-w-xl text-center">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-6">
            Already In The Queue.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Submitting again will not speed up the process. We can read.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">

      {/* Hero */}
      <section className="border-b border-[#17c3b2]/20 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#17c3b2] border border-[#17c3b2]/40 px-3 py-1 mb-6">
            Contact / Partner / Collab
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-white leading-none">
            Get In Touch.
            <br />
            <span className="text-[#17c3b2]">We Actually Read These.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed mt-8">
            General questions, partnership pitches, press inquiries, bug reports — this form handles it.
            Pick a topic and tell us what you need. Vague messages get archived.
          </p>
        </div>
      </section>

      {/* Topic cards */}
      <section className="max-w-4xl mx-auto py-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {[
            { label: 'Partner / Integrate', body: 'API consumers, platforms, or tools that want real-time tilt or trust scores in their UX.' },
            { label: 'Collab / Create', body: 'Creators, streamers, and communities building content around responsible degen culture.' },
            { label: 'Press / Research', body: 'Media, academic, and regulatory projects working at the intersection of gambling data and harm reduction.' },
            { label: 'Bug / Technical', body: 'Something is broken or behaving wrong. Tell us what, where, and how to reproduce it.' },
          ].map(({ label, body }) => (
            <div key={label} className="p-5 border border-[#283347] bg-black/20">
              <p className="text-[#17c3b2] font-mono font-bold text-xs uppercase tracking-wider mb-2">{label}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="p-5 border border-[#ef4444]/30 bg-[#ef4444]/5 mb-16">
          <p className="text-[#ef4444] font-bold text-xs uppercase tracking-wider mb-2">What this is not</p>
          <ul className="text-gray-400 text-sm leading-loose list-disc list-inside">
            <li>A paid directory listing dressed up as a partnership</li>
            <li>An endorsement exchange — we do not trade trust scores for mentions</li>
            <li>A slot affiliate arrangement</li>
            <li>A quick logo swap for a backlink</li>
          </ul>
        </div>

        {/* Form */}
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Send a Message</h2>
          <p className="text-gray-500 text-sm font-mono mb-10">
            Every submission goes to the team. We review everything.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <input type="text" name="honeypot" defaultValue="" className="hidden" tabIndex={-1} aria-hidden="true" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Your Name *</label>
                <input
                  name="name"
                  required
                  className="w-full bg-black/40 border border-[#283347] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#17c3b2]/60"
                  placeholder="Jane Degen"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email *</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full bg-black/40 border border-[#283347] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#17c3b2]/60"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Topic *</label>
              <select
                name="collab_type"
                required
                className="w-full bg-black/40 border border-[#283347] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#17c3b2]/60 cursor-pointer"
              >
                <option value="">Select a topic</option>
                {CONTACT_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Organization / Project</label>
              <input
                name="organization"
                className="w-full bg-black/40 border border-[#283347] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#17c3b2]/60"
                placeholder="Acme Casino Ltd, or 'solo'"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Website / Link</label>
              <input
                name="url"
                type="url"
                className="w-full bg-black/40 border border-[#283347] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#17c3b2]/60"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Discord Username</label>
              <input
                name="discord"
                className="w-full bg-black/40 border border-[#283347] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#17c3b2]/60"
                placeholder="janedegen"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Message *</label>
              <textarea
                name="description"
                required
                minLength={20}
                rows={6}
                className="w-full bg-black/40 border border-[#283347] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#17c3b2]/60 resize-y font-inherit"
                placeholder="Tell us what you need. If it is a partnership pitch, tell us the actual value proposition — not a press-release summary."
              />
              <p className="text-gray-600 text-xs font-mono mt-1">Min 20 characters. Vague messages get archived.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">How did you find us?</label>
              <input
                name="referral"
                className="w-full bg-black/40 border border-[#283347] px-4 py-3 text-white text-sm focus:outline-none focus:border-[#17c3b2]/60"
                placeholder="Discord, Twitter, casino partner, someone told me..."
              />
            </div>

            {formState === 'error' && errorMsg && (
              <div className="border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-[#ef4444] text-sm font-mono">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={formState === 'submitting'}
              className="px-8 py-3 bg-[#17c3b2] text-black font-black uppercase tracking-wider text-sm hover:bg-[#14a99a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit"
            >
              {formState === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
