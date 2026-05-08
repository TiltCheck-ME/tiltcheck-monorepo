/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
import { buildLicensePresentation } from './license-verifier.js';
import type { CasinoVerification, LicensePresentation } from './license-verifier.js';

export const MOBILE_LICENSE_HUD_ID = 'tiltcheck-mobile-license-hud';
const MOBILE_LICENSE_HUD_STYLE_ID = 'tiltcheck-mobile-license-hud-style';
const BRAND_FOOTER = 'Made for Degens. By Degens.';

const TONE_STYLES: Record<LicensePresentation['tone'], { background: string; border: string; color: string }> = {
  verified: {
    background: 'rgba(6, 78, 59, 0.92)',
    border: 'rgba(110, 231, 183, 0.55)',
    color: '#d1fae5',
  },
  warning: {
    background: 'rgba(113, 63, 18, 0.94)',
    border: 'rgba(252, 211, 77, 0.58)',
    color: '#fef3c7',
  },
  risk: {
    background: 'rgba(127, 29, 29, 0.94)',
    border: 'rgba(252, 165, 165, 0.62)',
    color: '#fee2e2',
  },
  pending: {
    background: 'rgba(12, 74, 110, 0.92)',
    border: 'rgba(125, 211, 252, 0.55)',
    color: '#e0f2fe',
  },
};

function ensureMobileLicenseHudStyle(doc: Document): void {
  if (doc.getElementById(MOBILE_LICENSE_HUD_STYLE_ID)) {
    return;
  }

  const style = doc.createElement('style');
  style.id = MOBILE_LICENSE_HUD_STYLE_ID;
  style.textContent = `
    #${MOBILE_LICENSE_HUD_ID} {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 8px);
      left: 10px;
      right: 10px;
      z-index: 2147483646;
      display: none;
      min-height: 38px;
      padding: 9px 12px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 12px;
      box-sizing: border-box;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.3;
      letter-spacing: 0.01em;
      text-align: center;
      pointer-events: none;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 768px), (pointer: coarse) {
      #${MOBILE_LICENSE_HUD_ID} {
        display: block;
      }
    }
  `;
  doc.head.appendChild(style);
}

function ensureMobileLicenseHud(doc: Document): HTMLElement {
  ensureMobileLicenseHudStyle(doc);

  const existing = doc.getElementById(MOBILE_LICENSE_HUD_ID);
  if (existing) {
    return existing;
  }

  const hud = doc.createElement('div');
  hud.id = MOBILE_LICENSE_HUD_ID;
  hud.setAttribute('role', 'status');
  hud.setAttribute('aria-live', 'polite');
  hud.dataset.status = 'pending';
  doc.body.appendChild(hud);
  return hud;
}

export function updateMobileLicenseHud(
  verification: CasinoVerification | null | undefined,
  doc: Document = document,
): HTMLElement | null {
  if (!doc.body || !doc.head) {
    return null;
  }

  const presentation = buildLicensePresentation(verification);
  const hud = ensureMobileLicenseHud(doc);
  const toneStyle = TONE_STYLES[presentation.tone];

  hud.textContent = `${presentation.summary} | ${BRAND_FOOTER}`;
  hud.className = `tiltcheck-mobile-license-hud ${presentation.tone}`;
  hud.dataset.status = presentation.tone;
  hud.style.background = toneStyle.background;
  hud.style.borderColor = toneStyle.border;
  hud.style.color = toneStyle.color;

  return hud;
}
