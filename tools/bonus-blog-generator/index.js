import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const INTEL_FILE = path.join(__dirname, '..', '..', 'apps', 'api', 'data', 'degen-intel-events.jsonl');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'apps', 'web', 'public', 'data', 'daily-bonuses.json');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/v1';
const AI_MODEL = process.env.AI_MODEL || 'llama3.2:1b';

async function main() {
  console.log('[INFO] Generating Daily Bonus Blog Post...');

  if (!existsSync(INTEL_FILE)) {
    console.warn('[WARN] No intel data found. Run scripts/gmail-ingest.mjs first.');
    return;
  }

  const raw = readFileSync(INTEL_FILE, 'utf-8').trim();
  if (!raw) {
    console.warn('[WARN] Intel file is empty.');
    return;
  }

  const events = raw.split('\n').map(line => JSON.parse(line));
  const gmailEvents = events.filter(e => e.source === 'gmail-agent-nodejs');

  if (gmailEvents.length === 0) {
    console.warn('[WARN] No Gmail ingested bonuses found.');
    return;
  }

  // Get only the most recent events (last 10 emails)
  const recentEmails = gmailEvents.slice(-10);
  const emailSummaries = recentEmails.map(e => {
    const lines = e.report.split('\n');
    const from = lines.find(l => l.startsWith('From:')) || 'Unknown Sender';
    const subject = lines.find(l => l.startsWith('Subject:')) || 'No Subject';
    const body = lines.slice(3).join('\n').slice(0, 500); // Sample of body
    return `${from}\n${subject}\nContent: ${body}`;
  }).join('\n---\n');

  console.log(`[INFO] Found ${recentEmails.length} recent emails for processing.`);

  // Generate the blog post narrative using AI
  const prompt = `You are TiltCheck's Degen Bonus Scout. Your job is to summarize the latest bonus drops from casino emails into a short, punchy, and helpful "Daily Bonus Update" for the website.

Input emails:
${emailSummaries}

Format your response as strict JSON:
{
  "title": "A catchy title for today's bonus drop",
  "highlight": "The best bonus found (1 sentence)",
  "bonuses": [
    { "casino": "Casino Name", "type": "Bonus Type (e.g. 50 Free Spins)", "code": "CODE (if found) or 'Auto-credited'", "expiry": "Date found or 'N/A'" }
  ],
  "degenInsight": "A cheeky degen-style insight about the current bonus meta (1-2 sentences)"
}

Keep it brief and degen-centric. No corporate jargon. No financial advice.`;

  try {
    const res = await fetch(`${OLLAMA_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        format: 'json'
      })
    });

    if (!res.ok) throw new Error(`AI Request failed with status ${res.status}`);
    const data = await res.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Update the output file
    const payload = {
      lastUpdated: new Date().toISOString(),
      ...result
    };

    const outDir = path.dirname(OUTPUT_FILE);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

    console.log('[SUCCESS] Daily Bonus Blog Post generated and saved to:', OUTPUT_FILE);
  } catch (error) {
    console.error('[ERROR] Failed to generate blog post:', error.message);
  }
}

main();
