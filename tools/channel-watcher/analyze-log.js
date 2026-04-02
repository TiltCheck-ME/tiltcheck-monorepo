import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: false });

const LOG_FILE = path.join(__dirname, 'messages.jsonl');
const REPORT_FILE_BUSINESS = path.join(__dirname, 'reports_business.md');
const REPORT_FILE_LORE = path.join(__dirname, 'reports_lore.md');
const TICKER_LOG_FILE = path.join(__dirname, '..', '..', 'apps', 'api', 'data', 'web_signals.json');
const CITATIONS_FILE = path.join(__dirname, 'citations.md');
const GPT_MAX_MESSAGES = 150;
const PROVIDER = (process.env.PROVIDER || 'groq').toLowerCase();
const LORE_MODE = process.argv.includes('--lore'); // Only generate comic lore when asked

const PROVIDERS = {
    ollama: {
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama',
        model: process.env.OLLAMA_MODEL || process.env.AI_MODEL || 'llama3.2:1b',
        label: 'Ollama (local)',
    },
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY || '',
        model: process.env.GROQ_MODEL || process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        label: 'Groq (free cloud)',
    },
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: process.env.GEMINI_API_KEY || '',
        model: process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-2.0-flash',
    },
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENAI_API_KEY || '', // Using the sk-or key from root env
        model: 'google/gemini-2.5-flash', // A fast, capable openrouter model
        label: 'OpenRouter (Gemini)',
    }
};

let currentProviderKey = PROVIDER;
let currentAi = PROVIDERS[currentProviderKey] || PROVIDERS.ollama;

const BUSINESS_PROMPT = `You are a community intelligence analyst for TiltCheck, a responsible gambling platform.
Analyze this batch of Discord messages. Write a structured report with these sections:

## Pain Points
Frustrations, casino issues, bad experiences, losses.

## Friction Moments
Confusion, broken processes, unanswered questions.

## Scam & Safety Signals
Predatory links, suspicious offers, unsafe behavior.

## Emotional State
Overall mood of this batch (tilted, hopeful, burned out, etc).

## TiltCheck Opportunities
3-5 specific things TiltCheck could build or do based on this data.

Be direct and actionable. Write for the founder reading over morning coffee.`;

const SIGNAL_PROMPT = `As the TiltCheck Fact-Checker & Signal Extractor:
Analyze this batch of Discord messages and extract 3-5 "Verified Casino Signals" for our website's live ticker.
IMPORTANT: ONLY EXTRATC RELEVANT CASINO ACTIVITY (Stake, Roobet, BC.Game, etc). Discard all general crypto or unrelated chat.
We only want high-signal gambling events for the public feed.
Types of signals:
- [tilt] Casino Tilt detected (emotional/desperation on a specific site)
- [sec] Casino Phishing blocked (fake bonus links/scams)
- [trust] Casino Anomaly found (fairness/payout issues)
- [vault] Control win (user moved winnings to vault)

Format: JSON array of items like {"text": "...", "type": "..."}.
Output ONLY the JSON. No other text.`;

const LORE_PROMPT = `You are a comedy writer studying a Discord server full of gambling degenerates.
Analyze these messages and write raw material for a comic strip.
Highlight tragic losses, chaotic energy, funny interactions, and potential character arcs.
Be brutally honest and funny. These degenerates are chronically online and would laugh at themselves.`;

// We will pass the appropriate prompt per call — default to business
const GPT_SYSTEM_PROMPT = BUSINESS_PROMPT;

async function callProvider(provider, text, count, systemPrompt = GPT_SYSTEM_PROMPT, modelOverride = null) {
    const model = modelOverride || provider.model;
    console.log(chalk.cyan(`  → ${provider.label} (${model})...`));
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 mins for slow local models

        const res = await fetch(`${provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analyze these ${count} messages:\n\n${text}` },
                ],
                temperature: 0.3,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errBody = await res.text();
            console.error(chalk.red(`  ✗ API Error (${res.status}):`), errBody);
            return { success: false, status: res.status, error: errBody };
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || null;
        if (content) console.log(chalk.green(`  ✓ Analysis received (${content.length} chars)`));
        return { success: true, content, status: 200, modelUsed: model };
    } catch (err) {
        console.error(chalk.red('  ✗ Fetch Error:'), err.message);
        return { success: false, status: 500, error: err.message };
    }
}

async function saveWebSignals(signals) {
    if (!signals || !Array.isArray(signals)) return;
    try {
        const existing = existsSync(TICKER_LOG_FILE) ? JSON.parse(readFileSync(TICKER_LOG_FILE, 'utf-8')) : [];
        const combined = [...signals, ...existing].slice(0, 15); // Keep last 15
        writeFileSync(TICKER_LOG_FILE, JSON.stringify(combined, null, 2));
        console.log(chalk.green(`  ✓ ${signals.length} Web Signals synced to API.`));
    } catch (err) {
        console.error(chalk.red('  ✗ Signal Sync Error:'), err.message);
    }
}

