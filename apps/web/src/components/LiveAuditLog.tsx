import React from 'react';

const LiveAuditLog = () => {
  return (
    <div className="tool-card featured group relative p-6 flex flex-col justify-between bg-gray-900/50 border border-white/10 rounded-lg hover:border-[color:var(--color-primary)] hover:shadow-[0_0_30px_rgba(0,255,198,0.2)]">
      <div>
        <span className="category-label text-sm font-semibold uppercase tracking-wider text-[color:var(--color-primary)]">
          LIVE AUDIT LOG
        </span>
        <h3 className="neon-tool-name mt-2 text-xl font-bold text-white">
          Real-Time Audits
        </h3>
        {/* Terminal log simulation */}
        <div className="audit-log-display mt-4 font-mono text-sm text-gray-400">
          <div className="log-entry">&gt; autovault: bag secured.</div>
          <div className="log-entry">&gt; scan: casino is being weird.</div>
          <div className="log-entry">&gt; rtp: drift detected. be careful.</div>
          <div className="log-entry">&gt; verify: 142 checks passed.</div>
        </div>
      </div>
      <span className="absolute top-4 right-4 badge-live">Live</span>
    </div>
  );
};

export default LiveAuditLog;
