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
            <li><Link href="/docs">How it Works</Link></li>
            <li><Link href="/tools/verify">Scan for Scams</Link></li>
            <li><Link href="/extension">Profit Guard</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>The Arena</h4>
          <ul>
            <li><Link href="/tools/justthetip">Community Tipping</Link></li>
            <li><Link href="/tools/auto-vault">Auto Vault</Link></li>
            <li><Link href="/tools/collectclock">Odds Audit</Link></li>
            <li><Link href="/casinos">Casino Scores</Link></li>
          </ul>
        </div>
        <div className="footer-col">
            <h4>Compliance</h4>
            <ul>
              <li><Link href="/legal/limit">Asset Risk</Link></li>
              <li><Link href="/touch-grass">Responsible Gaming</Link></li>
              <li><Link href="/terms">Term of Service</Link></li>
              <li><Link href="/terms">Non-Advice Disclosure</Link></li>
            </ul>
        </div>
        <div className="footer-col">
            <h4>Connect</h4>
            <ul>
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
          <strong>THE MISSION:</strong> THE HOUSE WINS BECAUSE THEY HAVE THE MATH AND YOU HAVE A DOPAMINE PROBLEM. BUT WE CAN COUNT TOO. TILTCHECK IS THE AUDIT LAYER BUILT TO TILT THE FAIRNESS SCALE BACK IN YOUR FAVOR. LEVEL THE PLAYING FIELD. CUZ MATH MATHS.
        </p>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/touch-grass" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid #333', padding: '4px 12px', borderRadius: '20px' }}>
            TOUCH GRASS PROTOCOL
          </Link>
        </div>
        <p className="footer-tagline" style={{ background: 'linear-gradient(to right, #ff3366, #22d3a6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>
          MADE FOR DEGENS BY DEGENS.
        </p>
        {quote && (
          <p className="footer-quote" style={{ fontSize: '0.85rem', opacity: 0.6, fontStyle: 'italic', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
            &quot;{quote}&quot;
          </p>
        )}
        <p className="footer-copyright">TiltCheck Ecosystem v2.0 — Made for Degens by Degens</p>
      </div>
    </footer>
  );
};

export default Footer;
