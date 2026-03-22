import Image from 'next/image';
import React from 'react';

const TerminalDashboard = () => {
  const statusItems = [
    { text: "Stake.com: $50 Daily Reload", status: "pass" },
    { text: "Roobet: 100% Weekly Match", status: "pass" },
    { text: "SlottyVegas: Bonus capped 5x", status: "warn" },
    { text: "BC.Game: Bonus paused", status: "fail" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <span className="status-icon status-icon-w">W</span>;
      case "warn": return <span className="status-icon status-icon-warn">!</span>;
      case "fail": return <span className="status-icon status-icon-l">L</span>;
      default: return null;
    }
  };

  return (
    <div className="terminal-box">
      <div className="terminal-prompt">
        <span className="prompt-prefix">$</span>
        <span className="prompt-text">LIVE BONUS SCANNER</span>
      </div>

      <div className="status-list">
        {statusItems.map((item, index) => (
          <div key={index} className={`status-item status-${item.status}`}>
            {getStatusIcon(item.status)}
            {item.text}
          </div>
        ))}
      </div>

      <div className="terminal-divider"></div>

      <div className="prediction-section">
        <div className="prompt-prefix">$</div>
        <span className="prompt-text">PREDICTION ENGINE</span>
      </div>

      <div className="vibe-check">
        <p>next refresh: <span id="countdown">2h 34m 12s</span></p>
        <p data-slang="vibe check">vibe check:
          <span className="vibe-bar-container">
            <span className="vibe-bar" style={{ width: '94%' }}></span>
          </span>
          <span className="vibe-percentage">94%</span>
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
          <h1 className="terminal-title" data-slang="DEGEN_OS">Terminal v1.2.1 // DEGEN_OS</h1>
          <p className="terminal-subtitle">bonus cycle intelligence</p>
        </div>
      </header>
      <section className="w-full max-w-4xl mx-auto mt-8">
        <TerminalDashboard />
      </section>
    </main>
  );
}
