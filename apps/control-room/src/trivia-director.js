/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. */
/**
 * Trivia Director — backend for the Director's Booth
 * Manages game configuration, scheduling, live controls, and push notifications.
 * Communicates with game-arena trivia-manager via eventRouter.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { eventRouter } from '@tiltcheck/event-router';

const DATA_DIR = process.env.CONTROL_ROOM_DATA_DIR
  ? path.resolve(process.env.CONTROL_ROOM_DATA_DIR)
  : path.join(os.tmpdir(), 'tiltcheck-control-room');
const SCHEDULE_FILE = path.join(DATA_DIR, 'trivia-schedule.json');
const CONFIG_FILE = path.join(DATA_DIR, 'trivia-config.json');
const GAME_ARENA_URL = (process.env.GAME_ARENA_URL || 'http://localhost:3010').replace(/\/$/, '');

function ensureDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }

// ── Default game config ────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  topic: 'casino',
  rounds: 10,
  timerSeconds: 20,
  prizeSol: 0,
  difficulty: 'mixed',
  eliminationMode: true,
  powerups: { shield: true, apeIn: true, buyBack: true },
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ── Schedule engine ────────────────────────────────────────────────────────────

/**
 * Schedule entry:
 * { id, dayOfWeek: 0-6 | 'daily', hour: 0-23, minute: 0-59, enabled: bool, configOverrides: {} }
 */

function loadSchedule() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
  } catch {}
  return { entries: [], lastAutoRun: null };
}

function saveSchedule(schedule) {
  ensureDir();
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
}

function addScheduleEntry(entry) {
  const schedule = loadSchedule();
  const record = {
    id: crypto.randomUUID(),
    dayOfWeek: entry.dayOfWeek ?? 'daily',
    hour: entry.hour ?? 20,
    minute: entry.minute ?? 0,
    enabled: entry.enabled !== false,
    configOverrides: entry.configOverrides || {},
    createdAt: new Date().toISOString(),
  };
  schedule.entries.push(record);
  saveSchedule(schedule);
  return record;
}

function removeScheduleEntry(id) {
  const schedule = loadSchedule();
  schedule.entries = schedule.entries.filter((e) => e.id !== id);
  saveSchedule(schedule);
}

function toggleScheduleEntry(id, enabled) {
  const schedule = loadSchedule();
  const entry = schedule.entries.find((e) => e.id === id);
  if (entry) entry.enabled = enabled;
  saveSchedule(schedule);
  return entry;
}

function getNextScheduledTime(entry) {
  const now = new Date();
  const target = new Date();
  target.setUTCHours(entry.hour, entry.minute, 0, 0);

  if (entry.dayOfWeek !== 'daily') {
    const dow = Number(entry.dayOfWeek);
    const currentDow = target.getUTCDay();
    let daysAhead = (dow - currentDow + 7) % 7;
    if (daysAhead === 0 && target <= now) daysAhead = 7;
    target.setUTCDate(target.getUTCDate() + daysAhead);
  } else if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.toISOString();
}

// ── Game-arena communication ───────────────────────────────────────────────────

