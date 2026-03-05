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

// ── Config ───────────────────────────────────────────────────────────────────
const CHANNEL_URL = process.env.WATCH_CHANNEL_URL || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const LOG_FILE = path.join(__dirname, 'messages.jsonl');
const REPORT_FILE = path.join(__dirname, 'reports.md');
const SESSION_FILE = path.join(__dirname, '.session.json');
const CHECKPOINT = path.join(__dirname, '.checkpoint.json');

// Scrape limits — stops scroll when either is hit
const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES || '400', 10);
const LOOKBACK_HOURS = parseInt(process.env.LOOKBACK_HOURS || '48', 10);
// GPT cap — smart-samples if collected > this (keeps costs down)
const GPT_MAX_MESSAGES = parseInt(process.env.GPT_MAX_MESSAGES || '300', 10);


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

async function analyseMessages(messages) {
    if (!OPENAI_API_KEY) {
        console.log(chalk.yellow('No OPENAI_API_KEY set — skipping analysis, messages saved to log.'));
        return null;
    }

    const toSend = sampleForGPT(messages);
    if (toSend.length < messages.length) {
        console.log(chalk.gray(`  Sampled ${toSend.length} representative messages from ${messages.length} total.`));
    }

    const text = toSend
        .map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.author}: ${m.content.slice(0, 400)}`)
        .join('\n');

    console.log(chalk.cyan(`\nSending ${toSend.length} messages to GPT-4o-mini...`));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: GPT_SYSTEM_PROMPT },
                { role: 'user', content: `Here are the messages:\n\n${text}` },
            ],
            temperature: 0.3,
            max_tokens: 2500,
        }),
    });

    if (!res.ok) {
        console.error(chalk.red('OpenAI error:'), await res.text());
        return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
}

// ── Report output ─────────────────────────────────────────────────────────────
function saveAndPrintReport(report, messageCount, fromTimestamp) {
    const header = `\n\n---\n## Report — ${new Date().toLocaleString()}\n_${messageCount} messages analysed${fromTimestamp ? ` since ${new Date(fromTimestamp).toLocaleString()}` : ' (full history)'}_\n\n`;
    appendFileSync(REPORT_FILE, header + report);

    console.log('\n' + chalk.bold.cyan('═'.repeat(64)));
    console.log(chalk.bold.cyan('  📊 TILTCHECK COMMUNITY INTELLIGENCE REPORT'));
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

    // Wait for initial messages to render
    await page.waitForTimeout(2000);

    console.log(chalk.cyan('Scrolling through channel history...\n'));

    const collected = new Map(); // messageId → entry
    let hitCheckpoint = false;
    let scrollPasses = 0;
    let noNewCount = 0;

    while (!hitCheckpoint) {
        scrollPasses++;

        // Scrape currently visible messages
        const visible = await page.evaluate(() => {
            const items = document.querySelectorAll('ol[data-list-id="chat-messages"] > li[id^="chat-messages-"]');

            // Regex to detect emoji-only content (unicode emoji + discord :name: syntax + whitespace)
            const emojiOnlyRe = /^[\s\u00A9\u00AE\u200d\u2000-\u3300\uD800-\uDFFF\uFE0F\u20E3:a-z0-9_]+$/i;
            const customEmojiRe = /^(\s*<a?:\w+:\d+>\s*|\s*:\w+:\s*)*$/; // Discord custom emoji markup

            return Array.from(items).flatMap(li => {
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

                // Filter: skip emoji-only messages (just 🎰🔥 etc, no real words)
                // Strip all emoji-like characters and see if anything substantive remains
                const stripped = rawContent
                    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{200B}-\u{200D}\uFFFE\uFFFF]/gu, '')
                    .replace(/:[a-z0-9_]+:/gi, '')   // :custom_emoji:
                    .replace(/\s+/g, '')
                    .trim();
                if (stripped.length < 3) return []; // less than 3 real chars = noise

                // Filter: skip embed-only messages (content is just a URL with no surrounding text)
                const hasEmbed = !!li.querySelector('[class*="embedWrapper"], [class*="embed"]');
                const isUrlOnly = /^https?:\/\/\S+$/.test(rawContent);
                if (hasEmbed && isUrlOnly) return [];

                const author = li.querySelector('h3 [class*="username"]')?.textContent?.trim()
                    ?? li.querySelector('[class*="username"]')?.textContent?.trim()
                    ?? '';

                return [{ messageId, timestamp, content: rawContent, author }];
            });
        });

        let newCount = 0;
        for (const msg of visible) {
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
            newCount++;
        }

        process.stdout.write(chalk.gray(`\r  Pass ${scrollPasses} — ${collected.size} messages collected so far...   `));

        if (hitCheckpoint) break;

        if (newCount === 0) {
            noNewCount++;
            if (noNewCount >= 3) {
                // Nothing new after 3 scroll attempts — assume we've hit the top
                break;
            }
        } else {
            noNewCount = 0;
        }

        // Scroll the message list upward to load older messages
        await page.evaluate(() => {
            const list = document.querySelector('ol[data-list-id="chat-messages"]');
            if (list) list.scrollTop = 0;
        });

        // Wait for Discord to load more messages
        await page.waitForTimeout(1500);
    }

    await context.storageState({ path: SESSION_FILE });
    await browser.close();

    const messages = Array.from(collected.values())
        .filter(m => m.timestamp)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (messages.length === 0) {
        console.log(chalk.yellow('\n\nNo new messages found since last checkpoint.'));
        process.exit(0);
    }

    // Save checkpoint at the newest message timestamp
    const newest = messages[messages.length - 1];
    saveCheckpoint(newest.timestamp, newest.messageId);

    console.log(chalk.green(`\n\n✅ Collected ${messages.length} messages.`));
    console.log(chalk.gray(`   Checkpoint saved at ${new Date(newest.timestamp).toLocaleString()}\n`));

    // Append to log
    messages.forEach(m => appendFileSync(LOG_FILE, JSON.stringify(m) + '\n'));

    // Analyse
    const report = await analyseMessages(messages);
    if (report) {
        saveAndPrintReport(report, messages.length, stopAt?.toISOString());
    }

    process.exit(0);
}

run().catch(err => {
    console.error(chalk.red('Fatal:'), err);
    process.exit(1);
});
