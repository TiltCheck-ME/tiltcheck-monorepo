import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = (process.env.COMIC_API_URL || '').replace(/\/$/, '');
const INGEST_KEY = process.env.COMIC_API_INGEST_KEY || process.env.COMIC_INGEST_KEY || '';
const COMMUNITY_ID = process.env.COMIC_COMMUNITY_ID || 'tiltcheck-discord';
const TIMEZONE = process.env.COMIC_TIMEZONE || 'UTC';

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required. Set it in env before running smoke test.`);
  }
}

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: response.ok, status: response.status, body };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(INGEST_KEY ? { 'x-comic-ingest-key': INGEST_KEY } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: response.ok, status: response.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  requireEnv('COMIC_API_URL', BASE_URL);

  const healthUrl = `${BASE_URL}/health`;
  const generateUrl = `${BASE_URL}/v1/comic/generate`;
  const currentUrl = `${BASE_URL}/v1/comic/current?communityId=${encodeURIComponent(COMMUNITY_ID)}`;
  const archiveUrl = `${BASE_URL}/v1/comic/archive?communityId=${encodeURIComponent(COMMUNITY_ID)}&limit=5`;

  console.log(`Smoke test target: ${BASE_URL}`);

  const health = await getJson(healthUrl);
  assert(health.ok, `health failed (${health.status})`);
  assert(health.body?.ok === true, 'health payload missing ok=true');
  console.log('✓ health');

  const now = new Date();
  const payload = {
    communityId: COMMUNITY_ID,
    date: now.toISOString().slice(0, 10),
    timezone: TIMEZONE,
    messages: [
      {
        author: 'smoke-test',
        timestamp: now.toISOString(),
        content: 'weekly dropped and chaos started in chat',
      },
      {
        author: 'smoke-test-2',
        timestamp: new Date(now.getTime() + 1000).toISOString(),
        content: 'mods trying to hold the line while everyone asks for wager code',
      },
    ],
    credits: {
      creator: process.env.COMIC_CREATOR || 'jmenichole',
      visualInspiration: process.env.COMIC_VISUAL_ARTIST || 'samoxic',
      visualInspirationUrl: 'https://pheverdream.github.io/The-Book-of-SealStats/',
    },
    source: {
      generatedBy: 'packages/comic-generator/smoke-test-cloud.js',
    },
  };

  const generated = await postJson(generateUrl, payload);
  assert(generated.ok, `generate failed (${generated.status}): ${JSON.stringify(generated.body)}`);
  assert(generated.body?.ok === true, 'generate payload missing ok=true');
  assert(Array.isArray(generated.body?.comic?.panels), 'generate missing comic.panels');
  assert(generated.body.comic.panels.length >= 3, 'generate returned fewer than 3 panels');
  console.log('✓ generate');

  const current = await getJson(currentUrl);
  assert(current.ok, `current failed (${current.status})`);
  assert(current.body?.ok === true, 'current payload missing ok=true');
  assert(current.body?.comic?.communityId === COMMUNITY_ID, 'current payload communityId mismatch');
  console.log('✓ current');

  const archive = await getJson(archiveUrl);
  assert(archive.ok, `archive failed (${archive.status})`);
  assert(archive.body?.ok === true, 'archive payload missing ok=true');
  assert(Array.isArray(archive.body?.items), 'archive payload missing items array');
  assert(archive.body.items.length >= 1, 'archive should contain at least one item after generate');
  console.log('✓ archive');

  console.log('Smoke test passed.');
}

run().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exit(1);
});
