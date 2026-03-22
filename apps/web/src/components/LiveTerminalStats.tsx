'use client';
import React from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';

const LiveTerminalStats = () => {
  const displayText = useTypewriter();

  return (
    <div className="terminal-audit glass-panel" style={{ marginBottom: '4rem', maxWidth: '800px', marginInline: 'auto' }}>
      <div className="terminal-header" style={{ justifyContent: 'flex-start', gap: '8px', padding: '0.5rem', borderBottom: '1px solid var(--border-default)' }}>
        <span className="terminal-dot" style={{ backgroundColor: '#ef4444' }}></span>
        <span className="terminal-dot" style={{ backgroundColor: '#eab308' }}></span>
        <span className="terminal-dot" style={{ backgroundColor: '#22c55e' }}></span>
        <span className="terminal-title-text" style={{ color: '#8a97a8', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
          TILT_MONITOR.LOG
        </span>
      </div>
      <div className="terminal-body font-mono" style={{ minHeight: '60px', display: 'flex', alignItems: 'center', padding: '1rem' }}>
        <div className="audit-line" style={{ margin: '0', fontSize: '0.95rem' }}>
          <span className="audit-prompt" style={{ color: 'var(--color-accent)' }}>{'>'}</span> 
          <span id="vibe-typewriter" style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
            {displayText}
          </span>
          <span className="cursor" style={{ animation: 'blink 1s step-end infinite', color: 'var(--color-primary)' }}>_</span>
        </div>
      </div>
    </div>
  );
};

export default LiveTerminalStats;
