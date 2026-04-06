// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
import { describe, it, expect } from 'vitest';
import { DatabaseClient } from '../src/index.js';

describe('DatabaseClient', () => {
  it('constructs without credentials and reports disconnected', () => {
    const db = new DatabaseClient();
    expect(db).toBeInstanceOf(DatabaseClient);
    expect(db.isConnected()).toBe(false);
  });

  it('exposes required public methods', () => {
    const db = new DatabaseClient();
    expect(typeof db.connect).toBe('function');
    expect(typeof db.query).toBe('function');
    expect(typeof db.isConnected).toBe('function');
    expect(typeof db.healthCheck).toBe('function');
  });

  it('connect() resolves without throwing when no credentials are set', async () => {
    const db = new DatabaseClient();
    await expect(db.connect()).resolves.toBeUndefined();
  });

  it('query() resolves to null when called (deprecated compat method)', async () => {
    const db = new DatabaseClient();
    const result = await db.query('SELECT 1');
    expect(result).toBeNull();
  });

  it('healthCheck() returns ok:false and connected:false when no credentials are set', async () => {
    const db = new DatabaseClient();
    const result = await db.healthCheck();
    expect(result.ok).toBe(false);
    expect(result.connected).toBe(false);
    expect(typeof result.timestamp).toBe('number');
  });
});