// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18
// RotoWire payout-speed benchmarks (ported from PR #751) in the Ask worker.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { answerQuestion } from '../src/answer.js';
import { handle, makeIo } from '../src/index.js';
import { memoryStore, resetMemory } from '../src/limits.js';
import { BENCHMARKS, formatAsOf, isPayoutRankingQuestion, payoutRankingAnswer, payoutSpeedTier, rankBenchmarks } from '../src/payout.js';
import { CATALOG, findCasinos } from '../src/sources.js';
import { fakeFetch } from './fixtures.mjs';

const KEY = { GROQ_API_KEY: 'test-key-not-real' };
const ROTOWIRE = 'https://www.rotowire.com/betting/casinos/instant-withdrawals';

function deps(env, opts) {
  const calls = [];
  const fetchImpl = fakeFetch({ ...opts, calls });
  return { calls, d: { env, fetchImpl, io: makeIo(env, memoryStore(), fetchImpl) } };
}

beforeEach(() => resetMemory());

test('live data: 18 RotoWire benchmarks, each with source, URL and as-of date', () => {
  assert.equal(BENCHMARKS.length, 18);
  for (const b of BENCHMARKS) {
    assert.equal(b.benchmark.source, 'RotoWire', b.name);
    assert.equal(b.benchmark.sourceUrl, ROTOWIRE, b.name);
    assert.match(b.benchmark.asOf, /^\d{4}-\d{2}-\d{2}$/, b.name);
  }
  assert.equal(formatAsOf('2026-11-17'), 'Nov 17 2026');
});

test('speed tiers match #751', () => {
  assert.equal(payoutSpeedTier('Instant'), 0);
  assert.equal(payoutSpeedTier('>5 Minutes'), 1);
  assert.equal(payoutSpeedTier('Up to 1 hour'), 2);
  assert.equal(payoutSpeedTier('1-4 hours'), 3);
  assert.equal(payoutSpeedTier('Up to 24 hours (same day)'), 4);
  assert.equal(payoutSpeedTier('1 business day'), 5);
  const ranked = rankBenchmarks();
  assert.equal(ranked[0].tier, 0);
  assert.equal(ranked.at(-1).name, 'DraftKings Casino');
});

test('ranking questions are recognized; sweeps and plain questions are not', () => {
  assert.ok(isPayoutRankingQuestion('Which casino pays out fastest?'));
  assert.ok(isPayoutRankingQuestion('fastest payout casinos'));
  assert.ok(isPayoutRankingQuestion('which casinos have instant withdrawals'));
  assert.ok(!isPayoutRankingQuestion('fastest payout sweepstakes casino'));
  assert.ok(!isPayoutRankingQuestion('how long do withdrawals take'));
});

test('"Which casino pays out fastest?" is answered from RotoWire with the source, no model call', async () => {
  const { calls, d } = deps(KEY);
  const r = await answerQuestion('Which casino pays out fastest?', d);
  assert.equal(r.status, 'answered');
  assert.match(r.answer, /^RotoWire \(as of Nov 17 2026\) lists Instant payouts at /);
  for (const name of ['BetRivers', 'betPARX Casino', 'Hard Rock Bet Casino', 'Hollywood Casino', 'Horseshoe Casino']) assert.match(r.answer, new RegExp(name));
  assert.doesNotMatch(r.answer, /DraftKings/);
  assert.match(r.answer, /not TiltCheck tests/);
  assert.match(r.answer, /Florida is not one of them/);
  assert.doesNotMatch(r.answer, /!/);
  assert.equal(r.sources[0].url, ROTOWIRE);
  assert.ok(!calls.some((c) => c.url.startsWith('https://api.groq.com/')));
});

test('ranking works without the Groq key too', async () => {
  const { d } = deps({});
  const r = await answerQuestion('fastest cash out casino?', d);
  assert.equal(r.status, 'answered');
});

test('empty benchmark list: falls back to no_casino, never guesses', async () => {
  assert.equal(payoutRankingAnswer([]), null);
  const { d } = deps(KEY);
  const r = await answerQuestion('Which casino pays out fastest?', { ...d, benchmarks: [] });
  assert.equal(r.status, 'no_casino');
});

