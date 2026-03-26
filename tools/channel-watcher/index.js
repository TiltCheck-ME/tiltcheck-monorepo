/**
 * TiltCheck Channel Scraper
 * ─────────────────────────
 * Run on-demand. Scrolls the Discord channel from your last checkpoint,
 * collects all messages since then, runs GPT-4o analysis, saves a new
 * checkpoint, and exits. Next run picks up where this one stopped.
 *
 * Usage:
 *   npm start                — scrape since last run, analyse, exit
 *   npm run full             — ignore checkpoint, scrape entire history
 */

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, appendFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FULL_MODE = process.argv.includes('--full');
// --live flag overrides LIVE_WATCH in .env; npm run live sets it, npm run history keeps it off
const LIVE_WATCH_FLAG = process.argv.includes('--live');
const durationArg = process.argv.find(arg => arg.startsWith('--duration='));
const WATCH_DURATION_MINS = durationArg ? parseInt(durationArg.split('=')[1], 10) : null;
const SKIP_HISTORY = WATCH_DURATION_MINS !== null || process.argv.includes('--skip-history');

// Also load from monorepo root .env as fallback (so you don't need a separate .env here)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: false });


// ── Config ───────────────────────────────────────────────────────────────────
const CHANNEL_URL = process.env.WATCH_CHANNEL_URL || '';
const WATCH_KEYWORDS = process.env.WATCH_KEYWORDS ? process.env.WATCH_KEYWORDS.split(',').map(k => k.trim().toLowerCase()) : [];
const LOG_FILE = path.join(__dirname, 'messages.jsonl');
const REPORT_FILE = path.join(__dirname, 'reports.md');
const CITATIONS_FILE = path.join(__dirname, 'citations.md');
const SESSION_FILE = path.join(__dirname, '.session.json');
const CHECKPOINT = path.join(__dirname, '.checkpoint.json');

// Scrape limits
const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES || '400', 10);
const LOOKBACK_HOURS = parseInt(process.env.LOOKBACK_HOURS || '48', 10);
const GPT_MAX_MESSAGES = parseInt(process.env.GPT_MAX_MESSAGES || '300', 10);
const LIVE_WATCH = LIVE_WATCH_FLAG || process.env.LIVE_WATCH === 'true';
const LIVE_REPORT_INTERVAL_MINS = parseInt(process.env.LIVE_REPORT_INTERVAL_MINS || '15', 10);
const LIVE_REPORT_BATCH_SIZE = parseInt(process.env.LIVE_REPORT_BATCH_SIZE || '20', 10);
const SAMPLE_MODE = process.env.SAMPLE_MODE === 'true';
const SAMPLE_SKIP_PASSES = parseInt(process.env.SAMPLE_SKIP_PASSES || '40', 10);
const JUMP_TO_DATE = process.env.JUMP_TO_DATE || null; // e.g. '2024-03-01'
const DEV_UPDATES_WEBHOOK_URL = process.env.DEV_UPDATES_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || '';
const TRUST_ENGINE_INGEST_URL = process.env.TRUST_ENGINE_INGEST_URL || '';
const TRUST_ENGINE_INGEST_KEY = process.env.COMMUNITY_INTEL_INGEST_KEY || '';
const DISCORD_MESSAGE_LIMIT = 1800;

// ── AI Provider config ───────────────────────────────────────────────────────
// PROVIDER options: ollama | groq | gemini | openai
const PROVIDER = (process.env.PROVIDER || 'ollama').toLowerCase();

const PROVIDERS = {
    ollama: {
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama',   // Ollama ignores the key but the header must exist
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
        label: 'Google Gemini (free tier)',
    },
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        label: 'OpenAI',
    },
};

const ai = PROVIDERS[PROVIDER] ?? PROVIDERS.ollama;

