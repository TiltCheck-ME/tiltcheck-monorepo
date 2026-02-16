import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { writeEventForDay, pruneOld, listEventFiles } from '../src/rotation.js';

describe('daily rotation', () => {
  const baseDir = path.join(process.cwd(), 'services', 'dashboard', 'tmp-test-events');
  function clean() { if (fs.existsSync(baseDir)) fs.rmSync(baseDir, { recursive: true, force: true }); }
  beforeEach(() => clean());
  afterEach(() => clean());

  it('writes events into day-specific files', () => {
    writeEventForDay(baseDir, '2025-11-19', { ts: Date.now(), type: 'trust.domain.updated', entity: 'x', delta: -5 });
    writeEventForDay(baseDir, '2025-11-19', { ts: Date.now(), type: 'trust.domain.updated', entity: 'y', delta: -10 });
    writeEventForDay(baseDir, '2025-11-20', { ts: Date.now(), type: 'trust.casino.updated', entity: 'casinoA', delta: -3 });
    const files = listEventFiles(baseDir);
    expect(files.length).toBe(2);
    const dayFile = path.join(baseDir, 'trust-events-2025-11-19.json');
    const obj = JSON.parse(fs.readFileSync(dayFile, 'utf-8'));
    expect(obj.events.length).toBe(2);
  });

  it('prunes files older than keepDays', () => {
    writeEventForDay(baseDir, '2025-11-10', { ts: Date.now(), type: 'trust.domain.updated', entity: 'a', delta: -1 });
    writeEventForDay(baseDir, '2025-11-11', { ts: Date.now(), type: 'trust.domain.updated', entity: 'b', delta: -2 });
    writeEventForDay(baseDir, '2025-11-12', { ts: Date.now(), type: 'trust.domain.updated', entity: 'c', delta: -3 });
    pruneOld(baseDir, 2, '2025-11-12');
    const files = listEventFiles(baseDir);
    expect(files).toContain('trust-events-2025-11-11.json');
    expect(files).toContain('trust-events-2025-11-12.json');
    expect(files).not.toContain('trust-events-2025-11-10.json');
  });

  it('persists extra metadata (eventId, category)', () => {
    const day = '2025-11-19';
    writeEventForDay(baseDir, day, { ts: Date.now(), type: 'trust.domain.updated', entity: 'meta.example', delta: -9, severity: 4, reason: 'risky', source: 'suslink', eventId: 'evt-123', category: 'high' });
    const file = path.join(baseDir, `trust-events-${day}.json`);
    const obj = JSON.parse(fs.readFileSync(file, 'utf-8'));
    expect(obj.events[0].eventId).toBe('evt-123');
    expect(obj.events[0].category).toBe('high');
  });
});
