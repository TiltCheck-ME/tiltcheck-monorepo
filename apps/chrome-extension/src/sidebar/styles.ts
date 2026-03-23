/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SIDEBAR_WIDTH, MINIMIZED_WIDTH } from './constants.js';

export const getSidebarStyles = () => `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

    #tiltcheck-sidebar {
      --tg-bg: rgba(8, 10, 14, 0.85); 
      --tg-surface: rgba(255, 255, 255, 0.04);
      --tg-surface-strong: rgba(255, 255, 255, 0.08);
      --tg-border: rgba(255, 255, 255, 0.1);
      --tg-text: #ffffff;
      --tg-muted: rgba(160, 175, 190, 0.6);
      --tg-primary: #17c3b2; /* Radiant Teal */
      --tg-primary-glow: rgba(23, 195, 178, 0.4);
      --tg-danger: #ff003c; /* Neon Red Rebuttal */
      --tg-danger-glow: rgba(255, 0, 60, 0.4);
      --tg-warning: #fbbf24;
      
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: ${SIDEBAR_WIDTH}px;
      height: 100vh;
      background: var(--tg-bg); 
      backdrop-filter: blur(24px);
      color: var(--tg-text);
      z-index: 2147483647 !important;
      font-family: 'Space Grotesk', -apple-system, sans-serif;
      box-shadow: -10px 0 60px rgba(0, 0, 0, 0.9);
      overflow-y: auto;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      border-left: 1px solid var(--tg-border);
    }
    #tiltcheck-sidebar.minimized { transform: translateX(${SIDEBAR_WIDTH - MINIMIZED_WIDTH}px); width: ${MINIMIZED_WIDTH}px; }
    body.tiltcheck-minimized { margin-right: ${MINIMIZED_WIDTH}px !important; }
    #tiltcheck-sidebar::-webkit-scrollbar { width: 6px; }
    #tiltcheck-sidebar::-webkit-scrollbar-track { background: transparent; }
    #tiltcheck-sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
    
    .tg-header {
      padding: 24px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--tg-border);
      position: sticky;
      top: 0;
      background: rgba(8, 10, 14, 0.4);
      backdrop-filter: blur(12px);
      z-index: 100;
    }
    .tg-logo {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .tg-logo-mark {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: #fff;
      color: #000;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 12px;
    }
    .tg-header-actions { display: flex; gap: 6px; align-items: center; }
    .tg-header-btn {
      background: var(--tg-surface);
      border: 1px solid var(--tg-border);
      color: var(--tg-text);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .tg-header-btn:hover { 
      background: var(--tg-surface-strong); 
      border-color: var(--tg-primary);
      transform: translateY(-1px);
    }
    #tiltcheck-sidebar:not(.tg-show-advanced) .tg-advanced-only { display: none !important; }
    
    .tg-content { padding: 12px; }
    .tg-section { 
      margin-bottom: 16px; 
      padding: 16px; 
      background: var(--tg-surface); 
      border-radius: 16px; 
      border: 1px solid var(--tg-border); 
      transition: border-color 0.2s;
    }
    .tg-section:hover { border-color: rgba(255, 255, 255, 0.15); }
    .tg-section h4 { 
      margin: 0 0 12px 0; 
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px; 
      font-weight: 700; 
      color: var(--tg-muted); 
      text-transform: uppercase; 
      letter-spacing: 0.1em; 
    }
    .tg-emergency { border: 1px solid rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.08); }
    .tg-emergency-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .tg-emergency-title { font-weight: 700; font-size: 13px; }
    .tg-emergency-sub { font-size: 11px; opacity: 0.7; margin-top: 2px; }
    
    .tg-auth-prompt { text-align: center; padding: 40px 20px; }
    .tg-auth-prompt h3 { font-size: 18px; margin-bottom: 8px; font-weight: 600; }
    .tg-auth-prompt p { font-size: 13px; opacity: 0.8; margin-bottom: 16px; line-height: 1.45; }
    .tg-auth-divider { margin: 14px 0; text-align: center; opacity: 0.4; font-size: 12px; }
    
    .tg-user-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 12px;
    }
    .tg-account-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin: -6px 0 12px;
      padding: 8px 10px;
      background: rgba(0, 168, 255, 0.1);
      border: 1px solid rgba(0, 168, 255, 0.3);
      border-radius: 10px;
      font-size: 11px;
      line-height: 1.35;
    }
    .tg-focus-note {
      margin: -4px 0 12px;
      padding: 8px 10px;
      font-size: 11px;
      opacity: 0.78;
      border-left: 2px solid rgba(0, 212, 170, 0.6);
      background: rgba(0, 212, 170, 0.08);
      border-radius: 0 8px 8px 0;
    }
    .tg-user-info { display: flex; gap: 8px; align-items: center; font-size: 13px; }
    .tg-tier { padding: 2px 8px; background: rgba(168, 85, 247, 0.2); border-radius: 3px; font-size: 11px; color: #c4b5fd; }
    .tg-btn-icon {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 20px;
      cursor: pointer;
      width: 24px;
      height: 24px;
      padding: 0;
      line-height: 1;
    }
    .tg-btn-icon:hover { color: rgba(255, 255, 255, 0.8); }
    
    .tg-settings-panel {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .tg-settings-panel h4 { margin: 0 0 12px 0; font-size: 13px; }
    .tg-input-group { margin-bottom: 12px; }
    .tg-input-group label { display: block; font-size: 12px; margin-bottom: 4px; opacity: 0.7; }
    .tg-input-group input {
      width: 100%;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #e1e8ed;
      font-size: 12px;
    }
    .tg-input-group input:focus { outline: none; border-color: var(--tg-primary); }
    
    .tg-metrics-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--tg-border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    @keyframes gradientBG {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .tg-metrics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .tg-session-site { 
      font-size: 10px; 
      opacity: 0.5; 
      margin-top: 4px; 
      text-transform: uppercase; 
      letter-spacing: 0.05em;
    }
    .tg-metric-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .tg-tilt-value { color: var(--tg-primary); }
    .tg-tilt-value.warning { color: var(--tg-warning); }
    .tg-tilt-value.critical { color: var(--tg-danger); }
    
    .tg-graph {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      padding: 10px;
      height: 130px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .tg-feed {
      max-height: 148px;
      overflow-y: auto;
      font-size: 12px;
    }
    .tg-feed-item {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      opacity: 0.7;
    }
    .tg-feed-item:last-child { border-bottom: none; }
    
    .tg-action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .tg-advanced-toggle {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 11px;
      padding: 8px 10px;
    }
    .tg-action-btn {
      background: var(--tg-surface);
      border: 1px solid var(--tg-border);
      color: var(--tg-text);
      padding: 10px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s;
      text-align: left;
    }
    .tg-action-btn:hover { background: var(--tg-surface-strong); border-color: var(--tg-primary); transform: translateY(-1px); }
    
    .tg-vault-amount {
      font-size: 24px;
      font-weight: 700;
      color: var(--tg-primary);
      margin-bottom: 12px;
      font-variant-numeric: tabular-nums;
    }
    .tg-goal-progress { margin-bottom: 10px; }
    .tg-goal-label { font-size: 11px; opacity: 0.7; margin-bottom: 6px; }
    .tg-goal-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
    .tg-goal-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #10b981); width: 0%; transition: width 0.4s ease; }
    .tg-goal-meta { font-size: 10px; opacity: 0.6; margin-top: 4px; }
    .tg-vault-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .tg-btn {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
      border: none;
      border-radius: 10px;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 13px;
    }
    .tg-btn-inline {
      width: auto;
      margin-top: 0;
      padding: 6px 10px;
      font-size: 11px;
      white-space: nowrap;
    }
    .tg-btn-primary { background: var(--tg-primary); color: #000; }
    .tg-btn-primary:hover { background: #00b390; }
    .tg-btn-secondary { background: var(--tg-surface); border: 1px solid var(--tg-border); }
    .tg-btn-secondary:hover { background: var(--tg-surface-strong); border-color: var(--tg-secondary); }
    .tg-btn-vault { background: var(--tg-primary); color: #000; font-weight: 700; }
    .tg-btn-vault:hover { background: #00b390; }
    .tg-btn-danger { background: var(--tg-danger); }
    .tg-btn-danger:hover { background: #dc2626; }
    #tg-discord-login, #tg-connect-discord-inline { background: var(--tg-accent); border: 1px solid rgba(255,255,255,0.12); color: #fff;}
    #tg-discord-login:hover, #tg-connect-discord-inline:hover { background: #9333ea; }
    .tg-toast {
      position: fixed;
      right: 16px;
      bottom: 16px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px);
      color: var(--tg-text);
      border: 1px solid rgba(255,255,255,0.12);
      border-left: 3px solid var(--tg-accent);
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12px;
      max-width: 260px;
      z-index: 2147483647;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      animation: toastIn 0.2s ease;
    }
    @keyframes toastIn {
      from { transform: translateY(6px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    #tiltcheck-sidebar.tilt-warn {
      box-shadow: -2px 0 12px rgba(245, 158, 11, 0.35);
      border-left-color: var(--tg-warning);
      animation: pulseBorder 2.2s ease-in-out infinite;
    }
    #tiltcheck-sidebar.tilt-critical {
      background: rgba(127, 29, 29, 0.85);
      box-shadow: -2px 0 16px rgba(239, 68, 68, 0.45);
      border-left-color: var(--tg-danger);
    }
    #tiltcheck-sidebar.tilt-critical .tg-emergency { border-color: var(--tg-danger); }
    #tiltcheck-sidebar.tilt-critical #tg-emergency-lock { animation: shake 0.6s ease-in-out infinite; }
    @keyframes pulseBorder {
      0% { border-left-color: rgba(245, 158, 11, 0.3); box-shadow: -2px 0 8px rgba(245, 158, 11, 0.15); }
      50% { border-left-color: rgba(245, 158, 11, 0.75); box-shadow: -2px 0 14px rgba(245, 158, 11, 0.35); }
      100% { border-left-color: rgba(245, 158, 11, 0.3); box-shadow: -2px 0 8px rgba(245, 158, 11, 0.15); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }
    .tg-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px; }
    .tg-tab { flex: 1; background: none; border: none; color: rgba(255,255,255,0.5); padding: 8px; cursor: pointer; border-bottom: 2px solid transparent; font-size: 12px; font-weight: 600; }
    .tg-tab.active { color: #fff; border-bottom-color: var(--tg-secondary); }
    .tg-history-item { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px; background: rgba(255,255,255,0.02); margin-bottom: 4px; border-radius: 4px; }
    .tg-history-header { display: flex; justify-content: space-between; margin-bottom: 4px; opacity: 0.7; }
    .tg-history-result { font-weight: bold; color: var(--tg-primary); }
    .tg-license-strip {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      background: rgba(0, 168, 255, 0.1);
      color: #7dd3fc;
    }
    .tg-license-strip.verified { background: rgba(16, 185, 129, 0.18); color: #6ee7b7; }
    .tg-license-strip.warning { background: rgba(245, 158, 11, 0.18); color: #fcd34d; }
    .tg-license-strip.risk { background: rgba(239, 68, 68, 0.18); color: #fca5a5; }
    .tg-license-strip.pending { background: rgba(0, 168, 255, 0.1); color: #7dd3fc; }
    .tg-status-bar { padding: 8px 12px; font-size: 11px; font-weight: 600; text-align: center; animation: slideDown 0.3s ease; }
    .tg-status-bar.thinking { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-bottom: 1px solid rgba(59, 130, 246, 0.3); }
    .tg-status-bar.success { background: rgba(34, 211, 166, 0.2); color: #34d399; border-bottom: 1px solid rgba(34, 211, 166, 0.3); }
    .tg-status-bar.warning { background: rgba(245, 158, 11, 0.2); color: #fcd34d; border-bottom: 1px solid rgba(245, 158, 11, 0.3); }
    .tg-status-bar.danger { background: rgba(239, 68, 68, 0.2); color: #f87171; border-bottom: 1px solid rgba(239, 68, 68, 0.3); }
    .tg-status-bar.buddy { background: rgba(168, 85, 247, 0.2); color: #c084fc; border-bottom: 1px solid rgba(168, 85, 247, 0.3); }
    .tg-vault-timeline { max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .tg-vault-timeline-item {
      font-size: 11px;
      line-height: 1.35;
      padding: 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tg-vault-timeline-row { display: flex; justify-content: space-between; gap: 8px; }
    .tg-vault-timeline-action { font-weight: 600; color: #fbbf24; }
    .tg-vault-timeline-time { opacity: 0.7; font-size: 10px; white-space: nowrap; }
    .tg-vault-timeline-meta { opacity: 0.75; margin-top: 2px; font-size: 10px; }
    .tg-vault-timeline-empty { opacity: 0.6; font-size: 11px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; }
    .tg-brand-footer {
      margin: 2px 0 16px;
      text-align: center;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--tg-muted);
      opacity: 0.75;
    }
    @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .nonce-flash { animation: flashGreen 1s ease; }
    @keyframes flashGreen {
      0% { background-color: rgba(16, 185, 129, 0.5); }
      100% { background-color: rgba(0, 0, 0, 0.3); }
    }

    /* Predictor Styles */
    .predictor-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .predictor-card.critical {
      border-color: var(--tg-primary);
      background: rgba(0, 212, 170, 0.05);
    }
    .predictor-card .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .source-tag {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      color: #fff;
    }
    .tag-instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
    .tag-x { background: #000; border: 1px solid rgba(255,255,255,0.2); }
    .tag-telegram { background: #0088cc; }
    .confidence-tag { font-size: 10px; opacity: 0.6; }
    .drop-label { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .drop-timer { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--tg-primary); }
    .critical-glow {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(circle at center, rgba(0, 212, 170, 0.15) 0%, transparent 70%);
      animation: pulseGlow 2s infinite;
      pointer-events: none;
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
    }

    /* Onboarding Styles */
    #onboarding-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(circle var(--spot-r) at var(--spot-x) var(--spot-y), transparent 99%, rgba(0,0,0,0.85) 100%);
      z-index: 2147483647;
      display: none;
      pointer-events: none;
    }
    #onboarding-overlay.active { display: block; pointer-events: all; }
    .onboarding-tooltip {
      position: absolute;
      width: 240px;
      background: #1a1a1a;
      border: 1px solid var(--tg-primary);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      color: #fff;
      pointer-events: all;
      animation: tooltipPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes tooltipPop {
      from { transform: scale(0.9) translateY(10px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    .tooltip-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--tg-primary); }
    .tooltip-body { font-size: 12px; line-height: 1.5; margin-bottom: 12px; opacity: 0.9; }
    .tooltip-footer { display: flex; justify-content: space-between; align-items: center; }
    .tooltip-progress { font-size: 11px; opacity: 0.5; }
    .tooltip-actions { display: flex; gap: 8px; }
    .tooltip-btn {
      background: var(--tg-surface);
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
    }
    .tooltip-btn.primary { background: var(--tg-primary); color: #000; font-weight: 700; border: none; }

    /* Vibe Check Overlay */
    #tg-vibe-check-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.95);
      z-index: 2147483647;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      animation: fadeIn 0.4s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    #tg-vibe-check-overlay h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 32px;
      color: #ff3366;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
      text-shadow: 0 0 20px rgba(255, 51, 102, 0.4);
    }
    
    .vibe-check-gif-container {
      width: 280px;
      height: 280px;
      background: #111;
      margin-bottom: 30px;
      border: 3px solid #ff3366;
      box-shadow: 0 0 40px rgba(255, 51, 102, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 20px;
      transform: rotate(-2deg);
    }
    
    .tg-btn-outline {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .tg-btn-outline:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #fff;
    }

    /* Toggle Switch Styles */
    .tg-toggle-wrapper {
      position: relative;
      width: 44px;
      height: 22px;
    }
    .tg-toggle-input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .tg-toggle-label {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--tg-surface-strong);
      border: 1px solid var(--tg-border);
      border-radius: 22px;
      cursor: pointer;
      transition: .3s;
    }
    .tg-toggle-label:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: var(--tg-muted);
      border-radius: 50%;
      transition: .3s;
    }
    .tg-toggle-input:checked + .tg-toggle-label {
      background-color: var(--tg-primary);
      border-color: var(--tg-primary);
    }
    /* HUD Typography & Spacing */
    .tg-hud-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--tg-primary);
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin: 0 0 4px 0;
    }
    .tg-hud-title {
      font-size: 1.4rem;
      font-weight: 800;
      line-height: 1.1;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .tg-metric-stack {
      margin-top: 24px;
      padding: 0;
    }
    .tg-drift-main {
      display: flex;
      flex-direction: column;
      margin-top: 8px;
    }
    .tg-drift-value {
      font-size: 3.5rem;
      font-weight: 900;
      color: var(--tg-primary);
      line-height: 0.9;
      letter-spacing: -0.04em;
      font-family: 'Space Grotesk', sans-serif;
      /* Subtle surgical glow */
      text-shadow: 0 0 20px var(--tg-primary-glow);
    }
    .tg-drift-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--tg-primary);
      opacity: 0.8;
      margin-top: 4px;
      letter-spacing: 0.1em;
    }
    .tg-metric-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--tg-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tg-metric-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      margin-top: 2px;
    }
    .tg-metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
`;
