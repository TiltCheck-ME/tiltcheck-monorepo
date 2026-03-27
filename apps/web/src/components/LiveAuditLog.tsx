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
        <div className="audit-log-display mt-6 p-4 border border-[#1e2533] bg-[#0a0c10] font-mono text-sm text-[#00ffaa]">
          <div className="log-entry opacity-60">&gt; autovault: profit locked, 0.42 SOL.</div>
          <div className="log-entry opacity-60">&gt; odds: drift detected in Plinko. API logged.</div>
          <div className="log-entry opacity-80">&gt; linkguard: verified contract 0xAbe2... safe.</div>
          <div className="log-entry font-bold">&gt; audits: 142 cryptographic checks passed.</div>
          <div className="log-entry mt-2 animate-pulse text-white">_</div>
        </div>
      </div>
      <span className="absolute top-4 right-4 badge-live">Live</span>
    </div>
  );
};

export default LiveAuditLog;
