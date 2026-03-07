import { readFileSync, appendFileSync, existsSync } from 'fs';
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
const CITATIONS_FILE = path.join(__dirname, 'citations.md');
const GPT_MAX_MESSAGES = 150;
const PROVIDER = (process.env.PROVIDER || 'groq').toLowerCase();
const LORE_MODE = process.argv.includes('--lore'); // Only generate comic lore when asked

const PROVIDERS = {
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY || '',
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        label: 'Groq (free cloud)',
    },
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: process.env.GEMINI_API_KEY || '',
    },
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENAI_API_KEY || '', // Using the sk-or key from root env
        model: 'google/gemini-2.5-flash', // A fast, capable openrouter model
        label: 'OpenRouter (Gemini)',
    }
};

let currentProviderKey = PROVIDER;
let currentAi = PROVIDERS[currentProviderKey] || PROVIDERS.groq;

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

const LORE_PROMPT = `You are a comedy writer studying a Discord server full of gambling degenerates.
Analyze these messages and write raw material for a comic strip.
Highlight tragic losses, chaotic energy, funny interactions, and potential character arcs.
Be brutally honest and funny. These degenerates are chronically online and would laugh at themselves.`;

// We will pass the appropriate prompt per call — default to business
const GPT_SYSTEM_PROMPT = BUSINESS_PROMPT;

async function callProvider(provider, text, count, systemPrompt = GPT_SYSTEM_PROMPT) {
    console.log(chalk.cyan(`  → ${provider.label} (${provider.model})...`));
    try {
        const res = await fetch(`${provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
                model: provider.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analyze these ${count} messages:\n\n${text}` },
                ],
                temperature: 0.3,
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            console.error(chalk.red(`  ✗ API Error (${res.status}):`), errBody);
            return { success: false, status: res.status, error: errBody };
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || null;
        if (content) console.log(chalk.green(`  ✓ Analysis received (${content.length} chars)`));
        return { success: true, content, status: 200 };
    } catch (err) {
        console.error(chalk.red('  ✗ Fetch Error:'), err.message);
        return { success: false, status: 500, error: err.message };
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

    console.log(chalk.cyan(`Processing in ${chunks.length} chunks...\n`));

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const text = chunk.map(m => `[${m.timestamp}] ${m.author}: ${m.content}`).join('\n');

        console.log(chalk.yellow(`[Chunk ${i + 1}/${chunks.length}] Analysing...`));

        // Retry loop to handle rate limits and provider switching
        let reportContent = null;
        let attempts = 0;

        while (attempts < 3) {
            attempts++;
            const result = await callProvider(currentAi, text, chunk.length);

            if (result.success && result.content) {
                reportContent = result.content;
                break;
            } else if (result.status === 429 || result.status === 413) {
                console.log(chalk.yellow(`  ⚠️ Rate limit or size limit hit on ${currentAi.label}.`));

                // Wait 62 seconds to let the Tokens-per-minute rate limit reset
                const waitMs = result.status === 429 ? 62000 : 5000 * attempts;
                console.log(chalk.gray(`  Waiting ${waitMs / 1000}s before retrying...`));
                await new Promise(r => setTimeout(r, waitMs));
            } else {
                // Not a rate limit, some other error, abort retries
                break;
            }
        }

        if (reportContent) {
            const runAt = new Date().toLocaleString();
            const outputBusiness = `\n\n---\n## Intelligence Batch ${i + 1} — ${runAt}\n_${chunk.length} messages · ${currentAi.label}_\n\n${reportContent}`;
            appendFileSync(REPORT_FILE_BUSINESS, outputBusiness);
            
            // Log Citations
            const citationHeader = `\n\n---\n## 📎 Citations Batch ${i + 1} — ${runAt}\n> Source messages for Intelligence Batch ${i + 1}\n\n`;
            const citationRows = chunk.map((m, idx) => `**[${idx + 1}]** \`${m.timestamp}\` **${m.author}**: ${m.content}`).join('\n\n');
            appendFileSync(CITATIONS_FILE, citationHeader + citationRows + '\n');
            
            console.log(chalk.green(`  ✓ Chunk ${i + 1} business report and citations saved.`));
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
            console.log(chalk.gray('  Waiting 15s to respect API rate limits...'));
            await new Promise(r => setTimeout(r, 15000));
        }
    }

    const saved = LORE_MODE
        ? 'reports_business.md and reports_lore.md'
        : 'reports_business.md (run with --lore to also generate comic lore)';
    console.log(chalk.bold.green(`\n✅ Analysis complete. Check ${saved}`));
}

run();
