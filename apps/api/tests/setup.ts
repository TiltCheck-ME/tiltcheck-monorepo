// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
import { vi } from 'vitest';

// Global test setup for API tests
// Suppress console output in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
}
