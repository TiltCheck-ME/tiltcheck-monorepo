/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
"use client";

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

const QUOTES = [
  "Trust everybody, but cut the cards.",
  "Casinos don't win because they're lucky. They win because they're open 24/7 and the math is always in their favor.",
  "The house always wins, unless you're the architect.",
  "Risk is the price you pay for the chance to be right.",
  "Fortune favors the prepared.",
  "Zero drift. Zero mercy.",
  "Math doesn't care about your gut feeling.",
  "The machine has a memory. You have a prayer.",
  "The best way to double your money is to fold it in half and put it back in your pocket.",
  "Don't worry about the noise. Worry about the signal."
];

const Footer = () => {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="container">
        {/* Made for Degens by Degens */}
      </div>
      <div className="footer-columns">
        <div className="footer-col">
          <h4>The Edge</h4>
          <ul>
            <li><Link href="/#tools">All Tools</Link></li>
            <li><Link href="/tools/auto-vault">Auto Vault</Link></li>
            <li><Link href="/tools/verify">Forensic Seed Audit</Link></li>
            <li><Link href="/tools/domain-verifier">Anti-Drainer DNS</Link></li>
            <li><Link href="/tools/session-stats">Nerf Radar</Link></li>
            <li><Link href="/tools/house-edge-scanner">Delta Engine</Link></li>
            <li><Link href="/tools/scan-scams">Shadow-Ban Tracker</Link></li>
            <li><Link href="/tools/justthetip">JustTheTip</Link></li>
            <li><Link href="/tools/degens-arena">Tilt-Free Arena</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Intel</h4>
          <ul>
            <li><Link href="/casinos">Casino Trust Scores</Link></li>
            <li><Link href="/bonuses">Daily Bonus Tracker</Link></li>
            <li><Link href="/intel/rtp">RTP Scanner</Link></li>
            <li><Link href="/intel/scanner">Threat Scanner</Link></li>
            <li><Link href="/intel/scams">Scam Registry</Link></li>
            <li><Link href="/extension">Profit Guard Extension</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Learn</h4>
          <ul>
            <li><Link href="/how-it-works">How It Works</Link></li>
            <li><Link href="/getting-started">Getting Started</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/docs">Audit Blueprints</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/beta-tester">Join Beta</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Compliance</h4>
          <ul>
            <li><Link href="/touch-grass">Touch Grass Protocol</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/legal/limit">Asset Risk Limits</Link></li>
            <li><Link href="/terms">Non-Advice Disclosure</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Connect</h4>
          <ul>
            <li><Link href="/dashboard">Your Dashboard</Link></li>
            <li>
              <a href="https://discord.gg/gdBsEJfCar" target="_blank" rel="noopener noreferrer">TiltCheck Discord</a>
            </li>
            <li>
              <a href="https://github.com/jmenichole/tiltcheck-monorepo" target="_blank" rel="noopener noreferrer">The Source</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="footer-mission">
          <strong>The mission:</strong> The house wins because they have the math and you have a dopamine problem. We can count too. TiltCheck is the audit layer built to tilt the fairness scale back in your favor — live RTP drift detection, provably fair verification, and a community-backed signal to lock gains before your brain talks you into one more spin. <strong>Level the playing field. Cuz math maths.</strong>
        </p>
        <div>
          <Link href="/touch-grass" className="footer-touchgrass-link">
            TOUCH GRASS PROTOCOL
          </Link>
        </div>
        <p className="footer-tagline" style={{ background: 'linear-gradient(to right, #ff3366, #22d3a6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '1px' }}>
          MADE FOR DEGENS. BY DEGENS.
        </p>
        {quote && (
          <p className="footer-quote" style={{ fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic', maxWidth: '560px', margin: '0 auto' }}>
            &quot;{quote}&quot;
          </p>
        )}
        <p className="footer-copyright">© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