async function arenaPost(endpoint, body) {
  const url = `${GAME_ARENA_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET || ''}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
    return { ok: true, data: await res.json() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function arenaGet(endpoint) {
  const url = `${GAME_ARENA_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET || ''}` },
    });
    if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
    return { ok: true, data: await res.json() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Director actions ───────────────────────────────────────────────────────────

async function launchGame(configOverrides = {}) {
  const config = { ...loadConfig(), ...configOverrides };
  return arenaPost('/trivia/schedule', {
    category: config.topic,
    theme: config.topic,
    totalRounds: config.rounds,
    timerMs: config.timerSeconds * 1000,
    prizeSol: config.prizeSol,
    difficulty: config.difficulty,
    eliminationMode: config.eliminationMode,
    powerups: config.powerups,
  });
}

async function controlGame(action) {
  // action: 'pause' | 'resume' | 'skip' | 'end'
  return arenaPost('/trivia/control', { action });
}

async function getGameStatus() {
  return arenaGet('/trivia/status');
}

async function swapQuestion(questionId, replacement) {
  return arenaPost('/trivia/swap-question', { questionId, replacement });
}

async function sendPushNotification(message, channels) {
  // Publish via eventRouter — discord-bot listens and broadcasts
  try {
    await eventRouter.publish('trivia.notification', 'control-room', {
      type: 'impromptu',
      message: message || 'Live Trivia HQ game starting now. Get in the Activity.',
      channels: channels || [],
      timestamp: Date.now(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Auto-run scheduler ─────────────────────────────────────────────────────────

let schedulerInterval = null;

function startScheduler() {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(async () => {
    const schedule = loadSchedule();
    const now = new Date();
    const currentMinute = now.getUTCHours() * 60 + now.getUTCMinutes();
    const currentDow = now.getUTCDay();

    for (const entry of schedule.entries) {
      if (!entry.enabled) continue;

      const entryMinute = entry.hour * 60 + entry.minute;
      if (Math.abs(currentMinute - entryMinute) > 0) continue;

      const matchesDay = entry.dayOfWeek === 'daily' || Number(entry.dayOfWeek) === currentDow;
      if (!matchesDay) continue;

      // Don't double-fire within the same minute
      const lastKey = `${entry.id}:${now.toISOString().slice(0, 16)}`;
      if (schedule.lastAutoRun === lastKey) continue;

      schedule.lastAutoRun = lastKey;
      saveSchedule(schedule);

      console.log(`[Director] Auto-launching scheduled game: ${entry.id}`);
      const config = { ...loadConfig(), ...entry.configOverrides };

      // Push notification first
      await sendPushNotification(
        `Scheduled Live Trivia starting now. Topic: ${config.topic}. ${config.rounds} rounds. Get in.`,
        [],
      );

      // Launch after 30s delay for notification to propagate
      setTimeout(() => launchGame(entry.configOverrides), 30_000);
    }
  }, 60_000); // Check every minute

  console.log('[Director] Schedule auto-run engine started');
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

// ── Express route registration ─────────────────────────────────────────────────

function registerDirectorRoutes(app, requireAuth) {
  // Config
  app.get('/api/trivia/director/config', requireAuth, (req, res) => {
    res.json(loadConfig());
  });

  app.post('/api/trivia/director/config', requireAuth, (req, res) => {
    const current = loadConfig();
    const updated = { ...current, ...req.body };
    saveConfig(updated);
    res.json(updated);
  });

  // Launch
  app.post('/api/trivia/director/launch', requireAuth, async (req, res) => {
    const result = await launchGame(req.body || {});
    res.json(result);
  });

  // Live controls
  app.post('/api/trivia/director/control', requireAuth, async (req, res) => {
    const { action } = req.body;
    if (!['pause', 'resume', 'skip', 'end'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    const result = await controlGame(action);
    res.json(result);
  });

  // Status
  app.get('/api/trivia/director/status', requireAuth, async (req, res) => {
    const result = await getGameStatus();
    res.json(result);
  });

  // Question swap
  app.post('/api/trivia/director/question', requireAuth, async (req, res) => {
    const { questionId, replacement } = req.body;
    const result = await swapQuestion(questionId, replacement);
    res.json(result);
  });

  // Push notification
  app.post('/api/trivia/director/notify', requireAuth, async (req, res) => {
    const { message, channels } = req.body;
    const result = await sendPushNotification(message, channels);
    res.json(result);
  });

  // Schedule CRUD
  app.get('/api/trivia/director/schedule', requireAuth, (req, res) => {
    const schedule = loadSchedule();
    const withNext = schedule.entries.map((e) => ({
      ...e,
      nextRun: e.enabled ? getNextScheduledTime(e) : null,
    }));
    res.json({ entries: withNext, lastAutoRun: schedule.lastAutoRun });
  });

  app.post('/api/trivia/director/schedule', requireAuth, (req, res) => {
    const entry = addScheduleEntry(req.body);
    res.json(entry);
  });

  app.delete('/api/trivia/director/schedule/:id', requireAuth, (req, res) => {
    removeScheduleEntry(req.params.id);
    res.json({ ok: true });
  });

  app.patch('/api/trivia/director/schedule/:id', requireAuth, (req, res) => {
    const entry = toggleScheduleEntry(req.params.id, req.body.enabled);
    res.json(entry || { error: 'Not found' });
  });

  // Start the auto-run engine
  startScheduler();
}

export {
  registerDirectorRoutes,
  loadConfig,
  saveConfig,
  launchGame,
  controlGame,
  getGameStatus,
  sendPushNotification,
  startScheduler,
  stopScheduler,
};
