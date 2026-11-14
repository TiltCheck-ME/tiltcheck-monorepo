// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkText, expandQuery, htmlToText, numberSet, numbersIn, tokenize } from '../src/text.js';

test('htmlToText drops scripts, styles, nav and footer and decodes entities', () => {
  const t = htmlToText('<nav>menu</nav><script>var a="x"</script><style>.b{}</style><p>Up to 30&nbsp;days &amp; more&rsquo;s</p><footer>f</footer>');
  assert.equal(t, "Up to 30 days & more's");
});

test('chunkText keeps every word and overlaps windows', () => {
  const text = Array.from({ length: 200 }, (_, i) => `Sentence ${i} ends here.`).join(' ');
  const chunks = chunkText(text, 300, 60);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every((c) => c.length <= 300));
  assert.ok(chunks[0].includes('Sentence 0') && chunks.at(-1).includes('Sentence 199'));
});

test('tokenize drops question filler but keeps short casino words', () => {
  assert.deepEqual(tokenize("How long does Acebet take for freeze card redemption?"), ['acebet', 'freeze', 'card', 'redemption']);
  assert.deepEqual(tokenize("What's the SC min on KYC?"), ['sc', 'min', 'kyc']);
});

test('expandQuery adds a soft time term for "how long" questions and drops the casino name', () => {
  const terms = expandQuery('How long does Acebet take to redeem?', ['Acebet']);
  assert.deepEqual(terms.map((t) => t.term), ['redeem', '(time)']);
  assert.equal(terms[1].soft, true);
  assert.ok(terms[0].forms.has('withdrawal'));
});

test('numbers: digits with commas and percents, and spelled-out numbers in sources', () => {
  assert.deepEqual(numbersIn('9,500 SC, 2.50% fee, up to 30 days'), ['9500', '2.50%', '30']);
  const s = numberSet('up to twenty-four (24) hours, thirty days, 4.00%');
  for (const n of ['24', '30', '4.00%', '4.00', '4']) assert.ok(s.has(n), n);
});