const GPT_SYSTEM_PROMPT = `You are a community intelligence analyst for TiltCheck, a responsible gambling platform.
You are given a batch of Discord messages scraped from a gambling community server.

Write a clear, structured analyst report identifying:

## Pain Points
What are people frustrated about? Casino issues, withdrawal problems, bad experiences?

## Friction Moments
Where does the community get stuck or confused? What processes feel broken?

## Scam & Safety Signals
Any links, offers, or behaviour that looks predatory, dishonest, or unsafe?

## Emotional State
What's the overall mood? Tilted, excited, burned out, hopeful?

## Community Needs
What tools, features, or support are people asking for (directly or implicitly)?

## TiltCheck Opportunities
Specific things TiltCheck could build, say, or respond to based on this data.

Be direct and actionable. Write for the founder to read over morning coffee.
Never quote users verbatim. Summarise patterns and themes, not individuals.`;

// ── Checkpoint helpers ────────────────────────────────────────────────────────
function loadCheckpoint() {
    if (FULL_MODE || !existsSync(CHECKPOINT)) return null;
    try {
        return JSON.parse(readFileSync(CHECKPOINT, 'utf-8'));
    } catch {
        return null;
    }
}

function saveCheckpoint(newestTimestamp, newestId) {
    writeFileSync(CHECKPOINT, JSON.stringify({
        lastTimestamp: newestTimestamp,
        lastMessageId: newestId,
        savedAt: new Date().toISOString(),
        channelUrl: CHANNEL_URL,
    }, null, 2));
}

// ── Smart sampling — keeps oldest, newest, and even middle spread ───────────
function sampleMessages(messages, limit) {
    if (messages.length <= limit) return messages;

    const headCount = Math.floor(limit * 0.20); // oldest 20%
    const tailCount = Math.floor(limit * 0.20); // newest 20%
    const midCount = limit - headCount - tailCount;

    const head = messages.slice(0, headCount);
    const tail = messages.slice(-tailCount);
    const middle = messages.slice(headCount, messages.length - tailCount);

    // Evenly sample from the middle section
    const step = Math.max(1, Math.floor(middle.length / midCount));
    const midSample = middle.filter((_, i) => i % step === 0).slice(0, midCount);

    return [...head, ...midSample, ...tail];
}

// Sample messages to stay within GPT token limits.
// Preserves the oldest 20%, newest 20%, and evenly samples the middle 60%.
function sampleForGPT(messages) {
    if (messages.length <= GPT_MAX_MESSAGES) return messages;
    const head = Math.floor(GPT_MAX_MESSAGES * 0.20);
    const tail = Math.floor(GPT_MAX_MESSAGES * 0.20);
    const mid = GPT_MAX_MESSAGES - head - tail;
    const middle = messages.slice(head, messages.length - tail);
    const step = Math.max(1, Math.floor(middle.length / mid));
    const midSample = middle.filter((_, i) => i % step === 0).slice(0, mid);
    return [...messages.slice(0, head), ...midSample, ...messages.slice(-tail)];
}

// Run one provider's analysis
async function callProvider(provider, text, toSendCount) {
    if (!provider.apiKey && provider.label !== 'Ollama (local)') return null;

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
                    { role: 'system', content: GPT_SYSTEM_PROMPT },
                    { role: 'user', content: `Here are the messages:\n\n${text}` },
                ],
                temperature: 0.3,
                max_tokens: 2500,
            }),
        });

        if (!res.ok) {
            console.error(chalk.red(`  ✗ ${provider.label} error:`), res.status, await res.text().catch(() => ''));
            return null;
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? null;
        if (content) console.log(chalk.green(`  ✓ ${provider.label} done`));
        return content;
    } catch (err) {
        console.error(chalk.red(`  ✗ ${provider.label} failed:`), err.message);
        return null;
    }
}

