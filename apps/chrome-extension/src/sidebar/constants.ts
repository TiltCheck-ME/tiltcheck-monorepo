/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { EXT_CONFIG } from '../config.js';

export const API_BASE = EXT_CONFIG.API_BASE_URL;
export const AI_GATEWAY_URL = EXT_CONFIG.AI_GATEWAY_URL;
export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return 'https://api.tiltcheck.me';
  }
})();

export const DISCORD_AUTH_MESSAGE_TYPE = 'discord-auth';
export const SIDEBAR_WIDTH = 340;
export const MINIMIZED_WIDTH = 40;
export const SIDEBAR_VISIBILITY_KEY = 'tiltcheck_sidebar_visible';
export const SIDEBAR_PREFS_KEY = 'sidebarUiPrefs';
export const WALLET_LOCK_UNTIL_KEY = 'walletLockUntil';

export const CASINO_THEMES: Record<string, { label: string; accent: string }> = {
  'stake.us': { label: 'Stake.us', accent: '#4ade80' },
  'stake.com': { label: 'Stake.com', accent: '#4ade80' },
  'roobet.com': { label: 'Roobet', accent: '#ffae00' },
  'bc.game': { label: 'BC.Game', accent: '#3bc117' },
  'rollbit.com': { label: 'Rollbit', accent: '#ffbc0d' },
  'duelbits.com': { label: 'Duelbits', accent: '#00e701' },
  'shuffle.com': { label: 'Shuffle', accent: '#00ffff' },
  'gamdom.com': { label: 'Gamdom', accent: '#00ffcc' },
  'csgoempire.com': { label: 'CSGOEmpire', accent: '#ff9c00' }
};
