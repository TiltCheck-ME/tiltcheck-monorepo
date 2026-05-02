/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-02 */
import crypto from 'crypto';

// Simple AI-aware trivia generator + auto-filter pipeline
// - If AI provider env vars (OPENAI_API_KEY / GEMINI_API_KEY / GROQ_API_KEY) exist, the code will attempt to use them (placeholder).
// - Falls back to a deterministic mock generator for tests and local dev.

const PROFANITY = ['fuck', 'shit', 'bitch', 'asshole', 'cunt'];

function randomId() {
  return `ai-q-${crypto.randomUUID()}`;
}

export async function generateCandidate(topic = 'casino') {
  // If providers present, in a real implementation we would call ai-client or the AI gateway.
  const hasAi = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.HUGGINGFACE_TOKEN);
  if (!hasAi) {
    // Mock generation: deterministic sample based on topic
    const sample = {
      id: randomId(),
      topic,
      text: `What is a common term in ${topic} that tilted players use?`,
      choices: { A: 'Tilt', B: 'HODL', C: 'RNG', D: 'Comp' },
      answer: 'A',
      explanation: `Tilt is the emotional state that causes poor decisions in ${topic}.`,
      generatedBy: hasAi ? 'ai' : 'mock',
      generatedAt: new Date().toISOString(),
    };
    return sample;
  }

  // Placeholder AI path: for now return a mock but tag as ai
  return {
    id: randomId(),
    topic,
    text: `(AI) In ${topic}, what is the name for the emotional state that ruins decisions?`,
    choices: { A: 'Tilt', B: 'FOMO', C: 'Chasing', D: 'Paper Hands' },
    answer: 'A',
    explanation: `Tilt is an emotional/behavioral state that leads to poor gambling decisions.`,
    generatedBy: 'ai',
    generatedAt: new Date().toISOString(),
  };
}

export function autoFilter(candidate) {
  const text = String(candidate.text || '').toLowerCase();
  const explanation = String(candidate.explanation || '').toLowerCase();
  const hay = `${text} ${explanation}`;

  let flaggedTerms = [];
  let matches = 0;
  for (const bad of PROFANITY) {
    if (hay.includes(bad)) {
      flaggedTerms.push(bad);
      matches++;
    }
  }

  const toxicityScore = Math.min(1, matches / Math.max(1, PROFANITY.length));
  let recommendation = 'approve';
  if (toxicityScore === 0) recommendation = 'approve';
  else if (toxicityScore < 0.3) recommendation = 'review';
  else if (toxicityScore >= 0.3) recommendation = 'reject';

  return {
    isSafe: toxicityScore === 0,
    toxicityScore,
    flaggedTerms,
    recommendation,
  };
}

export async function submitCandidateToControlRoom(candidate) {
  const controlUrl = process.env.CONTROL_ROOM_API_URL || 'http://localhost:3001';
  const secret = process.env.INTERNAL_API_SECRET || '';
  const endpoint = `${controlUrl.replace(/\/$/, '')}/api/internal/trivia-candidates`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-internal-secret': secret } : {}),
    },
    body: JSON.stringify({ candidate }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to submit candidate to control-room: ${res.status} ${body}`);
  }

  return res.json();
}
