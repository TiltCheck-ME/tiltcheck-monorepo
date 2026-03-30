import React from 'react';

const LiveAuditLog = () => {
  return (
    <div className="tool-card featured group relative p-6 flex flex-col justify-between bg-[#0E0E0F] border border-[#283347] rounded-none transition-none hover:-translate-y-1 hover:-translate-x-1 hover:border-[#00ffaa] hover:shadow-[4px_4px_0px_#00ffaa]">
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
            <span className="text-[#00ffaa]">&gt; 3 more degens decided to stop gambling blind. Welcome.</span>
            <span className="text-white opacity-60">|</span>
            <span className="text-[#17c3b2]">&gt; 12 people kept their bag tonight. That&apos;s the whole point.</span>
            <span className="text-white opacity-60">|</span>
            <span className="text-[#ffd700]">&gt; Scam site flagged before anyone clicked it. 6 wallets spared.</span>
          </div>
          <div className="log-entry mt-2 animate-pulse text-white">_</div>
        </div>
      </div>
      <span className="absolute top-4 right-4 badge-live">Live</span>
    </div>
  );
};

export default LiveAuditLog;
