/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */

/**
 * Loaded by background.js via importScripts('background-sync.js').
 * Pulls dashboard settings on start-up, on sign-in/sign-out, and every 15 minutes.
 */
import { installSettingsSync } from './settings-sync.js';

installSettingsSync();
