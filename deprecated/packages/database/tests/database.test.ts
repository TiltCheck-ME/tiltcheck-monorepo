import { describe, it, expect } from 'vitest';
import { DatabaseClient } from '../src';

describe('DatabaseClient', () => {
  it('can be constructed and has placeholder methods', () => {
    const db = new DatabaseClient();
    expect(db).toBeDefined();
    expect(typeof db.connect).toBe('function');
    expect(typeof db.query).toBe('function');
  });
});