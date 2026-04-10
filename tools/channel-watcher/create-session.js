// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// Creates a minimal Discord session file — only the auth token + essential
// cookies. Keeps the base64-encoded DISCORD_SESSION_JSON env var small enough
// for Railway (full storageState can be 100-300 KB; this stays under 2 KB).

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '.session.json');

// Cookie names Discord actually needs for auth (everything else is noise).
const ESSENTIAL_COOKIE_NAMES = new Set([
    '__dcfduid', '__sdcfduid', '__cfruid', '__cf_bm',
    'locale', '_ga', '_gid',
]);

async function createSession() {
    console.log('Starting browser to create Discord session...');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    await page.goto('https://discord.com/login', { waitUntil: 'domcontentloaded' });

    console.log('Log in to Discord in the browser window.');
    console.log('Waiting up to 5 minutes for successful login...');

    try {
        await page.waitForSelector('[data-list-id="guildsnav"]', { timeout: 300000 });

        // Extract only the Discord auth token from localStorage — not the full cache.
        const token = await page.evaluate(() => {
            try { return JSON.parse(localStorage.token); } catch { return null; }
        });

        // Grab only essential cookies — skip analytics/tracking bloat.
        const allCookies = await context.cookies();
        const essentialCookies = allCookies.filter(c =>
            ESSENTIAL_COOKIE_NAMES.has(c.name) && c.domain.includes('discord.com')
        );

        // Build a minimal storageState Playwright can consume directly.
        const minimalSession = {
            cookies: essentialCookies,
            origins: token ? [{
                origin: 'https://discord.com',
                localStorage: [{ name: 'token', value: JSON.stringify(token) }],
            }] : [],
        };

        writeFileSync(SESSION_FILE, JSON.stringify(minimalSession, null, 2));

        const sizeKB = (Buffer.byteLength(JSON.stringify(minimalSession)) / 1024).toFixed(1);
        console.log(`Session saved to ${SESSION_FILE} (${sizeKB} KB — minimal format)`);
        console.log('Run `npm run session:encode` to get the Railway env var string.');
    } catch {
        console.error('Login timeout (5 minutes). Run `npm run session:create` again.');
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
}

createSession().catch((err) => {
    console.error('Failed to create session:', err?.message || err);
    process.exit(1);
});
