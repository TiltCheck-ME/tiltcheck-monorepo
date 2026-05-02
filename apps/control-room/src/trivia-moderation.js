/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-02 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = process.env.CONTROL_ROOM_DATA_DIR
  ? path.resolve(process.env.CONTROL_ROOM_DATA_DIR)
  : path.join(os.tmpdir(), 'tiltcheck-control-room');
const CANDIDATES_FILE = path.join(DATA_DIR, 'trivia-candidates.json');
const ADDITIONS_FILE = path.join(process.cwd(), 'packages', 'shared', 'src', 'trivia_additions.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadState() {
  if (!fs.existsSync(CANDIDATES_FILE)) return { candidates: [] };
  try {
    return JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf8'));
  } catch (e) {
    console.error('[control-room][trivia] failed to read state', e.message);
    return { candidates: [] };
  }
}

function saveState(state) {
  ensureDataDir();
  fs.writeFileSync(CANDIDATES_FILE, JSON.stringify(state, null, 2));
}

function summarize(candidate) {
  return {
    id: candidate.id,
    status: candidate.status,
    topic: candidate.topic,
    textPreview: (candidate.text || '').slice(0, 200),
    generatedAt: candidate.generatedAt || null,
    moderation: candidate.moderation || null,
  };
}

function listCandidates() {
  const state = loadState();
  return state.candidates.map(summarize).sort((a,b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''));
}

function getCandidate(id) {
  const state = loadState();
  return state.candidates.find((c) => c.id === id) || null;
}

function createCandidate(candidate) {
  const state = loadState();
  const next = {
    id: candidate.id || crypto.randomUUID(),
    status: 'pending',
    topic: candidate.topic || 'casino',
    text: candidate.text || '',
    choices: candidate.choices || {},
    answer: candidate.answer || 'A',
    explanation: candidate.explanation || '',
    generatedBy: candidate.generatedBy || 'ai',
    generatedAt: candidate.generatedAt || new Date().toISOString(),
    moderation: candidate.moderation || null,
    reviewer: null,
    publishedAt: null,
  };
  state.candidates = state.candidates || [];
  state.candidates.push(next);
  saveState(state);
  return next;
}

function updateCandidate(id, updater) {
  const state = loadState();
  const idx = state.candidates.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('candidate not found');
  state.candidates[idx] = updater(state.candidates[idx]);
  saveState(state);
  return state.candidates[idx];
}

function publishCandidate(id, reviewer) {
  const cand = getCandidate(id);
  if (!cand) throw new Error('candidate not found');
  // Mark published
  const now = new Date().toISOString();
  const updated = updateCandidate(id, (c) => ({ ...c, status: 'published', reviewer: reviewer || 'moderator', publishedAt: now }));

  // Persist into shared additions file
  let additions = { questions: [] };
  try {
    if (fs.existsSync(ADDITIONS_FILE)) {
      additions = JSON.parse(fs.readFileSync(ADDITIONS_FILE, 'utf8')) || additions;
    }
  } catch (e) {
    console.error('[control-room][trivia] failed reading additions file', e.message);
  }

  const toPush = {
    id: updated.id,
    topic: updated.topic,
    text: updated.text,
    choices: updated.choices,
    answer: updated.answer,
    explanation: updated.explanation,
    addedAt: now,
    addedBy: reviewer || 'moderator',
  };

  additions.questions = additions.questions || [];
  additions.questions.push(toPush);

  try {
    fs.writeFileSync(ADDITIONS_FILE, JSON.stringify(additions, null, 2));
  } catch (e) {
    console.error('[control-room][trivia] failed writing additions file', e.message);
    throw e;
  }

  return updated;
}

export {
  listCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  publishCandidate,
};
