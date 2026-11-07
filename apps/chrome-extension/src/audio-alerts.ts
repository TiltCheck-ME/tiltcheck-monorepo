/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-05 */

/**
 * audio-alerts.ts
 *
 * Subtle, non-intrusive cyber-audio cues for TiltCheck Chrome Extension.
 * Provides auditory reinforcement for:
 * 1. Spin-Pace Lock ('spin_brake'): Soft thud when a user clicks during the 2s cooldown.
 * 2. Dead-Spin Runs ('cold_warn'): Soft chime at 10 consecutive dead spins.
 * 3. Gambler's Fallacy Trap ('due_trap'): Descending pulse on stake escalation or 18 dead spins.
 * 4. Win-Streak / Profit Ratchet ('heater_alert'): Bright ascending two-tone on 4+ win streak.
 * 5. Cooldown / Touch Grass ('cooldown_chime'): Calm harmonic chime on lockout overlay.
 * 6. UI Interactions ('click'): Subtle 15ms cyber-tick.
 *
 * Built entirely with standard browser Web Audio API:
 * - Zero external asset dependencies (.mp3/.wav files).
 * - Zero network latency or CORS blocks on casino websites.
 * - Safely fails silently if Web Audio is restricted or in headless test environments.
 * - Respects player mute/volume preferences in chrome.storage.local.
 */

export type AudioCueType =
  | 'spin_brake'
  | 'cold_warn'
  | 'due_trap'
  | 'heater_alert'
  | 'cooldown_chime'
  | 'click';

export interface AudioAlertsConfig {
  enabled: boolean;
  volume: number; // 0.0 to 1.0 (default: 0.25)
}

export const TILTCHECK_AUDIO_ALERTS_CONFIG_KEY = 'tiltcheck_audio_alerts_config';

export const DEFAULT_AUDIO_ALERTS_CONFIG: AudioAlertsConfig = {
  enabled: true,
  volume: 0.25,
};

// In-memory config cache for instantaneous synchronous checks
let cachedConfig: AudioAlertsConfig = { ...DEFAULT_AUDIO_ALERTS_CONFIG };
let globalAudioCtx: AudioContext | null = null;

export function getAudioAlertsConfigSync(): AudioAlertsConfig {
  return cachedConfig;
}

export function setAudioAlertsConfigSync(config: AudioAlertsConfig): void {
  cachedConfig = {
    enabled: Boolean(config.enabled),
    volume: Math.max(0, Math.min(1, typeof config.volume === 'number' ? config.volume : DEFAULT_AUDIO_ALERTS_CONFIG.volume)),
  };
}

/**
 * Loads audio settings from chrome.storage.local with defaults.
 */
export async function loadAudioAlertsConfig(): Promise<AudioAlertsConfig> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return cachedConfig;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([TILTCHECK_AUDIO_ALERTS_CONFIG_KEY], (res) => {
      const saved = res?.[TILTCHECK_AUDIO_ALERTS_CONFIG_KEY] as Partial<AudioAlertsConfig> | undefined;
      if (saved) {
        cachedConfig = {
          enabled: saved.enabled ?? DEFAULT_AUDIO_ALERTS_CONFIG.enabled,
          volume: Math.max(0, Math.min(1, typeof saved.volume === 'number' ? saved.volume : DEFAULT_AUDIO_ALERTS_CONFIG.volume)),
        };
      }
      resolve(cachedConfig);
    });
  });
}

/**
 * Saves audio settings to chrome.storage.local.
 */
export async function saveAudioAlertsConfig(
  updates: Partial<AudioAlertsConfig>
): Promise<AudioAlertsConfig> {
  const merged: AudioAlertsConfig = {
    enabled: updates.enabled ?? cachedConfig.enabled,
    volume: Math.max(0, Math.min(1, typeof updates.volume === 'number' ? updates.volume : cachedConfig.volume)),
  };
  cachedConfig = merged;

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [TILTCHECK_AUDIO_ALERTS_CONFIG_KEY]: merged });
  }

  return merged;
}

/**
 * Safely acquires or resumes standard AudioContext.
 */
export function getOrCreateAudioContext(audioContextOverride?: AudioContext | null): AudioContext | null {
  if (audioContextOverride !== undefined) {
    return audioContextOverride;
  }

  if (typeof window === 'undefined') return null;

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return null;

  try {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes and plays a designated audio cue using Web Audio API oscillators.
 */
export function playAudioCue(
  cue: AudioCueType,
  customVolume?: number,
  audioContextOverride?: AudioContext | null
): boolean {
  if (!cachedConfig.enabled) {
    return false;
  }

  const ctx = getOrCreateAudioContext(audioContextOverride);
  if (!ctx) {
    return false;
  }

  const baseVolume = typeof customVolume === 'number' ? customVolume : cachedConfig.volume;
  const clampedVol = Math.max(0, Math.min(1, baseVolume));
  if (clampedVol <= 0) {
    return false;
  }

  try {
    const now = ctx.currentTime;

    switch (cue) {
      case 'spin_brake': {
        // Soft 80ms dual-tone: 440Hz -> 330Hz with gentle thud decay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(clampedVol * 0.7, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
        return true;
      }

      case 'cold_warn': {
        // Soft 120ms warning tone: 520Hz with soft attack and decay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(clampedVol * 0.8, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
        return true;
      }

      case 'due_trap': {
        // Stepped descending triple-tone: 660Hz (0.05s) -> 440Hz (0.05s) -> 310Hz (0.08s)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(440, now + 0.05);
        osc.frequency.setValueAtTime(310, now + 0.10);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(clampedVol * 0.5, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
        return true;
      }

      case 'heater_alert': {
        // Bright ascending two-tone: 587Hz (D5) -> 880Hz (A5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.06);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(clampedVol * 0.8, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.14);
        return true;
      }

      case 'cooldown_chime': {
        // Relaxing ambient harmonic: 528Hz Solfeggio fundamental + 792Hz overtone (350ms)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(528, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(792, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(clampedVol * 0.6, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
        return true;
      }

      case 'click': {
        // 15ms cyber-tick: 800Hz with fast exponential decay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);

        gain.gain.setValueAtTime(clampedVol * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.015);
        return true;
      }

      default:
        return false;
    }
  } catch {
    return false;
  }
}
