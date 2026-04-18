// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

const TOPIC_STOPWORDS = new Set([
  'about', 'after', 'again', 'all', 'also', 'always', 'and', 'any', 'are', 'back', 'been', 'before',
  'being', 'both', 'but', 'can', 'cant', 'could', 'did', 'didnt', 'does', 'doesnt', 'dont', 'down',
  'even', 'from', 'game', 'get', 'got', 'had', 'has', 'have', 'hell', 'here', 'into', 'its', 'just',
  'know', 'like', 'long', 'loss', 'lost', 'maybe', 'more', 'much', 'need', 'never', 'next', 'not',
  'now', 'off', 'out', 'over', 'people', 'play', 'playing', 'really', 'right', 'same', 'shit', 'some',
  'still', 'that', 'thats', 'the', 'their', 'them', 'then', 'there', 'they', 'this', 'those', 'time',
  'today', 'very', 'want', 'watch', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'would',
  'yeah', 'your', 'youre',
]);

const CASINO_NAMES = [
  'stake', 'roobet', 'bc.game', 'bcgame', 'shuffle', 'rainbet', 'rollbit', 'duelbits', 'gamdom',
  'metaspins', 'chips', 'wowvegas', 'pulsz', 'chumba', 'mcluck', 'modo', 'crowncoins',
];

const TILT_WORDS = ['tilt', 'tilted', 'chasing', 'rigged', 'cooked', 'burned', 'busted', 'lost', 'down bad', 'rage'];
const HYPE_WORDS = ['cook', 'cooked them', 'heater', 'juiced', 'max win', 'printing', 'free roll', 'send it', 'moon'];
const SAFETY_WORDS = ['scam', 'fake', 'phish', 'phishing', 'drain', 'hacked', 'suspicious', 'unsafe', 'fraud'];

function normalizeToken(token) {
  return token
    .toLowerCase()
    .replace(/^[@#]+/, '')
    .replace(/^[^a-z0-9]+|[^a-z0-9.]+$/g, '');
}

function countMatches(text, phrases) {
  const value = String(text || '').toLowerCase();
  return phrases.reduce((sum, phrase) => sum + (value.includes(phrase) ? 1 : 0), 0);
}

function getTopItems(map, limit) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

function formatList(items) {
  if (items.length === 0) {
    return 'nothing coherent besides standard degen static';
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function detectMood(tiltHits, hypeHits, safetyHits) {
  if (safetyHits >= 3 && safetyHits >= tiltHits) {
    return 'suspicious';
  }
  if (tiltHits >= hypeHits + 2) {
    return 'tilted';
  }
  if (hypeHits >= tiltHits + 2) {
    return 'heated';
  }
  return 'mixed';
}

export function buildTiltCheckDailyDegenSummary(messages, options = {}) {
  const batch = Array.isArray(messages) ? messages : [];
  const messageCount = batch.length;
  const authorCounts = new Map();
  const topicCounts = new Map();
  const casinoCounts = new Map();

  let tiltHits = 0;
  let hypeHits = 0;
  let safetyHits = 0;

  for (const message of batch) {
    const author = String(message?.author || 'unknown').trim() || 'unknown';
    authorCounts.set(author, (authorCounts.get(author) || 0) + 1);

    const content = String(message?.content || '');
    const normalized = content.toLowerCase();
    tiltHits += countMatches(normalized, TILT_WORDS);
    hypeHits += countMatches(normalized, HYPE_WORDS);
    safetyHits += countMatches(normalized, SAFETY_WORDS);

    for (const casino of CASINO_NAMES) {
      if (normalized.includes(casino)) {
        casinoCounts.set(casino, (casinoCounts.get(casino) || 0) + 1);
      }
    }

    for (const rawToken of normalized.split(/[^a-z0-9.@#]+/g)) {
      const token = normalizeToken(rawToken);
      if (!token || token.length < 4 || /^\d+$/.test(token) || TOPIC_STOPWORDS.has(token)) {
        continue;
      }
      topicCounts.set(token, (topicCounts.get(token) || 0) + 1);
    }
  }

  const uniqueAuthors = authorCounts.size;
  const topAuthors = getTopItems(authorCounts, 3);
  const topTopics = getTopItems(topicCounts, 3);
  const topCasinos = getTopItems(casinoCounts, 2);
  const mood = detectMood(tiltHits, hypeHits, safetyHits);

  const fromTimestamp = options.fromTimestamp || batch[0]?.timestamp || null;
  const toTimestamp = options.toTimestamp || batch[batch.length - 1]?.timestamp || null;
  const rangeLine = fromTimestamp && toTimestamp
    ? `${new Date(fromTimestamp).toLocaleString()} -> ${new Date(toTimestamp).toLocaleString()}`
    : 'ad-hoc batch';

  const openerByMood = {
    tilted: 'The pit vibes were greasy today.',
    heated: 'The chat came in hot today.',
    suspicious: 'The chat smelled a little off today.',
    mixed: 'The degen tape was all over the place today.',
  };

  const tiltcheckTakeByMood = {
    tilted: 'This crowd needs fewer “one more depo” spirals and more forced cooldown energy.',
    heated: 'Good momentum, but heater chat can flip into punt chat fast.',
    suspicious: 'Worth watching for phishing, fake bonuses, and sketchy “support” energy.',
    mixed: 'Nothing fully snapped, but the room is still bouncing between cope, hype, and chaos.',
  };

  return [
    '## TiltCheck Daily Degen Summary',
    `- **Range:** ${rangeLine}`,
    `- **Table count:** ${messageCount} messages from ${uniqueAuthors} degens`,
    `- **Headline:** ${openerByMood[mood]} Main table talk centered on ${formatList(topTopics)}.`,
    `- **Mood check:** ${mood} (${tiltHits} tilt hits, ${hypeHits} hype hits, ${safetyHits} safety hits)`,
    `- **Casino roll call:** ${formatList(topCasinos)}`,
    `- **Loudest degenerates:** ${formatList(topAuthors)}`,
    `- **TiltCheck take:** ${tiltcheckTakeByMood[mood]}`,
  ].join('\n');
}
