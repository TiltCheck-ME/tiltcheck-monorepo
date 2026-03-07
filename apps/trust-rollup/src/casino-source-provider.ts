// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Casino Source Provider
 * Dynamically fetches active casinos from various sources for verification scheduling.
 * Supports file-based configs, environment variables, and trust engine integration.
 */

import fs from 'fs';
import path from 'path';

// Default fallback casinos (used when no other sources available)
const DEFAULT_CASINOS = [
  'stake.com',
  'duelbits.com',
  'rollbit.com',
  'roobet.com',
  'bc.game',
];

// Configuration from environment
const CASINO_SOURCE_FILE = process.env.CASINO_SOURCE_FILE;
const CASINO_LIST_ENV = process.env.MONITORED_CASINOS;
const TRUST_ENGINE_URL = process.env.TRUST_ENGINE_URL;

// Retry configuration
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// Fetch timeout (configurable via env)
const FETCH_TIMEOUT_MS = parseInt(process.env.CASINO_FETCH_TIMEOUT_MS || '5000', 10);

/**
 * Result of fetching casinos from a source
 */
export interface CasinoSourceResult {
  casinos: string[];
  source: 'file' | 'env' | 'trust-engine' | 'default';
  fetchedAt: number;
  error?: string;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[CasinoSource] ${operationName} failed (attempt ${attempt}/${maxRetries}): ${lastError.message}. ` +
        (attempt < maxRetries ? `Retrying in ${delayMs}ms...` : 'No more retries.')
      );
      
      if (attempt < maxRetries) {
        await sleep(delayMs);
      }
    }
  }
  
  throw lastError;
}

/**
 * Fetch casinos from a JSON file
 */
async function fetchFromFile(filePath: string): Promise<string[]> {
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.resolve(process.cwd(), filePath);
    
  const content = await fs.promises.readFile(absolutePath, 'utf-8');
  const data = JSON.parse(content);
  
  // Support multiple file formats
  if (Array.isArray(data)) {
    // Simple array of strings or objects with 'name'/'domain' properties
    return data.map(item => {
      if (typeof item === 'string') return item;
      // Support objects with name or domain property
      return item.domain || item.name || '';
    }).filter(Boolean);
  }
  
  // Object format with casinos property
  if (data.casinos && Array.isArray(data.casinos)) {
    return data.casinos.map((item: string | { domain?: string; name?: string }) => {
      if (typeof item === 'string') return item;
      return item.domain || item.name || '';
    }).filter(Boolean);
  }
  
  // Key-value object format (e.g., casino-data-api format)
  if (typeof data === 'object' && !Array.isArray(data)) {
    return Object.values(data)
      .map((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const casino = item as { baseURL?: string; domain?: string; name?: string };
          // Extract domain from baseURL if present
          if (casino.baseURL) {
            try {
              const url = new URL(casino.baseURL);
              return url.hostname.replace(/^www\./, '');
            } catch { /* ignore invalid URLs */ }
          }
          return casino.domain || casino.name || '';
        }
        return '';
      })
      .filter(Boolean);
  }
  
  throw new Error('Unsupported file format: expected array or object with casinos');
}

/**
 * Parse casinos from environment variable
 */
function parseFromEnv(envValue: string): string[] {
  // Support comma-separated or JSON array format
  const trimmed = envValue.trim();
  
  if (trimmed.startsWith('[')) {
    // JSON array format
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string' && item.length > 0);
      }
    } catch {
      // Fall through to comma-separated parsing
    }
  }
  
  // Comma-separated format
  return trimmed
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Fetch casinos from trust engine API
 */
async function fetchFromTrustEngine(baseUrl: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/casinos/active`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as { casinos?: string[]; data?: string[] };
    
    // Support multiple response formats
    if (Array.isArray(data)) {
      return data.filter(item => typeof item === 'string');
    }
    
    if (data.casinos && Array.isArray(data.casinos)) {
      return data.casinos.filter(item => typeof item === 'string');
    }
    
    if (data.data && Array.isArray(data.data)) {
      return data.data.filter(item => typeof item === 'string');
    }
    
    throw new Error('Unexpected response format from trust engine');
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Fetch active casinos from configured sources with fallback chain.
 * Priority: Trust Engine API > File > Environment Variable > Default
 */
export async function fetchActiveCasinos(): Promise<CasinoSourceResult> {
  const fetchedAt = Date.now();
  
  // Try Trust Engine API first if configured
  if (TRUST_ENGINE_URL) {
    try {
      const casinos = await withRetry(
        () => fetchFromTrustEngine(TRUST_ENGINE_URL),
        'Trust Engine fetch'
      );
      
      console.log(`[CasinoSource] Loaded ${casinos.length} casinos from trust engine (${TRUST_ENGINE_URL})`);
      return { casinos, source: 'trust-engine', fetchedAt };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[CasinoSource] Trust engine unavailable after retries: ${errorMsg}`);
      // Continue to next source
    }
  }
  
  // Try file source if configured
  if (CASINO_SOURCE_FILE) {
    try {
      const casinos = await withRetry(
        () => fetchFromFile(CASINO_SOURCE_FILE),
        'File source fetch'
      );
      
      console.log(`[CasinoSource] Loaded ${casinos.length} casinos from file (${CASINO_SOURCE_FILE})`);
      return { casinos, source: 'file', fetchedAt };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[CasinoSource] File source failed after retries: ${errorMsg}`);
      // Continue to next source
    }
  }
  
  // Try environment variable if configured
  if (CASINO_LIST_ENV) {
    try {
      const casinos = parseFromEnv(CASINO_LIST_ENV);
      
      if (casinos.length > 0) {
        console.log(`[CasinoSource] Loaded ${casinos.length} casinos from environment variable`);
        return { casinos, source: 'env', fetchedAt };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[CasinoSource] Environment variable parsing failed: ${errorMsg}`);
    }
  }
  
  // Fall back to defaults
  console.log(`[CasinoSource] Using default casino list (${DEFAULT_CASINOS.length} casinos)`);
  return { casinos: [...DEFAULT_CASINOS], source: 'default', fetchedAt };
}

/**
 * Get the current source configuration for logging/debugging
 */
export function getSourceConfig(): {
  trustEngineUrl?: string;
  sourceFile?: string;
  envList?: string;
  hasDefaults: boolean;
} {
  return {
    trustEngineUrl: TRUST_ENGINE_URL,
    sourceFile: CASINO_SOURCE_FILE,
    envList: CASINO_LIST_ENV,
    hasDefaults: true
  };
}
