/**
 * TiltCheck Channel Watcher
 * ─────────────────────────
 * Passively watches a Discord channel from your logged-in browser session.
 * Collects every message in the background, then runs a scheduled GPT-4o
 * analysis to surface pain points, friction moments, and community insights
 * — no keyword lists needed. AI figures out what matters.
 *
 * Usage:
 *   1. Copy .env.example → .env and fill in WATCH_CHANNEL_URL
 *   2. npm install
 *   3. npm start
 *   4. Log into Discord in the browser that opens (saved for next time)
 */

import { chromium } from 'playwright';
import { appendFileSync, existsSync } from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const CHANNEL_URL = process.env.WATCH_CHANNEL_URL || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANALYSIS_INTERVAL = parseInt(process.env.ANALYSIS_INTERVAL_MINUTES || '120', 10) * 60_000;
const LOG_FILE = process.env.LOG_FILE_PATH || path.join(__dirname, 'messages.jsonl');
const MAX_BUFFER = parseInt(process.env.MAX_BUFFER_SIZE || '300', 10);
const SHOW_BROWSER = process.env.SHOW_BROWSER !== 'false';
const SESSION_FILE = path.join(__dirname, '.session.json');
const REPORT_FILE = path.join(__dirname, 'reports.md');

const GPT_SYSTEM_PROMPT = `You are a community intelligence analyst for TiltCheck, a responsible gambling ecosystem.
You are given a batch of real Discord messages from a gambling community server.
Your job is to read everything and write a clear, structured analyst report identifying:

1. **Pain Points** — What are people frustrated about? Casino issues, withdrawal problems, bad experiences?
2. **Friction Moments** — Where does the community get stuck or confused? What processes feel broken?
3. **Scam & Safety Signals** — Any links, offers, or users that look predatory or dishonest?
4. **Emotional State** — What's the general mood? Are people tilted, excited, burned out?
5. **Community Needs** — What tools, features, or support are people implicitly or explicitly asking for?
6. **Opportunities for TiltCheck** — Specific things TiltCheck could build or say to directly address what you see here.

Be direct and actionable. You're writing this for the founder of TiltCheck to read each morning.
Never quote users verbatim. Summarise patterns, not individuals.
Output clean markdown with headers and bullet points.`;

// ── State ───────────────────────────────────────────────────────────────────
let messageBuffer = [];
let totalSeen = 0;
let reportCount = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────
function logMessage(entry) {
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}

function logReport(report) {
    const header = `\n\n---\n## Report #${reportCount} — ${new Date().toLocaleString()}\n\n`;
    appendFileSync(REPORT_FILE, header + report, 'utf-8');
}

function printReport(report) {
    console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
    console.log(chalk.bold.cyan(`  📊 ANALYSIS REPORT #${reportCount}`));
    console.log(chalk.bold.cyan('═'.repeat(60)));
    // Pretty-print the markdown sections
    report.split('\n').forEach(line => {
        if (line.startsWith('## ') || line.startsWith('# ')) {
            console.log(chalk.bold.yellow('\n' + line));
        } else if (line.startsWith('**') || line.startsWith('### ')) {
            console.log(chalk.bold.white(line));
        } else if (line.startsWith('- ') || line.startsWith('• ')) {
            console.log(chalk.white('  ' + line));
        } else {
            console.log(chalk.gray(line));
        }
    });
    console.log(chalk.bold.cyan('═'.repeat(60) + '\n'));
}

// ── GPT Analysis ─────────────────────────────────────────────────────────────
async function analyseMessages(messages) {
    if (!OPENAI_API_KEY) {
        console.log(chalk.yellow('[Watcher] No OPENAI_API_KEY set — logging messages only, no analysis.'));
        return null;
    }

    const messageText = messages
        .map(m => `[${new Date(m.seenAt).toLocaleTimeString()}] ${m.authorName}: ${m.content.slice(0, 400)}`)
        .join('\n');

    const userPrompt = `Here are ${messages.length} Discord messages from the past analysis period:\n\n${messageText}\n\nWrite your analyst report now.`;

    try {
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
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.4,
                max_tokens: 2000,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(chalk.red('[Watcher] OpenAI error:'), err);
            return null;
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? null;
    } catch (err) {
        console.error(chalk.red('[Watcher] OpenAI request failed:'), err.message);
        return null;
    }
}

