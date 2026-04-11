// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
import React from 'react';

const LiveStatusIndicator = ({ live = true }: { live?: boolean }) => {
  const statusClasses = live
    ? 'text-[color:var(--color-positive)]'
    : 'text-[color:var(--color-danger)] degraded';

  return (
    <div className={`live-status-indicator flex items-center gap-2 font-semibold text-sm tracking-wider ${statusClasses}`}>
      <svg
        className="status-icon w-3 h-3"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
      <span className="status-text">THE RADAR IS GREEN.</span>
    </div>
  );
};

export default LiveStatusIndicator;