async function analyseMessages(messages) {
    // Split messages into chunks of GPT_MAX_MESSAGES
    const chunks = [];
    for (let i = 0; i < messages.length; i += GPT_MAX_MESSAGES) {
        chunks.push(messages.slice(i, i + GPT_MAX_MESSAGES));
    }

    console.log(chalk.cyan(`\nProcessing ${messages.length} messages in ${chunks.length} analytical chunks...\n`));

    const finalReports = [];

    for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const text = chunk
            .map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.author}: ${m.content.slice(0, 400)}`)
            .join('\n');

        console.log(chalk.yellow(`\n[Chunk ${idx + 1}/${chunks.length}] Analysing ${chunk.length} messages...`));

        let chunkReport = '';
        if (PROVIDER === 'all') {
            const eligible = Object.values(PROVIDERS).filter(p =>
                p.apiKey && (p.apiKey !== 'ollama' || p.label === 'Ollama (local)')
            );
            const results = await Promise.all(eligible.map(p => callProvider(p, text, chunk.length)));
            const sections = eligible
                .map((p, i) => results[i] ? `\n---\n#### 🤖 ${p.label}\n${results[i]}` : null)
                .filter(Boolean);
            chunkReport = sections.join('\n');
        } else {
            chunkReport = await callProvider(ai, text, chunk.length);
        }

        if (chunkReport) {
            finalReports.push(`### Batch ${idx + 1} Analysis\n${chunkReport}`);
        }
    }

    if (finalReports.length === 0) return null;
    return `# Community Intelligence Report — ${new Date().toLocaleString()}\n_Total: ${messages.length} messages in ${chunks.length} batches_\n\n${finalReports.join('\n\n---\n\n')}`;
}

function chunkText(text, maxLen = DISCORD_MESSAGE_LIMIT) {
    if (!text) return [];
    const normalized = String(text).replace(/\r\n/g, '\n');
    const chunks = [];
    let remaining = normalized;

    while (remaining.length > maxLen) {
        let splitAt = remaining.lastIndexOf('\n', maxLen);
        if (splitAt < Math.floor(maxLen * 0.6)) splitAt = maxLen;
        chunks.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
}

async function postDiscordUpdate(content) {
    if (!DEV_UPDATES_WEBHOOK_URL) return false;

    try {
        const res = await fetch(DEV_UPDATES_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                allowed_mentions: { parse: [] },
            }),
        });
        if (!res.ok) {
            const bodyText = await res.text().catch(() => '');
            console.error(chalk.red(`Discord webhook failed: ${res.status} ${bodyText}`));
            return false;
        }
        return true;
    } catch (err) {
        console.error(chalk.red('Discord webhook request failed:'), err.message);
        return false;
    }
}

async function sendReportToDiscord({ report, messageCount, fromStr, runAtISO }) {
    if (!DEV_UPDATES_WEBHOOK_URL) return;

    const intro = [
        `📡 TiltCheck channel watcher update`,
        `Generated: ${runAtISO}`,
        `Messages analysed: ${messageCount} (${fromStr})`,
    ].join('\n');

    const reportChunks = chunkText(report);
    const totalParts = reportChunks.length + 1;
    const payloads = [
        `${intro}\nPart 1/${totalParts}`,
        ...reportChunks.map((chunk, idx) => `Part ${idx + 2}/${totalParts}\n\`\`\`\n${chunk}\n\`\`\``),
    ];

    for (const payload of payloads) {
        const sent = await postDiscordUpdate(payload);
        if (!sent) break;
    }
}

function deriveTrustSignals(reportText) {
    const text = String(reportText || '').toLowerCase();
    const count = (re) => (text.match(re) || []).length;
    return {
        scamSignals: count(/\b(scam|scammed|fraud|rigged|fake)\b/g),
        distressSignals: count(/\b(tilt|tilted|addict|addiction|chasing|broke|rinsed|lost)\b/g),
        frictionSignals: count(/\b(confus|stuck|unclear|bug|issue|broken|support)\b/g),
        opportunitySignals: count(/\b(opportunit|build|feature|needs?|request|help)\b/g),
    };
}

