// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
// Creates a sanitized Discord session file with Discord cookies only.
// Raw Discord user tokens are never persisted to disk by this tool.

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '.session.json');

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

        // Persist only Discord-scoped cookies. Do not persist token-bearing
        // localStorage entries or unrelated third-party cookies.
        const allCookies = await context.cookies();
        const discordCookies = allCookies.filter(c =>
            c.domain.includes('discord.com')
        );

        // Build a minimal storageState Playwright can consume directly without
        // persisting attacker-abusable localStorage auth material.
        const minimalSession = {
            cookies: discordCookies,
            origins: [],
        };

        writeFileSync(SESSION_FILE, JSON.stringify(minimalSession, null, 2));

        const sizeKB = (Buffer.byteLength(JSON.stringify(minimalSession)) / 1024).toFixed(1);
        console.log(`Session saved to ${SESSION_FILE} (${sizeKB} KB — sanitized cookie format)`);
        console.log('Base64-encode this file if you need to seed DISCORD_SESSION_JSON for Railway.');
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
