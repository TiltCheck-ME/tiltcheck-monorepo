// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
/**
 * Generates official 1280x800 Chrome Web Store showcase screenshots.
 * Compliant with Google CWS graphic asset guidelines (24-bit PNG, 1280x800, no alpha).
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'apps/chrome-extension/promo/screenshots');
fs.mkdirSync(outDir, { recursive: true });

const popupDistPath = path.join(root, 'apps/chrome-extension/dist/popup.html');

function buildShowcaseHtml({ badge, title, highlightWord, description, features, scriptToRun = '' }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    width: 1280px;
    height: 800px;
    background: radial-gradient(circle at 65% 35%, #151b24 0%, #06080b 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    color: #fff;
  }
  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(23, 195, 178, 0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(23, 195, 178, 0.04) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }
  .glow-orb {
    position: absolute;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(23, 195, 178, 0.12) 0%, transparent 70%);
    top: 150px;
    right: 150px;
    pointer-events: none;
    filter: blur(40px);
  }
  .showcase-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 1140px;
    z-index: 2;
  }
  .info-side {
    max-width: 540px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(23, 195, 178, 0.12);
    border: 1px solid #17c3b2;
    color: #17c3b2;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 20px;
    font-family: ui-monospace, monospace;
  }
  h1 {
    font-size: 44px;
    line-height: 1.15;
    margin: 0 0 16px 0;
    letter-spacing: -0.025em;
    font-weight: 900;
  }
  h1 span {
    color: #17c3b2;
    text-shadow: 0 0 24px rgba(23, 195, 178, 0.35);
  }
  p.desc {
    font-size: 16px;
    line-height: 1.6;
    color: #94a3b8;
    margin: 0 0 28px 0;
  }
  .features-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .feat-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 14px;
    color: #e2e8f0;
    font-weight: 600;
    line-height: 1.4;
  }
  .feat-bullet {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #17c3b2;
    box-shadow: 0 0 8px #17c3b2;
    margin-top: 5px;
    flex-shrink: 0;
  }
  .frame-side {
    width: 380px;
    height: 600px;
    background: #080a0e;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: 0 25px 65px rgba(0, 0, 0, 0.85), 0 0 45px rgba(23, 195, 178, 0.18);
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
  }
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-orb"></div>
  <div class="showcase-container">
    <div class="info-side">
      <div class="badge">${badge}</div>
      <h1>${title} <span>${highlightWord}</span></h1>
      <p class="desc">${description}</p>
      <div class="features-list">
        ${features.map(f => `<div class="feat-item"><div class="feat-bullet"></div><div>${f}</div></div>`).join('\n')}
      </div>
    </div>
    <div class="frame-side">
      <iframe id="ext-frame" src="file:///${popupDistPath.replace(/\\/g, '/')}"></iframe>
    </div>
  </div>
  ${scriptToRun}
</body>
</html>`;
}

async function run() {
  console.log('Capturing Chrome Web Store 1280x800 screenshots...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  // 1. Screenshot 1: Guards & Spin Pace Brake
  console.log('Generating Screenshot 1: Guards & Spin Brake...');
  await page.setContent(buildShowcaseHtml({
    badge: 'Real-Time Harm Reduction',
    title: 'Active Guardrails &',
    highlightWord: 'Spin Brakes',
    description: 'Autonomous client-side guardrails that neutralize rapid-fire autoplay, rage-spinning, and accidental reverse-withdrawals in your casino browser tabs.',
    features: [
      '<strong>2-Second Spin Brake:</strong> Prevents autoplay loops and rapid click bursts.',
      '<strong>Reverse-Withdrawal Shield:</strong> Blocks cancel-cashout triggers on pending payouts.',
      '<strong>Default Bet Protection:</strong> Intercepts inflated initial stakes on page reload.',
      '<strong>100% Non-Custodial:</strong> Runs strictly in your browser with zero keys.'
    ],
  }), { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'screenshot-1-guards.png'), type: 'png' });

  // 2. Screenshot 2: Velocity Radar & Momentum
  console.log('Generating Screenshot 2: Velocity Radar...');
  await page.setContent(buildShowcaseHtml({
    badge: 'Session Telemetry',
    title: 'Velocity Radar &',
    highlightWord: 'Momentum',
    description: 'Instant visual telemetry translating casino credits into real-world hourly labor, rolling loss velocity ($/min), and win-streak volatility.',
    features: [
      '<strong>Loss Velocity Radar:</strong> Real-time vector sparkline tracking $/min burn rate.',
      '<strong>Streak & Volatility Spotter:</strong> Live hit rate and consecutive dead spin counter.',
      '<strong>Reality Cashout Goals:</strong> Reminders for real-world expenses (groceries, bills).',
      '<strong>Dual Currency Aware:</strong> Automatic Gold Coins vs Sweeps Cash discrimination.'
    ],
    scriptToRun: `
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            const iframe = document.getElementById('ext-frame');
            if (iframe && iframe.contentDocument) {
              const statusTab = iframe.contentDocument.querySelector('[data-tab="status"]');
              if (statusTab) statusTab.click();
            }
          }, 400);
        });
      </script>
    `
  }), { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'screenshot-2-radar.png'), type: 'png' });

  // 3. Screenshot 3: Cooldown & Tip Jar
  console.log('Generating Screenshot 3: Non-Custodial Tip Jar...');
  await page.setContent(buildShowcaseHtml({
    badge: 'Solana Cooldown & Support',
    title: 'Self-Exclusion &',
    highlightWord: 'Tip Jar',
    description: 'Immutable voluntary cooldowns anchored on Solana smart contracts, paired with a transparent non-custodial Tip Jar to keep all tools free for everyone.',
    features: [
      '<strong>On-Chain Cooldown Timelock:</strong> Cryptographically locked self-exclusion.',
      '<strong>Non-Custodial Tip Jar:</strong> Free and open-source harm reduction funded by voluntary tips.',
      '<strong>Solana Pay & SPL Support:</strong> Direct support for any Solana wallet.',
      '<strong>Zero Feature Gating:</strong> All safety controls remain 100% free forever.'
    ],
    scriptToRun: `
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            const iframe = document.getElementById('ext-frame');
            if (iframe && iframe.contentDocument) {
              const tipBtn = iframe.contentDocument.getElementById('btn-tip-jar');
              if (tipBtn) tipBtn.click();
            }
          }, 400);
        });
      </script>
    `
  }), { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'screenshot-3-cooldown-tipjar.png'), type: 'png' });

  await browser.close();
  console.log('Successfully generated all screenshots in:', outDir);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
