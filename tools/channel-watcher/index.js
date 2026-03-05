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

// ── GPT Analysis ──────────────────────────────────────────────────────────────
async function analyseMessages(messages) {
    if (!OPENAI_API_KEY) {
        console.log(chalk.yellow('No OPENAI_API_KEY set — skipping analysis, messages saved to log.'));
        return null;
    }

    const text = messages
        .map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.author}: ${m.content.slice(0, 500)}`)
        .join('\n');

    console.log(chalk.cyan(`\nSending ${messages.length} messages to GPT-4o-mini...`));

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

    console.log(chalk.bold.green('\n🎰 TiltCheck Channel Scraper\n'));
    if (FULL_MODE) {
        console.log(chalk.yellow('Mode: FULL — scraping entire channel history'));
    } else if (stopAt) {
        console.log(chalk.white(`Mode: INCREMENTAL — scraping since ${stopAt.toLocaleString()}`));
    } else {
        console.log(chalk.white('Mode: FIRST RUN — scraping all available history'));
    }
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
            return Array.from(items).map(li => {
                const idParts = li.id.split('-'); // chat-messages-CHANNELID-MESSAGEID
                const messageId = idParts[idParts.length - 1];
                // Timestamp in the <time> element
                const timeEl = li.querySelector('time[datetime]');
                const timestamp = timeEl?.getAttribute('datetime') ?? null;
                const content = li.querySelector('[class*="messageContent"]')?.textContent?.trim() ?? '';
                const author = li.querySelector('h3 [class*="username"]')?.textContent?.trim()
                    ?? li.querySelector('[class*="username"]')?.textContent?.trim()
                    ?? '';
                return { messageId, timestamp, content, author };
            }).filter(m => m.content && m.messageId);
        });

        let newCount = 0;
        for (const msg of visible) {
            if (collected.has(msg.messageId)) continue;

            // Check if we've reached our last checkpoint
            if (stopAt && msg.timestamp && new Date(msg.timestamp) <= stopAt) {
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
