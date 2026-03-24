import Link from 'next/link';
import React from 'react';

// This will be implemented as a separate component and hook
// const LiveTerminalStats = () => { ... };

const Footer = () => {
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
            <li><Link href="/extension">Emergency Brake</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>The Arena</h4>
          <ul>
            <li><Link href="/tools/justthetip">JustTheTip</Link></li>
            <li><Link href="/tools/daad">Degen Arena Game</Link></li>
            <li><Link href="/tools/collectclock">RTP Scanner</Link></li>
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
                <a href="https://discord.gg/s6NNfPHxMS" target="_blank" rel="noopener noreferrer">Discord Arena</a>
              </li>
              <li>
                <a href="https://github.com/jmenichole/tiltcheck-monorepo" target="_blank" rel="noopener noreferrer">The Source</a>
              </li>
            </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="footer-mission">
          <strong>THE MISSION:</strong> The house spent decades perfecting the math to rinse you. We’re building the tools to NUKE THE HOUSE EDGE. TiltCheck is an audit layer and emergency brake designed for degens who are tired of being cheated or liquidated by their own dopamine.
        </p>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/touch-grass" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid #333', padding: '4px 12px', borderRadius: '20px' }}>
            TOUCH GRASS PROTOCOL
          </Link>
        </div>
        <p className="footer-tagline" style={{ background: 'linear-gradient(to right, #ff3366, #22d3a6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>
          MADE FOR DEGENS. BY DEGENS.
        </p>
        <p className="footer-copyright">TiltCheck Ecosystem &copy; 2024–2026</p>
      </div>
    </footer>
  );
};

export default Footer;
