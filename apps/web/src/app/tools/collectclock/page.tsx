/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
import Image from 'next/image';
import React from 'react';

const TerminalDashboard = () => {
  return (
    <div className="terminal-box">
      <div className="terminal-prompt">
        <span className="prompt-prefix">$</span>
        <span className="prompt-text">SCANNING FOR CRUMBS...</span>
      </div>

      <div className="status-list">
        <div className="p-4 text-center text-xs font-mono text-gray-600">
          NO LIVE DATA. Connect your casino accounts via the Chrome extension to see live bonus status.
        </div>
      </div>

      <div className="terminal-divider"></div>

      <div className="prediction-section">
        <div className="prompt-prefix">$</div>
        <span className="prompt-text">CRYSTAL BALL SAYS...</span>
      </div>

      <div className="vibe-check">
        <p>next hit of dopamine: <span id="countdown" className="text-gray-600">— connect accounts to enable —</span></p>
        <p data-slang="vibe check">delusion check:
          <span className="text-gray-600 font-mono text-xs ml-2">N/A</span>
        </p>
      </div>

      <div className="terminal-actions">
        <button className="btn btn-secondary" data-action="export">
          <Image src="/assets/icons/ui/export.svg" alt="Export" width={20} height={20} className="btn-icon" />
          EXPORT CSV
        </button>
        <button className="btn btn-secondary" data-action="copy">
          <Image src="/assets/icons/ui/copy.svg" alt="Copy" width={20} height={20} className="btn-icon" />
          COPY
        </button>
        <button className="btn btn-secondary" data-action="alerts">
          <Image src="/assets/icons/ui/alert.svg" alt="Alerts" width={20} height={20} className="btn-icon" />
          ALERTS
        </button>
      </div>
    </div>
  );
};

export default function CollectClockPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      <header className="tool-header terminal-header">
        <div className="container mx-auto text-center">
          <h1 className="terminal-title" data-slang="DEGEN_OS">The Grind // Your Bonus-Hunting Dashboard.</h1>
          <p className="terminal-subtitle">Because your time is worthless, but a $5 bonus is a $5 bonus.</p>
        </div>
      </header>
      <section className="w-full max-w-4xl mx-auto mt-8">
        <TerminalDashboard />
      </section>
    </main>
  );
}
