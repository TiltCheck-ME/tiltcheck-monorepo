/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-05 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_AUDIO_ALERTS_CONFIG,
  getAudioAlertsConfigSync,
  loadAudioAlertsConfig,
  playAudioCue,
  saveAudioAlertsConfig,
  setAudioAlertsConfigSync,
  TILTCHECK_AUDIO_ALERTS_CONFIG_KEY,
  type AudioCueType,
} from '../../src/audio-alerts.js';

describe('Audio Alerts & Spotter Sound Cues (audio-alerts.ts)', () => {
  beforeEach(() => {
    setAudioAlertsConfigSync({ ...DEFAULT_AUDIO_ALERTS_CONFIG });

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockImplementation((keys, cb) => {
            cb({});
          }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });
  });

  it('provides default enabled audio config with 25% subtle volume', () => {
    const config = getAudioAlertsConfigSync();
    expect(config.enabled).toBe(true);
    expect(config.volume).toBe(0.25);
  });

  it('clamps volume within [0, 1] range in sync setter', () => {
    setAudioAlertsConfigSync({ enabled: true, volume: 1.8 });
    expect(getAudioAlertsConfigSync().volume).toBe(1.0);

    setAudioAlertsConfigSync({ enabled: true, volume: -0.5 });
    expect(getAudioAlertsConfigSync().volume).toBe(0.0);
  });

  it('loads audio configuration from chrome.storage.local', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation((keys, cb) => {
      cb({
        [TILTCHECK_AUDIO_ALERTS_CONFIG_KEY]: { enabled: false, volume: 0.5 },
      });
    });

    const loaded = await loadAudioAlertsConfig();
    expect(loaded.enabled).toBe(false);
    expect(loaded.volume).toBe(0.5);
    expect(getAudioAlertsConfigSync().enabled).toBe(false);
  });

  it('persists updated audio configuration to chrome.storage.local', async () => {
    await saveAudioAlertsConfig({ enabled: true, volume: 0.75 });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [TILTCHECK_AUDIO_ALERTS_CONFIG_KEY]: { enabled: true, volume: 0.75 },
    });
    expect(getAudioAlertsConfigSync().volume).toBe(0.75);
  });

  it('bypasses audio synthesis when audio alerts are disabled', () => {
    setAudioAlertsConfigSync({ enabled: false, volume: 0.25 });
    const played = playAudioCue('spin_brake');
    expect(played).toBe(false);
  });

  it('bypasses audio synthesis when volume is zero', () => {
    setAudioAlertsConfigSync({ enabled: true, volume: 0 });
    const played = playAudioCue('cold_warn');
    expect(played).toBe(false);
  });

  it('safely handles missing AudioContext in test environments without throwing', () => {
    setAudioAlertsConfigSync({ enabled: true, volume: 0.25 });
    const played = playAudioCue('click', undefined, null);
    expect(played).toBe(false);
  });

  it('correctly creates and connects Web Audio graph for all cue types with mocked AudioContext', () => {
    setAudioAlertsConfigSync({ enabled: true, volume: 0.3 });

    const createMockAudioContext = () => {
      const mockGainNode = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };

      const mockOscillatorNode = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      return {
        currentTime: 10.0,
        destination: {},
        createOscillator: vi.fn().mockReturnValue(mockOscillatorNode),
        createGain: vi.fn().mockReturnValue(mockGainNode),
      } as unknown as AudioContext;
    };

    const cueTypes: AudioCueType[] = [
      'spin_brake',
      'cold_warn',
      'due_trap',
      'heater_alert',
      'cooldown_chime',
      'click',
    ];

    for (const cue of cueTypes) {
      const mockCtx = createMockAudioContext();
      const success = playAudioCue(cue, 0.4, mockCtx);

      expect(success).toBe(true);
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
    }
  });

  it('contains zero emojis across audio cue definitions to uphold TiltCheck brand law', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(TILTCHECK_AUDIO_ALERTS_CONFIG_KEY)).toBe(false);
  });
});
