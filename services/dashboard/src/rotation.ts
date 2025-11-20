import fs from 'fs';
import path from 'path';

export const DEFAULT_KEEP_DAYS = parseInt(process.env.DASHBOARD_EVENTS_KEEP_DAYS || '7', 10);

export function dayString(date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export interface LoggedEventEntry {
  ts: number;
  type: string;
  entity?: string;
  delta?: number;
  severity?: number;
  reason?: string;
  source?: string;
  eventId?: string;
  category?: string;
}

export function writeEventForDay(baseDir: string, day: string, evt: LoggedEventEntry) {
  ensureDir(baseDir);
  const filePath = path.join(baseDir, `trust-events-${day}.json`);
  let existing: LoggedEventEntry[] = [];
  if (fs.existsSync(filePath)) {
    try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')).events || []; } catch { existing = []; }
  }
  existing.push(evt);
  fs.writeFileSync(filePath, JSON.stringify({ day, events: existing }, null, 2));
  return filePath;
}

export function listEventFiles(baseDir: string) {
  if (!fs.existsSync(baseDir)) return [];
  return fs.readdirSync(baseDir).filter(f => f.startsWith('trust-events-') && f.endsWith('.json'));
}

export function pruneOld(baseDir: string, keepDays = DEFAULT_KEEP_DAYS, currentDay = dayString()) {
  const files = listEventFiles(baseDir);
  const currentDate = new Date(currentDay + 'T00:00:00Z');
  files.forEach(f => {
    const m = f.match(/trust-events-(\d{4}-\d{2}-\d{2})\.json/);
    if (!m) return;
    const fileDay = m[1];
    const fileDate = new Date(fileDay + 'T00:00:00Z');
    const ageDays = Math.floor((currentDate.getTime() - fileDate.getTime()) / 86400000);
    if (ageDays >= keepDays) {
      try { fs.unlinkSync(path.join(baseDir, f)); } catch {/* ignore */}
    }
  });
}

export interface DailyEventWriter {
  baseDir: string;
  currentDay: string;
  keepDays: number;
  append(evt: LoggedEventEntry): void;
}

export function createDailyEventWriter(baseDir: string, keepDays = DEFAULT_KEEP_DAYS): DailyEventWriter {
  let currentDayValue = dayString();
  return {
    baseDir,
    currentDay: currentDayValue,
    keepDays,
    append(evt: LoggedEventEntry) {
      const today = dayString();
      if (today !== currentDayValue) {
        pruneOld(baseDir, keepDays, today);
        currentDayValue = today;
      }
      writeEventForDay(baseDir, currentDayValue, evt);
    }
  };
}