// ── Flush ─────────────────────────────────────────────────────────────────────
async function flushBuffer() {
    if (messageBuffer.length === 0) {
        console.log(chalk.gray('\n[Watcher] No new messages to analyse.'));
        return;
    }

    const snapshot = [...messageBuffer];
    messageBuffer = [];
    reportCount++;

    console.log(chalk.cyan(`\n[Watcher] Running analysis on ${snapshot.length} messages...`));

    const report = await analyseMessages(snapshot);

    if (report) {
        printReport(report);
        logReport(report);
        console.log(chalk.green(`[Watcher] Report saved to ${REPORT_FILE}`));
    } else {
        console.log(chalk.yellow('[Watcher] Analysis skipped — messages still logged to file.'));
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function startWatcher() {
    if (!CHANNEL_URL) {
        console.error(chalk.red('❌ WATCH_CHANNEL_URL is not set. Copy .env.example → .env and fill it in.'));
        process.exit(1);
    }

    console.log(chalk.bold.green('\n🎰 TiltCheck Channel Watcher\n'));
    console.log(chalk.white(`📺 Watching: ${CHANNEL_URL}`));
    console.log(chalk.white(`⏱  Analysis every: ${ANALYSIS_INTERVAL / 60_000} minutes`));
    console.log(chalk.white(`🤖 AI: ${OPENAI_API_KEY ? 'GPT-4o-mini enabled' : '⚠️  No OpenAI key — logging only'}`));
    console.log(chalk.white(`📝 Log: ${LOG_FILE}`));
    console.log(chalk.white(`📊 Reports: ${REPORT_FILE}\n`));

    const storageState = existsSync(SESSION_FILE) ? SESSION_FILE : undefined;

    const browser = await chromium.launch({
        headless: !SHOW_BROWSER,
        args: ['--start-maximized'],
    });

    const context = await browser.newContext({
        storageState,
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    await page.goto('https://discord.com/login', { waitUntil: 'domcontentloaded' });

    // Check if already logged in
    const loggedIn = await page.locator('[data-list-id="guildsnav"]').isVisible({ timeout: 5000 }).catch(() => false);

    if (!loggedIn) {
        console.log(chalk.yellow('⚠️  Please log into Discord in the browser window.'));
        console.log(chalk.yellow('   Waiting up to 3 minutes...'));
        await page.waitForSelector('[data-list-id="guildsnav"]', { timeout: 180_000 }).catch(() => {
            console.error(chalk.red('❌ Login timeout expired. Restart and log in within 3 minutes.'));
            process.exit(1);
        });
        await context.storageState({ path: SESSION_FILE });
        console.log(chalk.green('✅ Session saved — you won\'t need to log in again.\n'));
    } else {
        console.log(chalk.green('✅ Already logged in.\n'));
    }

    await page.goto(CHANNEL_URL, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('ol[data-list-id="chat-messages"]', { timeout: 30_000 }).catch(() => {
        console.error(chalk.red('❌ Could not find message list. Check your WATCH_CHANNEL_URL.'));
        process.exit(1);
    });

    console.log(chalk.bold.green('✅ Watching channel. Messages are being collected silently.\n'));
    console.log(chalk.gray(`   First report in ${ANALYSIS_INTERVAL / 60_000} minutes. Press Ctrl+C to force one now.\n`));

    // Expose the callback so the injected observer can call into Node
    await page.exposeFunction('onNewMessage', (authorName, content, timestamp) => {
        if (!content || content.trim().length === 0) return;

        totalSeen++;
        const entry = { authorName, content: content.trim(), timestamp, seenAt: new Date().toISOString() };

        logMessage(entry);
        messageBuffer.push(entry);

        if (messageBuffer.length >= MAX_BUFFER) {
            flushBuffer(); // async — fire and forget
        }

        // Simple live counter every 25 messages
        if (totalSeen % 25 === 0) {
            process.stdout.write(chalk.gray(`\r[Watcher] ${totalSeen} messages collected | buffer: ${messageBuffer.length}/${MAX_BUFFER}   `));
        }
    });

    // Inject MutationObserver to detect new Discord messages
    await page.evaluate(() => {
        const list = document.querySelector('ol[data-list-id="chat-messages"]');
        if (!list) return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof Element)) continue;
                    if (!node.id?.startsWith('chat-messages-')) continue;

                    const content = node.querySelector('[class*="messageContent"]')?.textContent?.trim();
                    const author = node.querySelector('h3 [class*="username"]')?.textContent?.trim()
                        ?? node.querySelector('[class*="username"]')?.textContent?.trim()
                        ?? 'Unknown';

                    if (content) {
                        window.onNewMessage(author, content, new Date().toISOString());
                    }
                }
            }
        });

        observer.observe(list, { childList: true, subtree: false });
    });

    // Scheduled analysis
    setInterval(flushBuffer, ANALYSIS_INTERVAL);

    // Ctrl+C → flush immediately then exit
    process.on('SIGINT', async () => {
        console.log(chalk.bold('\n\n[Watcher] Shutting down — running final analysis...'));
        await flushBuffer();
        await context.storageState({ path: SESSION_FILE });
        console.log(chalk.green('[Watcher] Session saved. Goodbye.'));
        await browser.close();
        process.exit(0);
    });

    await new Promise(() => { }); // Keep alive
}

startWatcher().catch(err => {
    console.error(chalk.red('[Watcher] Fatal error:'), err);
    process.exit(1);
});
