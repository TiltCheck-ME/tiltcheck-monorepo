/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
"use client";

import React, { useState } from 'react';

const COLLAB_TYPES = [
  'Casino / Platform Integration',
  'Affiliate Network',
  'Responsible Gambling Tool',
  'Developer / Technical Integration',
  'Content Creator / Streamer',
  'Media / Press',
  'Research / Academic',
  'Other',
];

type FormState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export default function CollabPage() {
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
      <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#6c47ff', marginBottom: '1.5rem' }}>
            Application received.
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            If it is a fit, someone will reach out. If you do not hear back within two weeks, we passed.
            No hard feelings — just capacity limits.
          </p>
          <p style={{ fontSize: '0.95rem', color: '#64748b' }}>
            Deals happen faster over conversation than cold forms. Come say hi in Discord.
          </p>
          <a href="https://discord.gg/tiltcheck" style={{ display: 'inline-block', marginTop: '2rem', padding: '0.75rem 2rem', background: '#6c47ff', color: '#fff', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>
            Join Discord
          </a>
        </div>
      </main>
    );
  }

  if (formState === 'duplicate') {
    return (
      <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#6c47ff', marginBottom: '1.5rem' }}>
            Already in the queue.
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.7 }}>
            Submitting again will not speed up the process. We can read.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0' }}>
      {/* Hero */}
      <section style={{ padding: '5rem 2rem 3rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: '#6c47ff22', border: '1px solid #6c47ff55', borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.85rem', color: '#a78bfa', marginBottom: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Partner / Integration / Collab
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem' }}>
          Think We Should Work Together?<br />
          <span style={{ color: '#6c47ff' }}>Make Your Case.</span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto' }}>
          TiltCheck is open to integrations, partnerships, and collabs that actually serve the degen community —
          not just add noise to a press release. Tell us what you are building and why it matters.
        </p>
      </section>

      {/* What we are looking for */}
      <section style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {[
            { title: 'Integrations', body: 'API consumers, data partners, platforms that want real-time tilt or trust scores baked into their UX.' },
            { title: 'Collabs', body: 'Creators, streamers, communities building content around responsible degen culture. We are not anti-fun — we are pro-informed.' },
            { title: 'Partners', body: 'Casinos and affiliates that want a trust signal badge. Comes with a real audit, not a logo on a wall.' },
            { title: 'Research & Tools', body: 'Academic, regulatory, or tooling projects working at the intersection of gambling data and harm reduction.' },
          ].map(({ title, body }) => (
            <div key={title} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#6c47ff', marginBottom: '0.5rem' }}>{title}</div>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>

        <div style={{ background: '#1a0a0a', border: '1px solid #4a1515', borderRadius: '12px', padding: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '0.75rem' }}>What this is not</div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 2 }}>
            <li>A paid directory listing dressed up as a partnership</li>
            <li>An endorsement exchange — we do not trade trust scores for mentions</li>
            <li>A slot affiliate wheel-spin-and-hope arrangement</li>
            <li>A quick logo swap for a backlink</li>
          </ul>
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: '0 2rem 5rem', maxWidth: '680px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>Apply</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Submissions go to the team. We review everything. Vague pitches get archived.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <input type="text" name="honeypot" defaultValue="" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Your Name *</label>
              <input name="name" required style={inputStyle} placeholder="Jane Degen" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input name="email" type="email" required style={inputStyle} placeholder="jane@example.com" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Organization / Project</label>
            <input name="organization" style={inputStyle} placeholder="Acme Casino Ltd, or 'solo'" />
          </div>

          <div>
            <label style={labelStyle}>Collaboration Type *</label>
            <select name="collab_type" required style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select one</option>
              {COLLAB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Website / Project Link</label>
            <input name="url" type="url" style={inputStyle} placeholder="https://..." />
          </div>

          <div>
            <label style={labelStyle}>Discord Username</label>
            <input name="discord" style={inputStyle} placeholder="janedegen" />
          </div>

          <div>
            <label style={labelStyle}>Pitch — What are you building and why should we care? *</label>
            <textarea
              name="description"
              required
              minLength={20}
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Give us the actual value proposition. What does this integration/collab do for TiltCheck users? Why now? What do you need from us?"
            />
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>Min 20 characters. Vague pitches get archived.</div>
          </div>

          <div>
            <label style={labelStyle}>How did you find us?</label>
            <input name="referral" style={inputStyle} placeholder="Discord, Twitter, casino partner, someone told me..." />
          </div>

          {formState === 'error' && errorMsg && (
            <div style={{ background: '#2a0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.9rem' }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={formState === 'submitting'}
            style={{ padding: '0.85rem 2rem', background: formState === 'submitting' ? '#4c3799' : '#6c47ff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: formState === 'submitting' ? 'not-allowed' : 'pointer' }}
          >
            {formState === 'submitting' ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </section>

      <footer style={{ textAlign: 'center', padding: '1.5rem', borderTop: '1px solid #1e293b', color: '#334155', fontSize: '0.8rem' }}>
        Made for Degens. By Degens.
      </footer>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#111827',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  padding: '0.65rem 0.9rem',
  color: '#e2e8f0',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};
