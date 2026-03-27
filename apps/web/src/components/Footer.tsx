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
        {/* The terminal will be re-implemented here */}
      </div>
      <div className="footer-columns">
        <div className="footer-col">
          <h4>The Edge</h4>
          <ul>
            <li><Link href="/features">All Tools</Link></li>
            <li><Link href="/how-it-works">Is the Game Rigged?</Link></li>
            <li><Link href="/trust-explained">Scan for Scams</Link></li>
            <li><Link href="/extension">Profit Guard</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>The Arena</h4>
          <ul>
            <li><Link href="/tools/justthetip">Community Tipping</Link></li>
            <li><Link href="/tools/daad">Trivia Arena</Link></li>
            <li><Link href="/tools/collectclock">Odds Audit</Link></li>
            <li><Link href="/scam-reports">Phish Logs</Link></li>
          </ul>
        </div>
        <div className="footer-col">
            <h4>Compliance</h4>
            <ul>
              <li><Link href="/legal/asset-risk">Asset Risk</Link></li>
              <li><Link href="/legal/responsible-gaming">Responsible Gaming</Link></li>
              <li><Link href="/terms/usage">Term of Service</Link></li>
              <li><Link href="/legal/non-advice">Non-Advice Disclosure</Link></li>
            </ul>
        </div>
        <div className="footer-col">
            <h4>Connect</h4>
            <ul>
              <li>
                <a href="https://discord.gg/s6NNfPHxMS" target="_blank" rel="noopener noreferrer">Discord Hub</a>
              </li>
              <li>
                <a href="https://github.com/jmenichole/tiltcheck-monorepo" target="_blank" rel="noopener noreferrer">The Source</a>
              </li>
            </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="footer-mission">
          <strong>THE MISSION:</strong> The house spent decades perfecting the math. We’re building the tools to level the playing field. TiltCheck is an audit layer and profit guard designed for those who want to play smarter and keep more of what they win.
        </p>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/touch-grass" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid #333', padding: '4px 12px', borderRadius: '20px' }}>
            TOUCH GRASS PROTOCOL
          </Link>
        </div>
        <p className="footer-tagline" style={{ background: 'linear-gradient(to right, #ff3366, #22d3a6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>
          BUILT FOR THE COMMUNITY.
        </p>
        {quote && (
          <p className="footer-quote" style={{ fontSize: '0.85rem', opacity: 0.6, fontStyle: 'italic', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
            &quot;{quote}&quot;
          </p>
        )}
        <p className="footer-copyright">TiltCheck Ecosystem &copy; 2024–2026</p>
      </div>
    </footer>
  );
};

export default Footer;