async function sendReportToTrustEngine({ report, messageCount, fromTimestamp, runAtISO, messages }) {
    if (!TRUST_ENGINE_INGEST_URL) return;

    const signals = deriveTrustSignals(report);
    const payload = {
        source: 'channel-watcher',
        runAtISO,
        fromTimestamp: fromTimestamp || null,
        messageCount,
        report,
        signals,
        samples: (Array.isArray(messages) ? messages : []).slice(-25).map((m) => ({
            timestamp: m?.timestamp || null,
            author: String(m?.author || '').slice(0, 80),
            content: String(m?.content || '').slice(0, 280),
        })),
    };

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (TRUST_ENGINE_INGEST_KEY) {
            headers['x-community-intel-key'] = TRUST_ENGINE_INGEST_KEY;
        }
        const res = await fetch(TRUST_ENGINE_INGEST_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const bodyText = await res.text().catch(() => '');
            console.error(chalk.red(`Trust engine ingest failed: ${res.status} ${bodyText}`));
            return;
        }
        console.log(chalk.gray('   Trust engine ingest accepted.'));
    } catch (err) {
        console.error(chalk.red('Trust engine ingest request failed:'), err.message);
    }
}

// ── Report output ─────────────────────────────────────────────────────────────
async function saveAndPrintReport(report, messageCount, fromTimestamp, messages = []) {
    const runAt = new Date();
    const runAtStr = runAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' });
    const runAtISO = runAt.toISOString();
    const fromStr = fromTimestamp
        ? `since ${new Date(fromTimestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}`
        : 'full history';

    // ── Save the intelligence report ─────────────────────────────────────────
    const header = `\n\n---\n## 📊 Report — ${runAtStr}\n> **Generated:** ${runAtISO}  \n> **Messages analysed:** ${messageCount} (${fromStr})\n\n`;
    appendFileSync(REPORT_FILE, header + report);

    // ── Save citations (source messages) ─────────────────────────────────────
    if (messages.length > 0) {
        const citationHeader = `\n\n---\n## 📎 Citations — ${runAtStr}\n> Source messages for the report generated at ${runAtISO}  \n> These are the raw messages the AI analysed.\n\n`;
        const citationRows = messages.map((m, idx) => {
            const ts = m.timestamp ? new Date(m.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : 'unknown';
            const tag = m.hasKeyword ? '🔥' : '📢';
            return `**[${idx + 1}]** ${tag} \`${ts}\` **${m.author || 'unknown'}**: ${m.content}`;
        }).join('\n\n');
        appendFileSync(CITATIONS_FILE, citationHeader + citationRows + '\n');
        console.log(chalk.gray(`   Citations saved to citations.md`));
    }

    await sendReportToDiscord({
        report,
        messageCount,
        fromStr,
        runAtISO,
    });
    await sendReportToTrustEngine({
        report,
        messageCount,
        fromTimestamp,
        runAtISO,
        messages,
    });

    console.log('\n' + chalk.bold.cyan('═'.repeat(64)));
    console.log(chalk.bold.cyan('  📊 TILTCHECK COMMUNITY INTELLIGENCE REPORT'));
    console.log(chalk.bold.cyan(`  ${runAtStr}`));
    console.log(chalk.bold.cyan('═'.repeat(64)));
    report.split('\n').forEach(line => {
        if (/^#{1,3} /.test(line)) console.log(chalk.bold.yellow('\n' + line));
        else if (line.startsWith('- ') || line.startsWith('• ')) console.log(chalk.white('  ' + line));
        else if (line.trim()) console.log(chalk.gray(line));
    });
    console.log(chalk.bold.cyan('\n' + '═'.repeat(64)));
    console.log(chalk.green(`\n✅ Report saved to ${REPORT_FILE}`));
}

// ── Main scraper ──────────────────────────────────────────────────────────────
async function run() {
    if (!CHANNEL_URL) {
        console.error(chalk.red('❌ Set WATCH_CHANNEL_URL in your .env file.'));
        process.exit(1);
    }

    const checkpoint = loadCheckpoint();
    const stopAt = checkpoint?.lastTimestamp ? new Date(checkpoint.lastTimestamp) : null;

    // Effective cutoff: the more recent of checkpoint OR LOOKBACK_HOURS ago
    const lookbackCutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const effectiveCutoff = FULL_MODE ? null
        : (stopAt && stopAt > lookbackCutoff ? stopAt : lookbackCutoff);

    console.log(chalk.bold.green('\n🎰 TiltCheck Channel Scraper\n'));
    if (FULL_MODE) {
        console.log(chalk.yellow('Mode: FULL — scraping entire visible history'));
    } else {
        console.log(chalk.white(`Mode: since ${effectiveCutoff.toLocaleString()}`));
    }
    console.log(chalk.white(`Limits: max ${MAX_MESSAGES} messages | ${LOOKBACK_HOURS}h lookback | GPT cap ${GPT_MAX_MESSAGES}`))
    console.log(chalk.white(`Channel: ${CHANNEL_URL}\n`));

    console.log(chalk.cyan('🚀 Available Commands:'));
    console.log(chalk.white('   npm run history       — Scrape history since last run (deep dive)'));
    console.log(chalk.white('   npm run live          — Watch channel in real-time'));
    console.log(chalk.white('   npm run 10m           — Watch for 10 min then analyze and exit'));
    console.log(chalk.white('   npm run analyze       — Run intelligence report on collected logs'));
    console.log(chalk.white('   npm run analyze:lore  — Run business + comedy lore reports\n'));

    const storageState = existsSync(SESSION_FILE) ? SESSION_FILE : undefined;

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
    });

    const context = await browser.newContext({
        storageState,
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Navigate — check login
    await page.goto('https://discord.com/login', { waitUntil: 'domcontentloaded' });
    const loggedIn = await page.locator('[data-list-id="guildsnav"]').isVisible({ timeout: 5000 }).catch(() => false);

    if (!loggedIn) {
        console.log(chalk.yellow('⚠️  Log into Discord in the browser. Waiting 3 minutes...'));
        await page.waitForSelector('[data-list-id="guildsnav"]', { timeout: 180_000 }).catch(() => {
            console.error(chalk.red('❌ Login timeout. Restart and log in quicker.'));
            process.exit(1);
        });
        await context.storageState({ path: SESSION_FILE });
        console.log(chalk.green('✅ Session saved.\n'));
    } else {
        console.log(chalk.green('✅ Already logged in.\n'));
    }

    await page.goto(CHANNEL_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('ol[data-list-id="chat-messages"]', { timeout: 30_000 }).catch(() => {
        console.error(chalk.red('❌ Message list not found. Check WATCH_CHANNEL_URL.'));
        process.exit(1);
    });

    // --- Time Jump Feature ---
    if (JUMP_TO_DATE && FULL_MODE) {
        console.log(chalk.magenta(`\n🚀 Teleporting to ${JUMP_TO_DATE}...`));
        try {
            // Click Search
            await page.keyboard.press('Control+F');
            await page.waitForTimeout(500);
            await page.keyboard.type(`during: ${JUMP_TO_DATE}`);
            await page.keyboard.press('Enter');

            // Wait for results
            await page.waitForSelector('[class*="searchResultGroup"]', { timeout: 10000 });
            console.log(chalk.gray('   Searching...'));

            // Click the newest result in that range
            const jumpButton = page.locator('[class*="searchResultGroup"] [class*="jumpButton"]').first();
            if (await jumpButton.isVisible()) {
                await jumpButton.click();
                console.log(chalk.green('   Teleport successful. Initializing buffer...'));
                await page.waitForTimeout(3000);
            } else {
                console.log(chalk.yellow('   No messages found for that date. Starting normally.'));
            }
        } catch (err) {
            console.log(chalk.red(`   Teleport failed: ${err.message}. Starting normally.`));
        }
    }

    // Wait for initial messages to render
    await page.waitForTimeout(2000);

    console.log(chalk.cyan('Scrolling through channel history...\n'));

    const collected = new Map(); // messageId → entry
    let hitCheckpoint = false;
    let scrollPasses = 0;
    let noNewCount = 0;
    let lastOldestId = null;

    if (SKIP_HISTORY) {
        console.log(chalk.cyan('Skipping history catch-up. Jumping straight to live...'));
        hitCheckpoint = true;
    }

    while (!hitCheckpoint) {
        scrollPasses++;

        // Scrape currently visible messages
        const { filtered, oldestIdSeen } = await page.evaluate((keywords) => {
            const items = document.querySelectorAll('ol[data-list-id="chat-messages"] > li[id^="chat-messages-"]');

            // Track the oldest item in the DOM to see if we're actually moving
            const oldestIdSeen = items.length > 0 ? items[0].id : null;

            // Regex to detect emoji-only content (unicode emoji + discord :name: syntax + whitespace)
            const emojiOnlyRe = /^[\s\u00A9\u00AE\u200d\u2000-\u3300\uD800-\uDFFF\uFE0F\u20E3:a-z0-9_]+$/i;
            const customEmojiRe = /^(\s*<a?:\w+:\d+>\s*|\s*:\w+:\s*)*$/; // Discord custom emoji markup

            const filtered = Array.from(items).flatMap(li => {
                const idParts = li.id.split('-');
                const messageId = idParts[idParts.length - 1];

                // Filter: skip bot messages (have a bot tag badge)
                const isBot = !!li.querySelector('[class*="botTag"], [class*="systemTag"]');
                if (isBot) return [];

                // Filter: skip system messages (join/leave/pin notifications)
                const isSystem = !!li.querySelector('[class*="systemMessage"]');
                if (isSystem) return [];

                const timeEl = li.querySelector('time[datetime]');
                const timestamp = timeEl?.getAttribute('datetime') ?? null;

                const contentEl = li.querySelector('[class*="messageContent"]');
                const rawContent = contentEl?.textContent?.trim() ?? '';

                // Filter: skip if content is empty (image/sticker/GIF only)
                if (!rawContent) return [];

                // Filter: skip emoji-only messages
                const stripped = rawContent
                    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{200B}-\u{200D}\uFFFE\uFFFF]/gu, '')
                    .replace(/:[a-z0-9_]+:/gi, '')   // :custom_emoji:
                    .replace(/\s+/g, '')
                    .trim();
                if (stripped.length < 3) return [];

                // Filter: numbers only
                if (/^\d[\d,.\s]*$/.test(rawContent.trim())) return [];

                // Filter: thank-you noise
                const fillerRe = /^(ty+|tyty|thx+|thank(s| you| u)|yw|np|no ?prob(lem)?|good luck|gl|hf|gz|grats?|congrats?|gg|lol+|lmao|lmfao|ok+|okay|yep|yup|nope|sure|cool|nice+|👍|🙏|❤️|💪|🔥|🎉|f+|rip)\W*$/i;
                if (fillerRe.test(rawContent.trim())) return [];

                // Filter: skip embed-only messages
                const hasEmbed = !!li.querySelector('[class*="embedWrapper"], [class*="embed"]');
                const isUrlOnly = /^https?:\/\/\S+$/.test(rawContent);
                if (hasEmbed && isUrlOnly) return [];

                // Hybrid Filter: Match keywords OR collect long/substantive stories
                const isSubstantive = rawContent.length > 120; // Long posts are usually valuable
                const hasKeyword = keywords && keywords.length > 0 && keywords.some(k => rawContent.toLowerCase().includes(k));

                if (!hasKeyword && !isSubstantive) return [];

                const author = li.querySelector('h3 [class*="username"]')?.textContent?.trim()
                    ?? li.querySelector('[class*="username"]')?.textContent?.trim()
                    ?? '';

                return [{ messageId, timestamp, content: rawContent, author }];
            });

            return { filtered, oldestIdSeen };
        }, WATCH_KEYWORDS);

        // Track the current "time progress"
        const oldestTimestampSeen = filtered.length > 0 ? new Date(Math.min(...filtered.map(m => new Date(m.timestamp).getTime()))) : null;
        const progressStr = oldestTimestampSeen ? oldestTimestampSeen.toLocaleString() : 'Recent';

        let newMatchCount = 0;
        for (const msg of filtered) {
            if (collected.has(msg.messageId)) continue;

            // Stop at message cap
            if (collected.size >= MAX_MESSAGES) {
                console.log(chalk.yellow(`\n  Reached MAX_MESSAGES limit (${MAX_MESSAGES}). Stopping.`));
                hitCheckpoint = true;
                break;
            }

            // Stop if older than our cutoff
            if (effectiveCutoff && msg.timestamp && new Date(msg.timestamp) <= effectiveCutoff) {
                hitCheckpoint = true;
                break;
            }

            collected.set(msg.messageId, msg);
            newMatchCount++;

            // LIVE LOGGING: Save to disk IMMEDIATELY so you never lose progress
            appendFileSync(LOG_FILE, JSON.stringify(msg) + '\n');
        }

        process.stdout.write(chalk.gray(`\r  Pass ${scrollPasses} — Back to ${progressStr} — Found ${collected.size} matches...    `));

        if (hitCheckpoint) break;

        // Check if the scroll actually moved by looking at the oldest ID in the DOM
        if (oldestIdSeen === lastOldestId) {
            noNewCount++;
            if (noNewCount >= 15) { // Increased patience to 15
                console.log(chalk.gray(`\n  Chat window stopped moving after 15 retries at ${progressStr}. Reached top or got stuck.`));
                break;
            }

            // If stuck, try a "kick" — scroll down a bit then back up hard
            if (noNewCount === 5) {
                await page.evaluate(() => {
                    const list = document.querySelector('ol[data-list-id="chat-messages"]');
                    if (list) list.scrollTop = 500;
                });
                await page.waitForTimeout(500);
            }

            await page.waitForTimeout(1500 * noNewCount);
        } else {
            noNewCount = 0;
            lastOldestId = oldestIdSeen;
        }

        // --- Aggressive Human-like Scroll ---
        await page.evaluate(() => {
            const list = document.querySelector('ol[data-list-id="chat-messages"]');
            if (list) {
                // Try three ways to trigger a load
                list.scrollTop = 0;
            }
        });

        // SAMPLE MODE: Every X passes, jump back hard
        if (SAMPLE_MODE && scrollPasses % 15 === 0) {
            console.log(chalk.magenta(`\n  [SAMPLE MODE] Jumping back in time...`));
            for (let i = 0; i < SAMPLE_SKIP_PASSES; i++) {
                await page.keyboard.press('PageUp');
                if (i % 5 === 0) await page.waitForTimeout(100);
            }
        } else {
            await page.keyboard.press('PageUp');
            await page.waitForTimeout(100);
            await page.keyboard.press('Home');
        }

        // Wait with jitter
        const waitTime = 2000 + Math.random() * 1000;
        await page.waitForTimeout(waitTime);
    }

    const messages = Array.from(collected.values())
        .filter(m => m.timestamp)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    await context.storageState({ path: SESSION_FILE });

    if (messages.length > 0) {
        // Save checkpoint at the newest message timestamp
        const newest = messages[messages.length - 1];
        saveCheckpoint(newest.timestamp, newest.messageId);

        console.log(chalk.green(`\n\n✅ Collected ${messages.length} messages.`));
        console.log(chalk.gray(`   Checkpoint saved at ${new Date(newest.timestamp).toLocaleString()}\n`));

        // Initial Analysis from history
        const report = await analyseMessages(messages);
        if (report) {
            await saveAndPrintReport(report, messages.length, stopAt?.toISOString(), messages);
        }
    } else {
        console.log(chalk.gray('\n\nNo history messages matching keywords found.'));
    }

    if (!LIVE_WATCH) {
        await browser.close();
        process.exit(0);
    }

    // --- Transition to LIVE WATCH MODE ---
    console.log(chalk.bold.magenta('\n📡 Transitioning to LIVE WATCH MODE...'));
    console.log(chalk.gray(`   Waiting for new messages in ${CHANNEL_URL}\n`));

    // Scroll to the bottom to see new ones
    await page.evaluate(() => {
        const list = document.querySelector('ol[data-list-id="chat-messages"]');
        if (list) list.scrollTop = list.scrollHeight;
    });

    let liveBuffer = [];
    let lastAnalysisTime = Date.now();
    let liveStartTime = Date.now();

    while (true) {
        // Scrape new messages at the bottom
        const { found } = await page.evaluate((keywords) => {
            const items = document.querySelectorAll('ol[data-list-id="chat-messages"] > li[id^="chat-messages-"]');
            const recentlyFound = [];

            // Get the last 10 items in the DOM and check them
            const lastFew = Array.from(items).slice(-10);

            for (const li of lastFew) {
                const idParts = li.id.split('-');
                const messageId = idParts[idParts.length - 1];

                const isBot = !!li.querySelector('[class*="botTag"], [class*="systemTag"]');
                const isSystem = !!li.querySelector('[class*="systemMessage"]');
                if (isBot || isSystem) continue;

                const timeEl = li.querySelector('time[datetime]');
                const timestamp = timeEl?.getAttribute('datetime') ?? null;
                const contentEl = li.querySelector('[class*="messageContent"]');
                const rawContent = contentEl?.textContent?.trim() ?? '';
                if (!rawContent) continue;

                // Substantive or keyword
                const isSubstantive = rawContent.length > 120;
                const hasKeyword = keywords && keywords.length > 0 && keywords.some(k => rawContent.toLowerCase().includes(k));

                if (hasKeyword || isSubstantive) {
                    const author = li.querySelector('h3 [class*="username"]')?.textContent?.trim()
                        ?? li.querySelector('[class*="username"]')?.textContent?.trim()
                        ?? '';
                    recentlyFound.push({ messageId, timestamp, content: rawContent, author, hasKeyword });
                }
            }
            return { found: recentlyFound };
        }, WATCH_KEYWORDS);

        for (const msg of found) {
            if (collected.has(msg.messageId)) continue;

            collected.set(msg.messageId, msg);
            liveBuffer.push(msg);

            // Log to terminal instantly
            const marker = msg.hasKeyword ? chalk.bold.red('🔥 TRIGGER:') : chalk.bold.blue('📢 STORY:');
            console.log(`\n${marker} ${chalk.bold(msg.author)} at ${new Date(msg.timestamp).toLocaleTimeString()}`);
            console.log(chalk.white(`  "${msg.content}"`));

            // Audible beep for high-priority keywords
            if (msg.hasKeyword) process.stdout.write('\x07');

            // Append to log immediately so nothing is lost
            appendFileSync(LOG_FILE, JSON.stringify(msg) + '\n');
            saveCheckpoint(msg.timestamp, msg.messageId);
        }

        const elapsedTotal = (Date.now() - liveStartTime) / 1000 / 60;
        const elapsedSinceReport = (Date.now() - lastAnalysisTime) / 1000 / 60;
        
        const shouldRunAnalysis = liveBuffer.length >= LIVE_REPORT_BATCH_SIZE || (liveBuffer.length > 0 && elapsedSinceReport >= LIVE_REPORT_INTERVAL_MINS);

        if (shouldRunAnalysis) {
            console.log(chalk.yellow(`\n\n[LIVE] Running batch analysis on ${liveBuffer.length} new messages...`));
            const liveReport = await analyseMessages(liveBuffer);
            if (liveReport) {
                await saveAndPrintReport(liveReport, liveBuffer.length, liveBuffer[0].timestamp, liveBuffer);
            }
            liveBuffer = [];
            lastAnalysisTime = Date.now();
        }

        if (WATCH_DURATION_MINS && elapsedTotal >= WATCH_DURATION_MINS) {
            console.log(chalk.bold.magenta(`\n⏱️ Reached duration limit (${WATCH_DURATION_MINS}m). Analyzing remaining buffer and exiting...`));
            if (liveBuffer.length > 0) {
                const liveReport = await analyseMessages(liveBuffer);
                if (liveReport) {
                    await saveAndPrintReport(liveReport, liveBuffer.length, liveBuffer[0].timestamp, liveBuffer);
                }
            } else {
                console.log(chalk.gray('  Buffer is empty. No new analysis needed.'));
            }
            break;
        }

        // Maintain bottom position
        await page.evaluate(() => {
            const list = document.querySelector('ol[data-list-id="chat-messages"]');
            if (list && (list.scrollHeight - list.scrollTop - list.clientHeight) < 200) {
                list.scrollTop = list.scrollHeight;
            }
        });

        await page.waitForTimeout(5000); // Check every 5 seconds
    }
    
    await browser.close();
    process.exit(0);
}

run().catch(err => {
    console.error(chalk.red('Fatal:'), err);
    process.exit(1);
});
