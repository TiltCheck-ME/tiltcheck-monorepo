import { chromium } from 'playwright';
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
        await context.storageState({ path: SESSION_FILE });
        console.log(`Session saved to ${SESSION_FILE}`);
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
