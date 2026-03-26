/* © 2026 TiltCheck Ecosystem. All Rights Reserved. */

/**
 * Reality Check HUD Styles (v2 Surgical Edition)
 */

export const HUD_STYLES = `
  #tiltcheck-v2-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 360px;
    height: 100vh;
    background: rgba(10, 12, 16, 0.95);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-left: 1px solid rgba(23, 195, 178, 0.3);
    z-index: 2147483647;
    color: #ffffff;
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  #tiltcheck-v2-sidebar.minimized {
    transform: translateX(320px);
  }

  /* --- Header --- */
  .hud-header {
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hud-logo {
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #17c3b2; /* Radiant Teal */
  }

  .hud-status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #17c3b2;
    box-shadow: 0 0 10px #17c3b2;
  }

  /* --- Content --- */
  .hud-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .hud-section-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 12px;
  }

  /* --- Live Feed --- */
  .live-feed-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 20px;
    border-radius: 4px;
  }

  .live-round-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .live-value {
    font-size: 20px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }

  .live-value.win { color: #17c3b2; }
  .live-value.bet { color: rgba(255, 255, 255, 0.9); }

  /* --- The Truth (RTP Card) --- */
  .truth-card {
    background: #000;
    border: 1px solid #ff003c; /* Neon Red */
    padding: 24px;
    border-radius: 0;
    box-shadow: 0 0 40px rgba(255, 0, 60, 0.15);
  }

  .truth-rtp-value {
    font-size: 48px;
    font-weight: 900;
    color: #ff003c;
    line-height: 1;
  }

  .truth-rtp-label {
    font-size: 12px;
    font-weight: 700;
    margin-top: 4px;
    color: #ff003c;
    opacity: 0.8;
  }

  /* --- Actions --- */
  .hud-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hud-btn {
    padding: 14px;
    border: none;
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    border-radius: 2px;
  }

  .hud-btn-primary { background: #17c3b2; color: #000; }
  .hud-btn-danger { background: #ff003c; color: #fff; }
  .hud-btn-secondary { background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid rgba(255, 255, 255, 0.1); }

  .hud-btn:hover { transform: translateY(-2px); filter: brightness(1.2); }

  /* --- Global Shifting --- */
  body.tiltcheck-sidebar-open {
    width: calc(100% - 360px) !important;
    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
`;
