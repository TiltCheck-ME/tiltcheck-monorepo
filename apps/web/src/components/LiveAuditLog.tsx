/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
import React from 'react';

const LiveAuditLog = () => {
  return (
    <div className="tool-card featured group relative p-6 flex flex-col justify-between bg-gradient-to-br from-[#0E0E0F] via-[#0a0c10] to-[#0a0c10] border-2 border-[#17c3b2]/40 rounded-none transition-all duration-300 hover:-translate-y-2 hover:-translate-x-2 hover:border-[#17c3b2] hover:shadow-[6px_6px_0px_rgba(23,195,178,0.5)]">
      <div>
        <span className="category-label text-sm font-semibold uppercase tracking-wider text-[color:var(--color-primary)]">
          LIVE AUDIT LOG
        </span>
        <h3 className="neon-tool-name mt-2 text-xl font-bold text-white uppercase">
          Real-Time Audits
        </h3>
        {/* Terminal log simulation */}
        <div className="audit-log-display mt-6 p-4 border border-[#1e2533] bg-[#0a0c10] font-mono text-sm overflow-hidden whitespace-nowrap">
          <div className="flex gap-12 animate-marquee">
            <span className="text-[#00ffaa]">&gt; 3 more degens decided to stop gambling blind. Good call.</span>
            <span className="text-white opacity-60">|</span>
            <span className="text-[#17c3b2]">&gt; 12 people kept their wins locked. That's the whole point.</span>
            <span className="text-white opacity-60">|</span>
            <span className="text-[#ffd700]">&gt; Scam domain flagged before it drained 6 wallets. Just doing our job.</span>
          </div>
          <div className="log-entry mt-2 animate-pulse text-white">_</div>
        </div>
      </div>
      <span className="absolute top-4 right-4 badge-live">Live</span>
    </div>
  );
};

export default LiveAuditLog;
