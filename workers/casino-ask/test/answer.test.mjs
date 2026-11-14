// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { answerQuestion, checkClaim, SYSTEM_PROMPT } from '../src/answer.js';
import { makeIo } from '../src/index.js';
import { memoryStore, resetMemory } from '../src/limits.js';
import { fakeFetch } from './fixtures.mjs';

const KEY = { GROQ_API_KEY: 'test-key-not-real' };

function deps(env, opts) {
  const calls = [];
  const fetchImpl = fakeFetch({ ...opts, calls });
  return { calls, d: { env, fetchImpl, io: makeIo(env, memoryStore(), fetchImpl) } };
}

beforeEach(() => resetMemory());

test('Acebet freeze card: says I don\'t know without asking the model, and lists the pages it checked', async () => {
  const { calls, d } = deps(KEY, { groq: { known: false, answer: '', sources: [], nearest: '', nearest_sources: [] } });
  const r = await answerQuestion('How long does Acebet take for freeze card redemption?', d);
  assert.equal(r.status, 'unknown');
  assert.match(r.answer, /^I don't know\. Acebet's pages and TiltCheck's records don't mention "freeze"\./);
  assert.ok(r.checked.some((s) => s.url === 'https://acebet.cc/redemptions'));
  assert.ok(calls.some((c) => c.url.startsWith('https://api.groq.com/')), 'asks the model only for the closest related fact');
});

test('Acebet freeze card: keeps a checked "closest fact" with its source', async () => {
  const groq = (body) => {
    const prompt = body.messages[1].content;
    const id = /\[(S\d+)\] Acebet\.cc Promotional Play Rules[^\n]*\n[^\n]*30 days/.exec(prompt)[1];
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      known: true, answer: 'Freeze card redemptions take 2 days.', sources: [id],
      nearest: "Acebet's Promotional Play Rules say redemptions can take up to 30 days to process.", nearest_sources: [id],
    }) } }] }));
  };
  const { d } = deps(KEY, { groq });
  const r = await answerQuestion('How long does Acebet take for freeze card redemption?', d);
  assert.equal(r.status, 'unknown', 'a question word no source mentions forces I don\'t know, whatever the model says');
  assert.match(r.nearest, /up to 30 days/);
  assert.deepEqual(r.sources, [{ title: 'Acebet.cc Promotional Play Rules', url: 'https://acebet.cc/policies/promotional-play-policy' }]);
});

test('answered: cites the page, every figure traced to it', async () => {
  const groq = (body) => {
    const prompt = body.messages[1].content;
    assert.match(body.messages[0].content, /Never guess/);
    const id = /\[(S\d+)\] Acebet\.cc Redemptions[^\n]*\n[^\n]*9,500 SC/.exec(prompt)[1];
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      known: true, answer: "Acebet's Redemptions page says the minimum is 50 SC per redemption and the daily cap is 9,500 SC!", sources: [id], nearest: '', nearest_sources: [],
    }) } }] }));
  };
  const { d } = deps(KEY, { groq });
  const r = await answerQuestion('What is the minimum redemption on Acebet?', d);
  assert.equal(r.status, 'answered');
  assert.doesNotMatch(r.answer, /!/);
  assert.deepEqual(r.sources, [{ title: 'Acebet.cc Redemptions', url: 'https://acebet.cc/redemptions' }]);
});

test('a figure that is not in the cited excerpt turns the answer into I don\'t know', async () => {
  const groq = (body) => {
    const id = /\[(S\d+)\] Acebet\.cc Redemptions/.exec(body.messages[1].content)[1];
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      known: true, answer: 'Acebet pays crypto in 15 minutes.', sources: [id], nearest: '', nearest_sources: [],
    }) } }] }));
  };
  const { d } = deps(KEY, { groq });
  const r = await answerQuestion('How long does Acebet take to redeem crypto?', d);
  assert.equal(r.status, 'unknown');
  assert.match(r.answer, /^I don't know/);
  assert.deepEqual(r.sources, []);
});

test('citations to excerpts that were never given are dropped', () => {
  const ex = [{ id: 'S1', title: 'T', url: 'https://acebet.cc/redemptions', text: 'Minimums start at 50 SC.' }];
  assert.equal(checkClaim('Minimum is 50 SC.', ['S9'], ex), null);
  assert.equal(checkClaim('Minimum is 50 SC.', [], ex), null);
  assert.equal(checkClaim('Minimum is 60 SC.', ['S1'], ex), null);
  assert.equal(checkClaim('Minimum is 50 SC.', ['S1'], ex).text, 'Minimum is 50 SC.');
});

test('player reports from CollectClock are a source', async () => {
  const groq = (body) => {
    const id = /\[(S\d+)\] CollectClock player reports: Acebet/.exec(body.messages[1].content)[1];
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      known: true, answer: '4 players reported slow withdrawals at Acebet in the last 30 days.', sources: [id], nearest: '', nearest_sources: [],
    }) } }] }));
  };
  const { d } = deps(KEY, { groq });
  const r = await answerQuestion('Are Acebet withdrawals slow?', d);
  assert.equal(r.status, 'answered');
  assert.equal(r.sources[0].url, 'https://collectclock-api.j-chapman7.workers.dev/casino-reports/summary');
});

test('no casino named: says so and lists what is covered', async () => {
  const { d } = deps(KEY);
  const r = await answerQuestion('how long do withdrawals take', d);
  assert.equal(r.status, 'no_casino');
  assert.match(r.answer, /^I don't know which casino/);
  assert.match(r.answer, /Acebet/);
});

test('no key: never answers, still says I don\'t know when sources are silent', async () => {
  const { calls, d } = deps({});
  const r1 = await answerQuestion('How long does Acebet take to redeem?', d);
  assert.equal(r1.status, 'offline');
  const r2 = await answerQuestion('Does Acebet have a freeze card?', d);
  assert.equal(r2.status, 'unknown');
  assert.ok(!calls.some((c) => c.url.startsWith('https://api.groq.com/')));
});

test('model failure is an error, not an answer', async () => {
  const { d } = deps(KEY, { groq: new Error('down') });
  const r = await answerQuestion('How long does Acebet take to redeem?', d);
  assert.equal(r.status, 'error');
});

test('pages unreachable: I don\'t know, with the pages that were tried', async () => {
  const { d } = deps(KEY, { failPages: true });
  const r = await answerQuestion('How long does Acebet take to redeem?', d);
  assert.equal(r.status, 'unknown');
  assert.equal(r.checked.filter((s) => s.url.startsWith('https://acebet.cc/')).length, 4);
});

test('prompt keeps the model to the excerpts', () => {
  assert.match(SYSTEM_PROMPT, /Use only the numbered excerpts/);
  assert.match(SYSTEM_PROMPT, /Every number you write must appear in an excerpt you cite/);
});
