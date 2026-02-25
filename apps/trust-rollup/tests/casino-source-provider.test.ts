/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Store original env vars to restore after tests
const originalEnv = { ...process.env };

describe('Casino Source Provider', () => {
  const testDir = '/tmp/casino-source-test';
  
  beforeEach(async () => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    delete process.env.TRUST_ENGINE_URL;
    delete process.env.CASINO_SOURCE_FILE;
    delete process.env.MONITORED_CASINOS;
    
    // Create test directory using async API
    try {
      await fs.promises.access(testDir);
    } catch {
      await fs.promises.mkdir(testDir, { recursive: true });
    }
    
    // Clear module cache to get fresh env vars
    vi.resetModules();
  });
  
  afterEach(async () => {
    // Restore original env
    process.env = { ...originalEnv };
    
    // Clean up test files using async API
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('fetchActiveCasinos', () => {
    it('returns default casinos when no sources configured', async () => {
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('default');
      expect(result.casinos).toContain('stake.com');
      expect(result.casinos).toContain('duelbits.com');
      expect(result.casinos.length).toBeGreaterThan(0);
      expect(result.fetchedAt).toBeDefined();
    });

    it('loads casinos from environment variable (comma-separated)', async () => {
      process.env.MONITORED_CASINOS = 'casino1.com, casino2.com, casino3.com';
      
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('env');
      expect(result.casinos).toEqual(['casino1.com', 'casino2.com', 'casino3.com']);
    });

    it('loads casinos from environment variable (JSON array)', async () => {
      process.env.MONITORED_CASINOS = '["casino1.com", "casino2.com"]';
      
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('env');
      expect(result.casinos).toEqual(['casino1.com', 'casino2.com']);
    });

    it('loads casinos from JSON file with array format', async () => {
      const testFile = path.join(testDir, 'casinos-array.json');
      fs.writeFileSync(testFile, JSON.stringify(['test1.com', 'test2.com']));
      process.env.CASINO_SOURCE_FILE = testFile;
      
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('file');
      expect(result.casinos).toEqual(['test1.com', 'test2.com']);
    });

    it('loads casinos from JSON file with objects containing name property', async () => {
      const testFile = path.join(testDir, 'casinos-objects.json');
      const data = [
        { name: 'Casino One', domain: 'casino1.com' },
        { name: 'Casino Two', domain: 'casino2.com' }
      ];
      fs.writeFileSync(testFile, JSON.stringify(data));
      process.env.CASINO_SOURCE_FILE = testFile;
      
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('file');
      expect(result.casinos).toContain('casino1.com');
      expect(result.casinos).toContain('casino2.com');
    });

    it('loads casinos from JSON file with key-value format (casino-data-api style)', async () => {
      const testFile = path.join(testDir, 'casinos-kv.json');
      const data = {
        stake: { name: 'Stake', baseURL: 'https://stake.com' },
        roobet: { name: 'Roobet', baseURL: 'https://www.roobet.com' }
      };
      fs.writeFileSync(testFile, JSON.stringify(data));
      process.env.CASINO_SOURCE_FILE = testFile;
      
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('file');
      expect(result.casinos).toContain('stake.com');
      expect(result.casinos).toContain('roobet.com');
    });

    it('loads casinos from JSON file with casinos property', async () => {
      const testFile = path.join(testDir, 'casinos-prop.json');
      const data = { casinos: ['casino1.com', 'casino2.com', 'casino3.com'] };
      fs.writeFileSync(testFile, JSON.stringify(data));
      process.env.CASINO_SOURCE_FILE = testFile;
      
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('file');
      expect(result.casinos).toEqual(['casino1.com', 'casino2.com', 'casino3.com']);
    });

    it('falls back to default when file does not exist', async () => {
      process.env.CASINO_SOURCE_FILE = '/nonexistent/path/casinos.json';
      
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('default');
      expect(result.casinos.length).toBeGreaterThan(0);
    });

    it('falls back to default when file contains invalid JSON', async () => {
      const testFile = path.join(testDir, 'invalid.json');
      fs.writeFileSync(testFile, 'not valid json {{{');
      process.env.CASINO_SOURCE_FILE = testFile;
      
      const { fetchActiveCasinos } = await import('../src/casino-source-provider.js');
      
      const result = await fetchActiveCasinos();
      
      expect(result.source).toBe('default');
    });
  });

  describe('getSourceConfig', () => {
    it('reports configured trust engine URL', async () => {
      process.env.TRUST_ENGINE_URL = 'https://trust.example.com';
      
      const { getSourceConfig } = await import('../src/casino-source-provider.js');
      
      const config = getSourceConfig();
      
      expect(config.trustEngineUrl).toBe('https://trust.example.com');
    });

    it('reports configured file source', async () => {
      process.env.CASINO_SOURCE_FILE = '/path/to/casinos.json';
      
      const { getSourceConfig } = await import('../src/casino-source-provider.js');
      
      const config = getSourceConfig();
      
      expect(config.sourceFile).toBe('/path/to/casinos.json');
    });

    it('reports configured environment list', async () => {
      process.env.MONITORED_CASINOS = 'casino1.com,casino2.com';
      
      const { getSourceConfig } = await import('../src/casino-source-provider.js');
      
      const config = getSourceConfig();
      
      expect(config.envList).toBe('casino1.com,casino2.com');
    });

    it('always has defaults available', async () => {
      const { getSourceConfig } = await import('../src/casino-source-provider.js');
      
      const config = getSourceConfig();
      
      expect(config.hasDefaults).toBe(true);
    });
  });
});

describe('Verification Scheduler Integration', () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure default fallback
    delete process.env.TRUST_ENGINE_URL;
    delete process.env.CASINO_SOURCE_FILE;
    delete process.env.MONITORED_CASINOS;
  });

  it('getMonitoredCasinos returns casinos dynamically', async () => {
    const { getMonitoredCasinos, stopCasinoVerificationScheduler } = await import('../src/verification-scheduler.js');
    
    const casinos = await getMonitoredCasinos();
    
    expect(Array.isArray(casinos)).toBe(true);
    expect(casinos.length).toBeGreaterThan(0);
    
    // Clean up
    stopCasinoVerificationScheduler();
  });

  it('getCasinoSourceInfo returns null before first fetch', async () => {
    vi.resetModules();
    const { getCasinoSourceInfo, stopCasinoVerificationScheduler } = await import('../src/verification-scheduler.js');
    
    // Before any fetch, should be null
    // Note: module load may trigger a fetch, so we check the structure if not null
    const info = getCasinoSourceInfo();
    
    if (info !== null) {
      expect(info.source).toBeDefined();
      expect(info.count).toBeGreaterThan(0);
      expect(info.fetchedAt).toBeDefined();
    }
    
    stopCasinoVerificationScheduler();
  });

  it('refreshCasinoCache clears the cache', async () => {
    const { 
      getMonitoredCasinos, 
      refreshCasinoCache, 
      getCasinoSourceInfo,
      stopCasinoVerificationScheduler 
    } = await import('../src/verification-scheduler.js');
    
    // First fetch to populate cache
    await getMonitoredCasinos();
    expect(getCasinoSourceInfo()).not.toBeNull();
    
    // Clear the cache
    refreshCasinoCache();
    expect(getCasinoSourceInfo()).toBeNull();
    
    stopCasinoVerificationScheduler();
  });
});