async function run() {
    if (!existsSync(LOG_FILE)) {
        console.error(chalk.red('❌ messages.jsonl not found. Run the scraper first.'));
        return;
    }

    console.log(chalk.bold.green('\n📊 TiltCheck Log Analyzer\n'));

    const raw = readFileSync(LOG_FILE, 'utf-8');
    const messages = raw.trim().split('\n')
        .map(line => JSON.parse(line))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log(chalk.white(`Found ${messages.length} messages in log.`));

    const chunks = [];
    for (let i = 0; i < messages.length; i += GPT_MAX_MESSAGES) {
        chunks.push(messages.slice(i, i + GPT_MAX_MESSAGES));
    }

    const sessionTime = new Date();
    const sessionLabel = sessionTime.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const sessionISO = sessionTime.toISOString();

    // Write a clear session banner to both files so runs never blend together
    const sessionBanner = `\n\n${'═'.repeat(72)}\n# 📊 Analysis Session — ${sessionLabel}\n> ISO: ${sessionISO}  \n> Provider: ${currentAi.label} · Model: ${currentAi.model}  \n> Messages: ${messages.length} across ${chunks.length} chunks\n${'═'.repeat(72)}\n`;
    appendFileSync(REPORT_FILE_BUSINESS, sessionBanner);
    appendFileSync(CITATIONS_FILE, sessionBanner);

    const FROM_CHUNK = parseInt(process.argv.find(arg => arg.startsWith('--from='))?.split('=')[1] || '1');

    console.log(chalk.cyan(`Processing in ${chunks.length} chunks starting from chunk ${FROM_CHUNK}...\n`));

    for (let i = FROM_CHUNK - 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        const text = chunk.map(m => `[${m.timestamp}] ${m.author}: ${m.content}`).join('\n');

        console.log(chalk.yellow(`[Chunk ${i + 1}/${chunks.length}] Analysing...`));

        // Retry loop to handle rate limits and provider switching
        let reportContent = null;
        let attempts = 0;
        let finalModel = currentAi.model;

        while (attempts < 3) {
            attempts++;
            // If it's the 3rd attempt, fallback to a smaller model (8b) because the 70B is likely capped
            const modelToUse = attempts === 3 ? 'llama-3.1-8b-instant' : null;
            const result = await callProvider(currentAi, text, chunk.length, GPT_SYSTEM_PROMPT, modelToUse);

            if (result.success && result.content) {
                reportContent = result.content;
                finalModel = result.modelUsed;
                break;
            } else if (result.status === 429 || result.status === 413 || result.status >= 500) {
                console.log(chalk.yellow(`  ⚠️ API Error or network issue (${result.status}) on ${currentAi.label}.`));

                // Wait 62 seconds for rate limits, otherwise 10s for other errors
                const waitMs = result.status === 429 ? 62000 : 10000 * attempts;
                console.log(chalk.gray(`  Waiting ${waitMs / 1000}s before retrying...`));
                await new Promise(r => setTimeout(r, waitMs));
            } else {
                // Not a rate limit, some other error, abort retries
                break;
            }
        }

        if (reportContent) {
            const chunkTime = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateRange = chunk.length > 0
                ? `${new Date(chunk[0].timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} → ${new Date(chunk[chunk.length-1].timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'unknown range';
            const outputBusiness = `\n\n---\n## Batch ${i + 1}/${chunks.length} · Saved at ${chunkTime}\n> **Message date range:** ${dateRange}  \n> ${chunk.length} messages · ${currentAi.label} (${finalModel})\n\n${reportContent}`;
            appendFileSync(REPORT_FILE_BUSINESS, outputBusiness);
            
            // Log Citations
            const citationHeader = `\n\n---\n## 📎 Citations Batch ${i + 1}/${chunks.length} · Saved at ${chunkTime}\n> **Message date range:** ${dateRange}  \n> Source messages analysed in this batch\n\n`;
            const citationRows = chunk.map((m, idx) => `**[${idx + 1}]** \`${new Date(m.timestamp).toLocaleString()}\` **${m.author}**: ${m.content}`).join('\n\n');
            appendFileSync(CITATIONS_FILE, citationHeader + citationRows + '\n');

            console.log(chalk.green(`  ✓ Chunk ${i + 1} saved (${dateRange}).`));

            // SIGNAL PASS: Generate ticker-worthy one-liners
            console.log(chalk.blue(`  🚥 Extracting Web Signals (Fact-Check Pass)...`));
            const signalResult = await callProvider(currentAi, text, chunk.length, SIGNAL_PROMPT);
            if (signalResult.success && signalResult.content) {
                try {
                    const parsed = JSON.parse(signalResult.content.replace(/```json/g, '').replace(/```/g, '').trim());
                    await saveWebSignals(parsed.map(s => ({ ...s, time: 'Just now' })));
                } catch (e) {
                    console.log(chalk.gray(`  ⚠️ Signal parse failed. Skipping chunk signals.`));
                }
            }
        }

        // LORE: Only run when --lore flag is passed (saves tokens)
        if (LORE_MODE) {
            console.log(chalk.magenta(`  📖 Running lore pass for chunk ${i + 1}...`));
            await new Promise(r => setTimeout(r, 15000)); // wait to avoid rate limits between calls
            const loreResult = await callProvider(currentAi, text, chunk.length, LORE_PROMPT);
            if (loreResult.success && loreResult.content) {
                const outputLore = `\n\n---\n## Degen Lore Batch ${i + 1}\n_${chunk.length} messages · ${currentAi.label}_\n\n${loreResult.content}`;
                appendFileSync(REPORT_FILE_LORE, outputLore);
                console.log(chalk.green(`  ✓ Chunk ${i + 1} lore saved.`));
            }
        }

        if (i < chunks.length - 1) {
            // Groq free tier is ~12,000 TPM. Each 150-msg chunk ≈ 8-10k tokens.
            // 45s gap keeps us under the limit proactively instead of hitting it and waiting 62s.
            console.log(chalk.gray('  Waiting 45s to stay under Groq TPM limit...'));
            await new Promise(r => setTimeout(r, 45000));
        }
    }

    const saved = LORE_MODE
        ? 'reports_business.md and reports_lore.md'
        : 'reports_business.md (run with --lore to also generate comic lore)';
    console.log(chalk.bold.green(`\n✅ Analysis complete. Check ${saved}`));
}

run();