test('benchmark-only casinos are in the catalog and found by name', () => {
  const hr = findCasinos('How fast does Hard Rock Bet pay out?', CATALOG);
  assert.equal(hr[0].name, 'Hard Rock Bet Casino');
  assert.ok(hr[0].benchmark);
  assert.equal(findCasinos('how fast does hollywood casino pay out', CATALOG)[0].name, 'Hollywood Casino');
  // Audited casinos keep their audit and gain the benchmark.
  const br = CATALOG.find((c) => c.name === 'BetRivers');
  assert.ok(br.audit && br.benchmark);
});

test('"how fast does <casino> pay out": the RotoWire figure reaches the model as a labeled excerpt and is cited', async () => {
  let prompt = '';
  const groq = (body) => {
    prompt = body.messages[1].content;
    const id = /\[(S\d+)\] RotoWire payout speed: Hollywood Casino/.exec(prompt)[1];
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      known: true, answer: 'RotoWire (as of Nov 17 2026) lists Hollywood Casino payouts as Instant via Debit Card, PayPal, Skrill, Venmo.', sources: [id], nearest: '', nearest_sources: [],
    }) } }] }));
  };
  const { d } = deps(KEY, { groq });
  const r = await answerQuestion('How fast does Hollywood Casino pay out?', d);
  assert.match(prompt, /not the casino's own terms and not a TiltCheck test/);
  assert.equal(r.status, 'answered');
  assert.deepEqual(r.sources, [{ title: 'RotoWire payout speed: Hollywood Casino', url: ROTOWIRE }]);
});

test('a time not in the RotoWire excerpt is still rejected', async () => {
  const groq = (body) => {
    const id = /\[(S\d+)\] RotoWire payout speed: bet365 Casino/.exec(body.messages[1].content)[1];
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      known: true, answer: 'bet365 pays out in 10 minutes.', sources: [id], nearest: '', nearest_sources: [],
    }) } }] }));
  };
  const { d } = deps(KEY, { groq });
  const r = await answerQuestion('How fast does bet365 pay out?', d);
  assert.equal(r.status, 'unknown');
});

test('POST /ask: ranking question over HTTP', async () => {
  const req = new Request('https://ask.example/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://tiltcheck.me', 'cf-connecting-ip': '203.0.113.7' },
    body: JSON.stringify({ question: 'Which casino pays out fastest?' }),
  });
  const b = await (await handle(req, {}, null, fakeFetch())).json();
  assert.equal(b.status, 'answered');
  assert.equal(b.sources[0].url, ROTOWIRE);
});

test('a model answer that leaves RotoWire out gets the credit and date added', async () => {
  const groq = (body) => {
    const id = /\[(S\d+)\] RotoWire payout speed: BetRivers/.exec(body.messages[1].content)[1];
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      known: true, answer: 'BetRivers payouts are Instant via Play+.', sources: [id], nearest: '', nearest_sources: [],
    }) } }] }));
  };
  const { d } = deps(KEY, { groq });
  const r = await answerQuestion('How fast does BetRivers pay out?', d);
  assert.equal(r.status, 'answered');
  assert.equal(r.answer, 'BetRivers payouts are Instant via Play+. (Payout speed per RotoWire, as of Nov 17 2026.)');
});

test('gpt-oss gets room to reason before the JSON (live json_validate_failed on 2026-11-18)', async () => {
  let sent;
  const groq = (body) => {
    sent = body;
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ known: false, answer: '', sources: [], nearest: '', nearest_sources: [] }) } }] }));
  };
  const { d } = deps({ ...KEY, GROQ_MODEL: 'openai/gpt-oss-120b' }, { groq });
  await answerQuestion('How fast does BetRivers pay out?', d);
  assert.equal(sent.max_tokens, 1200);
  assert.equal(sent.reasoning_effort, 'low');
  const { d: d2 } = deps(KEY, { groq });
  await answerQuestion('How fast does BetRivers pay out?', d2);
  assert.equal(sent.reasoning_effort, undefined, 'not sent to models that do not take it');
});
