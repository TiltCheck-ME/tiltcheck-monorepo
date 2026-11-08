// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
import { vi } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@127.0.0.1:5432/test';
process.env.NEON_DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-api-key';
process.env.GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

// Email ingest: avoid 429 flakes on RGaaS route tests (production default is stricter).
process.env.EMAIL_INGEST_RATE_LIMIT_MAX = process.env.EMAIL_INGEST_RATE_LIMIT_MAX || '10000';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password-mock';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-must-be-32-chars-long';

// Global test setup for API tests
// Suppress console output in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
}
