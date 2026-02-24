/**
 * Seed Elastic Telemetry — Hackathon Demo Script
 *
 * Simulates a realistic 48-hour timeline of a player going on tilt.
 * Events are modelled on real observed patterns:
 *
 *   Phase 1 — Normal play (calm, consistent, small bets)
 *   Phase 2 — Big win  (euphoria, bragging, overconfidence)
 *   Phase 3 — Big loss (silence, then sudden return)
 *   Phase 4 — Loss chasing (re-deposit, target language, desperation)
 *   Phase 5 — Full tilt (rapid-fire messages, negative sentiment, big tips, high tilt score)
 *
 * Usage:
 *   node scripts/seed-elastic-demo.mjs
 *
 * Reads ELASTIC_URL, ELASTIC_API_KEY, DEMO_USER_ID from env or .env file.
 */

import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Load .env manually (no dotenv dependency needed in a standalone script)
// ---------------------------------------------------------------------------

function loadEnv() {
  const paths = [
    resolve(process.cwd(), 'apps/discord-bot/.env'),
    resolve(process.cwd(), '.env'),
  ];
  for (const p of paths) {
    try {
      const lines = readFileSync(p, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
      console.log(`  Loaded env from ${p}`);
      return;
    } catch {
      // try next
    }
  }
}

loadEnv();

const ELASTIC_URL    = process.env.ELASTIC_URL;
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;
const DEMO_USER_ID   = process.env.DEMO_USER_ID ?? '111222333444555666';
const INDEX = 'tiltcheck-telemetry';

if (!ELASTIC_URL || !ELASTIC_API_KEY) {
  console.error('\n❌  ELASTIC_URL and ELASTIC_API_KEY must be set.\n');
  process.exit(1);
}

const client = new Client({ node: ELASTIC_URL, auth: { apiKey: ELASTIC_API_KEY } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jitter(base, pct = 0.2) {
  return base + base * (Math.random() * pct * 2 - pct);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ago(ms) {
  return new Date(Date.now() - ms).toISOString();
}

const H = 3_600_000;   // 1 hour in ms
const M = 60_000;      // 1 min  in ms

// ---------------------------------------------------------------------------
// Realistic message content per phase — used for metadata, makes Kibana pretty
// ---------------------------------------------------------------------------

const MESSAGES = {
  normal: [
    'nice hand lol',
    'gg wp',
    'anyone playing poker tonight?',
    'what casino are you guys on rn',
    'just chilling, low stakes tonight',
    'small profit today, calling it',
    'grinded a bit, up $20 whatever',
    'poker > slots tbh',
    'anyone know if stake is down',
  ],
  bigWin: [
    'YOOO I just ran $60 up to $600 no way',
    'bro I just hit a $600 flip from $60 lets GOOO',
    'pls tell me someone saw that',
    'im literally shaking rn',
    'ok so I just turned $60 into $600',
    'that was the sickest run ive ever had',
    'not cashing out until I hit 1k',
    'this is my night fr fr',
    'boys we are SO back',
  ],
  afterLoss: [
    '.',
    'gg',
    'whatever',
    'lol',
    'nvm',
    // silence — fewer messages, longer gaps between them
  ],
  reDeposit: [
    'just depoed $100 gonna try to run it up again',
    'ok back, gonna do it again',
    'need to get that $600 back',
    'I can do it again I know I can',
    'I just need one good run',
    '$100 left gotta make it work',
    'not leaving until Im back to even',
    'bro I had it and lost it im so tilted',
    'gonna run this $100 to $1k easy',
    'one more session. just one.',
  ],
  chasing: [
    'up to $200 already this might be it',
    'wait wait wait',
    'noooo',
    'ok still fine still fine',
    'down to $40 just need one flip',
    'COME ON',
    'alright depositing $50 more',
    'this is rigged lmaooo',
    'I should have cashed out when I was up',
    'ok im done im so done',
    'one more spin',
    'last one I swear',
    'who needs sleep anyway',
    'im down $300 tonight someone stop me',
    'nvm not done',
  ],
  fullTilt: [
    'im going to lose everything tonight arent I',
    'deposited again',
    'why do I keep doing this',
    'down $400 on the night',
    'if I can just get back to even ill stop',
    'someone literally take my card',
    'I cant stop',
    'its fine its fine its fine',
    'lost it all again',
    'just need one more hit',
    'bro im actually cooked',
    'gonna try one more deposit',
    'I have work tomorrow I dont care',
  ],
};

// ---------------------------------------------------------------------------
// Event builders
// ---------------------------------------------------------------------------

function makeEvent(overrides) {
  return {
    '@timestamp': ago(0),      // will be overridden
    user_id: DEMO_USER_ID,
    guild_id: '1446973117472964620',
    channel_id: '112233445566778899',
    action: 'message_sent',
    sentiment: 0,
    tilt_score: 0,
    amount_sol: null,
    is_dm: false,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Phase definitions
// Each phase returns an array of { timestamp_offset_ms, event } entries
// ---------------------------------------------------------------------------

function phaseNormal() {
  // 36–48 h ago. Calm activity, 3–6 messages/hour, positive sentiment.
  const events = [];
  for (let h = 48; h >= 36; h--) {
    const msgCount = Math.floor(rand(3, 7));
    for (let i = 0; i < msgCount; i++) {
      const offsetMs = h * H - rand(0, H);
      events.push(makeEvent({
        '@timestamp': ago(offsetMs),
        action: 'message_sent',
        sentiment: rand(0.3, 0.8),
        tilt_score: rand(0, 15),
        metadata: { text: pick(MESSAGES.normal), phase: 'normal' },
      }));
    }
    // occasional command use
    if (Math.random() < 0.3) {
      events.push(makeEvent({
        '@timestamp': ago(h * H - rand(0, H)),
        action: 'command_used',
        sentiment: rand(0.2, 0.6),
        tilt_score: rand(0, 10),
        metadata: { command: pick(['ping', 'walletcheck', 'trust']), phase: 'normal' },
      }));
    }
  }
  return events;
}

function phaseBigWin() {
  // 10–11 h ago. Won big, euphoric burst of messages.
  const events = [];
  const base = 10.5 * H;
  for (let i = 0; i < 12; i++) {
    events.push(makeEvent({
      '@timestamp': ago(base - i * 4 * M),
      action: 'message_sent',
      sentiment: rand(0.7, 1.0),
      tilt_score: rand(10, 25),   // overconfidence starting
      metadata: { text: pick(MESSAGES.bigWin), phase: 'big_win' },
    }));
  }
  // tippped someone in excitement
  events.push(makeEvent({
    '@timestamp': ago(base - 5 * M),
    action: 'tip_sent',
    sentiment: 0.9,
    tilt_score: 20,
    amount_sol: rand(0.1, 0.3),
    metadata: { phase: 'big_win', note: 'tipped in excitement after big win' },
  }));
  // used /justthetip and /walletcheck
  events.push(makeEvent({
    '@timestamp': ago(base - 2 * M),
    action: 'command_used',
    sentiment: 0.8,
    tilt_score: 18,
    metadata: { command: 'justthetip', phase: 'big_win' },
  }));
  return events;
}

function phaseAfterLoss() {
  // 8–10 h ago. Lost the $600 back. Goes quiet, terse messages.
  const events = [];
  const base = 9 * H;
  const msgCount = Math.floor(rand(3, 6));   // far fewer than normal
  for (let i = 0; i < msgCount; i++) {
    events.push(makeEvent({
      '@timestamp': ago(base - i * 20 * M),
      action: 'message_sent',
      sentiment: rand(-0.5, -0.1),
      tilt_score: rand(35, 55),
      metadata: { text: pick(MESSAGES.afterLoss), phase: 'after_loss' },
    }));
  }
  return events;
}

function phaseReDeposit() {
  // 6–7 h ago. Comes back with explicit loss-chasing language.
  // This is the exact pattern: "just depoed $100 gonna try to do it again, need to run to 1k"
  const events = [];
  const base = 6.5 * H;

  // Return announcement — the key tilt signal
  events.push(makeEvent({
    '@timestamp': ago(base),
    action: 'message_sent',
    sentiment: rand(-0.3, 0.1),
    tilt_score: 62,
    metadata: {
      text: 'just depoed $100 gonna try to do it again need to run up to 1k',
      phase: 're_deposit',
      signal: 'loss_chasing_language',
      loss_chase_target_usd: 1000,
      re_deposit_after_loss: true,
    },
  }));

  // Follow-up messages over the next 30 min
  const followups = [
    { text: 'ok back, gonna do it again', offsetM: 3 },
    { text: 'need to get that $600 back', offsetM: 8 },
    { text: 'I can do it again I know I can', offsetM: 14 },
    { text: 'just need one good run', offsetM: 22 },
    { text: '$100 left gotta make it work', offsetM: 31 },
  ];
  for (const { text, offsetM } of followups) {
    events.push(makeEvent({
      '@timestamp': ago(base - offsetM * M),
      action: 'message_sent',
      sentiment: rand(-0.4, 0.0),
      tilt_score: jitter(65, 0.1),
      metadata: { text, phase: 're_deposit', signal: 'loss_chasing_language' },
    }));
  }

  // /walletcheck right after depositing — checking balance
  events.push(makeEvent({
    '@timestamp': ago(base - 1 * M),
    action: 'command_used',
    sentiment: -0.1,
    tilt_score: 60,
    metadata: { command: 'walletcheck', phase: 're_deposit', note: 'checked balance immediately after re-deposit' },
  }));

  return events;
}

function phaseChasing() {
  // 3–6 h ago. Actively chasing, message rate 3–5x baseline, volatility.
  const events = [];
  const base = 4.5 * H;
  for (let i = 0; i < 28; i++) {
    const offsetMs = base - i * jitter(6 * M, 0.5);
    events.push(makeEvent({
      '@timestamp': ago(offsetMs),
      action: 'message_sent',
      sentiment: rand(-0.7, -0.1),
      tilt_score: rand(60, 78),
      metadata: { text: pick(MESSAGES.chasing), phase: 'chasing' },
    }));
  }
  // Second re-deposit mid-chase
  events.push(makeEvent({
    '@timestamp': ago(base - 45 * M),
    action: 'message_sent',
    sentiment: -0.6,
    tilt_score: 74,
    metadata: {
      text: 'alright depositing $50 more',
      phase: 'chasing',
      signal: 're_deposit_mid_session',
      re_deposit_after_loss: true,
    },
  }));
  // Tip to another player (erratic spending)
  events.push(makeEvent({
    '@timestamp': ago(base - 20 * M),
    action: 'tip_sent',
    amount_sol: rand(0.3, 1.0),
    sentiment: -0.4,
    tilt_score: 72,
    metadata: { phase: 'chasing', note: 'erratic tip during loss chase' },
  }));
  // Multiple command bursts
  for (const cmd of ['walletcheck', 'justthetip', 'walletcheck', 'cooldown']) {
    events.push(makeEvent({
      '@timestamp': ago(base - rand(10, 90) * M),
      action: 'command_used',
      sentiment: rand(-0.5, -0.1),
      tilt_score: rand(65, 75),
      metadata: { command: cmd, phase: 'chasing' },
    }));
  }
  return events;
}

function phaseFullTilt() {
  // Last 90 min. Rapid-fire, desperate, explicit statements about being unable to stop.
  const events = [];
  const base = 85 * M;
  for (let i = 0; i < 35; i++) {
    const offsetMs = base - i * jitter(2.5 * M, 0.6);
    events.push(makeEvent({
      '@timestamp': ago(Math.max(offsetMs, 0)),
      action: 'message_sent',
      sentiment: rand(-1.0, -0.4),
      tilt_score: rand(78, 96),
      metadata: { text: pick(MESSAGES.fullTilt), phase: 'full_tilt' },
    }));
  }
  // Third deposit
  events.push(makeEvent({
    '@timestamp': ago(60 * M),
    action: 'message_sent',
    sentiment: -0.85,
    tilt_score: 91,
    metadata: {
      text: 'deposited again',
      phase: 'full_tilt',
      signal: 're_deposit_mid_session',
      deposit_count_tonight: 3,
      re_deposit_after_loss: true,
    },
  }));
  // tilt.detected event from core
  events.push(makeEvent({
    '@timestamp': ago(55 * M),
    action: 'tilt_detected',
    sentiment: -0.9,
    tilt_score: 93,
    metadata: {
      phase: 'full_tilt',
      signals: ['high_message_frequency', 'loss_chasing_language', 'multiple_redeposits', 'negative_sentiment_sustained'],
    },
  }));
  // Large tip — throwing money around (desperation / impulsivity)
  events.push(makeEvent({
    '@timestamp': ago(40 * M),
    action: 'tip_sent',
    amount_sol: rand(1.5, 4.0),
    sentiment: -0.8,
    tilt_score: 90,
    metadata: { phase: 'full_tilt', note: 'large impulsive tip during tilt' },
  }));
  // /lockvault attempt — user trying to self-limit
  events.push(makeEvent({
    '@timestamp': ago(15 * M),
    action: 'command_used',
    sentiment: -0.7,
    tilt_score: 88,
    metadata: { command: 'lockvault', phase: 'full_tilt', note: 'user triggered self-exclusion during tilt' },
  }));
  // Final messages — still active
  for (let i = 0; i < 6; i++) {
    events.push(makeEvent({
      '@timestamp': ago(i * 2 * M),
      action: 'message_sent',
      sentiment: rand(-1.0, -0.6),
      tilt_score: rand(85, 97),
      metadata: { text: pick(MESSAGES.fullTilt), phase: 'full_tilt' },
    }));
  }
  return events;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function ensureIndex() {
  const exists = await client.indices.exists({ index: INDEX }).catch(() => false);
  if (exists) {
    console.log(`  Index "${INDEX}" already exists — appending`);
    return;
  }
  await client.indices.create({
    index: INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        user_id:      { type: 'keyword' },
        guild_id:     { type: 'keyword' },
        channel_id:   { type: 'keyword' },
        action:       { type: 'keyword' },
        sentiment:    { type: 'float' },
        tilt_score:   { type: 'float' },
        amount_sol:   { type: 'double' },
        is_dm:        { type: 'boolean' },
        metadata:     { type: 'object', dynamic: true },
      },
    },
    // Note: serverless Elastic does not accept shard/replica settings
  });
  console.log(`  Created index "${INDEX}"`);
}

async function bulkIndex(events) {
  const BATCH = 200;
  let total = 0;
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH);
    const ops = batch.flatMap(doc => [{ index: { _index: INDEX } }, doc]);
    const resp = await client.bulk({ operations: ops, refresh: false });
    if (resp.errors) {
      const errs = resp.items.filter(it => it.index?.error);
      if (errs.length) console.warn(`  ⚠ ${errs.length} errors in batch at offset ${i}`);
    }
    total += batch.length;
    process.stdout.write(`\r  Indexed ${total}/${events.length} events...`);
  }
  // Final refresh so ES|QL queries see the data immediately
  await client.indices.refresh({ index: INDEX });
  process.stdout.write('\n');
}

async function main() {
  console.log('\n🎲  TiltCheck — Realistic Tilt Scenario Seeder');
  console.log(`   Elastic   : ${ELASTIC_URL}`);
  console.log(`   User ID   : ${DEMO_USER_ID}`);
  console.log(`   Index     : ${INDEX}\n`);

  await ensureIndex();

  console.log('  Building event timeline...');
  const events = [
    ...phaseNormal(),      // 36–48h ago  — calm baseline
    ...phaseBigWin(),      // ~10.5h ago  — $60→$600 euphoria
    ...phaseAfterLoss(),   // ~9h ago     — lost it all, goes quiet
    ...phaseReDeposit(),   // ~6.5h ago   — "just depoed $100 gonna run to 1k"
    ...phaseChasing(),     // ~4.5h ago   — actively chasing, 2nd deposit
    ...phaseFullTilt(),    // last 90 min — full spiral, 3rd deposit, /lockvault
  ];

  // Sort chronologically
  events.sort((a, b) => new Date(a['@timestamp']) - new Date(b['@timestamp']));

  console.log(`  ${events.length} events across 6 phases\n`);

  const phases = {};
  for (const e of events) {
    const p = e.metadata?.phase ?? 'unknown';
    phases[p] = (phases[p] ?? 0) + 1;
  }
  for (const [phase, count] of Object.entries(phases)) {
    console.log(`    ${phase.padEnd(14)} ${count} events`);
  }
  console.log('');

  await bulkIndex(events);

  console.log('\n✅  Seeding complete!\n');
  console.log('  Tilt signals embedded:');
  console.log('    • $60 → $600 big win followed by total loss');
  console.log('    • Re-deposit with explicit "need to run to 1k" language');
  console.log('    • 3 deposits in one session');
  console.log('    • Message velocity 4–5x baseline in tilt phase');
  console.log('    • Sustained negative sentiment drop (-0.2 avg → -0.85 avg)');
  console.log('    • Tilt score escalation: 0→15 → 60→65 → 78→96');
  console.log('    • /lockvault triggered by user during full tilt');
  console.log(`\n  Run the bot and the agent will DM user ${DEMO_USER_ID} within 5 min.\n`);
}

main().catch(err => {
  console.error('\n❌  Seeder failed:', err?.message ?? err);
  process.exit(1);
});
