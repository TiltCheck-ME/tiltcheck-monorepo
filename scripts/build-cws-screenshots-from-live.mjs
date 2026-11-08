/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
/**
 * Generates official 1280x800 Chrome Web Store showcase screenshots
 * using the real unpacked extension captures from c:/Users/jmeni/Pictures/Screenshots.
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const repoOutDir = path.join(root, 'apps/chrome-extension/promo/screenshots');
const userUploadDir = 'C:/Users/jmeni/Pictures/Screenshots/cws-upload';

fs.mkdirSync(repoOutDir, { recursive: true });
fs.mkdirSync(userUploadDir, { recursive: true });

const screenshotsDir = 'C:/Users/jmeni/Pictures/Screenshots';

function getBase64Image(filename) {
  const filePath = path.join(screenshotsDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Screenshot not found: ${filePath}`);
  }
  const data = fs.readFileSync(filePath);
  return `data:image/png;base64,${data.toString('base64')}`;
}

function buildShowcaseHtml({ badge, title, highlightWord, description, features, imageBase64, imgStyle = '' }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
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
    background-image: linear-gradient(rgba(23, 195, 178, 0.05) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(23, 195, 178, 0.05) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }
  .glow-orb {
    position: absolute;
    width: 520px;
    height: 520px;
    background: radial-gradient(circle, rgba(23, 195, 178, 0.14) 0%, transparent 70%);
    top: 140px;
    right: 140px;
    pointer-events: none;
    filter: blur(44px);
  }
  .showcase-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 1140px;
    z-index: 2;
  }
  .info-side {
    max-width: 560px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
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
    font-size: 42px;
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
    font-size: 15.5px;
    line-height: 1.6;
    color: #94a3b8;
    margin: 0 0 26px 0;
  }
  .features-list {
    display: flex;
    flex-direction: column;
    gap: 13px;
  }
  .feat-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 13.5px;
    color: #e2e8f0;
    font-weight: 500;
    line-height: 1.45;
  }
  .feat-item strong {
    color: #ffffff;
    font-weight: 700;
  }
  .feat-bullet {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #17c3b2;
    box-shadow: 0 0 8px #17c3b2;
    margin-top: 6px;
    flex-shrink: 0;
  }
  .frame-side {
    width: 392px;
    height: 590px;
    background: #080a0e;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 25px 65px rgba(0, 0, 0, 0.85), 0 0 45px rgba(23, 195, 178, 0.18);
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .frame-side img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
    ${imgStyle}
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
      <img src="${imageBase64}" alt="TiltCheck Extension Interface" />
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('Generating Chrome Web Store 1280x800 showcase screenshots from live captures...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  const shots = [
    {
      filename: 'screenshot-1-guards.png',
      sourceImage: 'Screenshot 2026-11-08 153738.png',
      badge: 'Real-Time Harm Reduction',
      title: 'Active Guardrails &',
      highlightWord: 'Spin Brakes',
      description: 'Autonomous client-side guardrails that neutralize rapid-fire autoplay, rage-spinning, and accidental high stakes on supported casino tabs.',
      features: [
        '<strong>2-Second Spin Brake:</strong> Enforces deliberate pauses to break the rapid-spin trance.',
        '<strong>Default Bet Protection:</strong> Intercepts inflated house stakes on game load and page refresh.',
        '<strong>100% Non-Custodial:</strong> Runs strictly in your browser sandbox with zero keys or custody.',
        '<strong>Multi-Platform Support:</strong> Active on Stake, Roobet, and major sweepstakes casinos.'
      ]
    },
    {
      filename: 'screenshot-2-radar.png',
      sourceImage: 'Screenshot 2026-11-08 153814.png',
      badge: 'Session Telemetry',
      title: 'Velocity Radar &',
      highlightWord: 'Streak Spotter',
      description: 'Real-time on-device telemetry translating casino chips into hourly labor, rolling burn rate ($/min), and streak volatility.',
      features: [
        '<strong>Session Velocity Radar:</strong> Real-time tracking of $/min burn rate and session drawdown.',
        '<strong>Streak & Volatility Spotter:</strong> Live hit rate monitoring and consecutive dead-spin counter.',
        '<strong>Reality Cashout Goals:</strong> Anchors progress to real-world expenses (gas, groceries, rent).',
        '<strong>Zero Data Collection:</strong> All metrics computed locally in-memory without remote tracking.'
      ]
    },
    {
      filename: 'screenshot-3-sweeps-currency.png',
      sourceImage: 'Screenshot 2026-11-08 153724.png',
      badge: 'Sweepstakes Intelligence',
      title: 'Sweeps (SC) vs',
      highlightWord: 'Gold Coins (GC)',
      description: 'Smart currency discrimination that automatically distinguishes real-money Sweeps Cash from free-play Gold Coins to eliminate false alarms.',
      features: [
        '<strong>Dual-Currency Detection:</strong> Senses active currency toggle on sweepstakes platforms.',
        '<strong>Zero False Alarms:</strong> Cashout goals and drawdown alarms pause during free-play GC mode.',
        '<strong>Supported Sweepstakes:</strong> Stake.us, Crown Coins, Pulsz, Chumba, McLuck, WOW Vegas.',
        '<strong>Autonomous Onboarding:</strong> Streamlined setup tailored for social and crypto players.'
      ]
    },
    {
      filename: 'screenshot-4-cooldown-barrier.png',
      sourceImage: 'Screenshot 2026-11-08 153745.png',
      badge: 'On-Chain Self-Exclusion',
      title: 'Deposit Barrier &',
      highlightWord: 'Solana Cooldown',
      description: 'Lock casino cashier buttons and spin triggers with on-device deposit containment, synchronized against immutable Solana on-chain timelocks.',
      features: [
        '<strong>Deposit Barrier:</strong> Blocks cashier and buy buttons while a cooldown lock is active.',
        '<strong>Solana Devnet Sync:</strong> Verifies cryptographic timelocks signed via non-custodial wallets.',
        '<strong>Level 3+ Tilt Auto-Lock:</strong> Automatic 24-hour containment when high tilt is detected.',
        '<strong>Reality HUD Equivalence:</strong> Translates session losses into real-world working hours.'
      ]
    },
    {
      filename: 'screenshot-5-client-seed.png',
      sourceImage: 'Screenshot 2026-11-08 153800.png',
      badge: 'Provably Fair Hygiene',
      title: 'CSPRNG Seeds &',
      highlightWord: 'Fairness Manager',
      description: 'Cryptographically secure client seed rotation and Shannon entropy monitoring directly on your device without operator defaults.',
      features: [
        '<strong>CSPRNG Entropy Generator:</strong> Produces strong 184+ bit cryptographic client seeds.',
        '<strong>1-Click Seed Rotation:</strong> Seamlessly injects fresh client seeds into active casino tabs.',
        '<strong>Rotation Audit History:</strong> Tracks timestamped rotation counts and verification records.',
        '<strong>Zero Custody:</strong> Pure client-side entropy with zero operator reliance.'
      ],
      imgStyle: 'margin-top: -24px; height: calc(100% + 24px);'
    }
  ];

  for (const shot of shots) {
    console.log(`Rendering ${shot.filename}...`);
    const imageBase64 = getBase64Image(shot.sourceImage);
    const html = buildShowcaseHtml({
      badge: shot.badge,
      title: shot.title,
      highlightWord: shot.highlightWord,
      description: shot.description,
      features: shot.features,
      imageBase64,
      imgStyle: shot.imgStyle || ''
    });

    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    const repoPath = path.join(repoOutDir, shot.filename);
    const userPath = path.join(userUploadDir, shot.filename);

    await page.screenshot({ path: repoPath, type: 'png' });
    await page.screenshot({ path: userPath, type: 'png' });
    console.log(`Saved: ${shot.filename} -> ${repoPath} & ${userPath}`);
  }

  await browser.close();
  console.log('All 5 official 1280x800 Chrome Web Store screenshots generated successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
