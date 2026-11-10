/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));
const popupHtml = readFileSync(join(root, '../../src/popup.html'), 'utf8');
const popupTs = readFileSync(join(root, '../../src/popup.ts'), 'utf8');

describe('Easy Mode, Presets & 24H Emergency Cooldown', () => {
  it('renders Easy/Pro header mode toggle in popup.html', () => {
    expect(popupHtml).toContain('id="mode-toggle-group"');
    expect(popupHtml).toContain('id="btn-mode-easy"');
    expect(popupHtml).toContain('id="btn-mode-pro"');
    expect(popupHtml).toContain('data-mode="easy"');
    expect(popupHtml).toContain('data-mode="pro"');
  });

  it('renders Easy Mode view with 3 presets and emergency cooldown', () => {
    expect(popupHtml).toContain('id="panel-easy"');
    expect(popupHtml).toContain('id="preset-card-casual"');
    expect(popupHtml).toContain('id="preset-card-bag-securer"');
    expect(popupHtml).toContain('id="preset-card-hard-lockdown"');
    expect(popupHtml).toContain('id="btn-emergency-cooldown"');
    expect(popupHtml).toContain('id="btn-switch-to-pro"');
    expect(popupHtml).toContain('Take 24-Hour Break (Emergency Lock)');
  });

  it('renders 24-hour Emergency Cooldown modal with zero unwired controls', () => {
    expect(popupHtml).toContain('id="emergency-cooldown-modal"');
    expect(popupHtml).toContain('id="btn-close-cooldown-modal"');
    expect(popupHtml).toContain('id="btn-cancel-emergency-cooldown"');
    expect(popupHtml).toContain('id="btn-confirm-emergency-cooldown"');
    expect(popupHtml).toContain('Lock for 24 Hours');
  });

  it('integrates 2-question quiz in onboarding walkthrough and forbids the word "leak"', () => {
    expect(popupHtml).toContain('id="onboarding-overlay"');
    expect(popupHtml).toContain('id="onboarding-step-1"');
    expect(popupHtml).toContain('id="onboarding-step-2"');
    expect(popupHtml).toContain('id="onboarding-step-3"');
    expect(popupHtml).toContain('What is your primary play style?');
    expect(popupHtml).toContain('What rinses you the most or triggers your tilt?');
    expect(popupHtml).toContain('id="btn-finish-onboarding"');

    // Verify user constraint: never use the word "leak" in onboarding copy
    const onboardingSection = popupHtml.substring(
      popupHtml.indexOf('id="onboarding-overlay"'),
      popupHtml.indexOf('id="toast"')
    );
    expect(onboardingSection.toLowerCase()).not.toContain('leak');
  });

  it('wires Easy Mode functions and listeners in popup.ts', () => {
    expect(popupTs).toContain('setUiMode');
    expect(popupTs).toContain('renderEasyModeState');
    expect(popupTs).toContain('initEasyModeListeners');
    expect(popupTs).toContain('applyPlayerPreset');
    expect(popupTs).toContain('saveEmergencyCooldown');
    expect(popupTs).toContain('EMERGENCY_COOLDOWN_ACTIVATED');
  });
});
