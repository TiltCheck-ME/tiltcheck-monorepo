import fs from 'fs';
import path from 'path';

// Load env vars
function loadEnv() {
    const envPaths = [
        path.resolve(process.cwd(), 'apps/discord-bot/.env'),
        path.resolve(process.cwd(), '.env'),
    ];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8');
            content.split('\n').forEach(line => {
                const t = line.trim();
                if (t && !t.startsWith('#')) {
                    const idx = t.indexOf('=');
                    if (idx > -1) {
                        const k = t.slice(0, idx).trim();
                        const v = t.slice(idx + 1).trim();
                        if (!process.env[k]) process.env[k] = v;
                    }
                }
            });
            console.log(`Loaded env from ${p}`);
            return;
        }
    }
}
loadEnv();

const ELASTIC_URL = process.env.ELASTIC_URL;
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;

if (!ELASTIC_URL || !ELASTIC_API_KEY) {
    console.log("No ELASTIC_URL or ELASTIC_API_KEY found, skipping dummy telemetry generation.");
    process.exit(0);
}

const INDEX = 'tiltcheck-telemetry';

// Realistic demo data: showing a user moving from "normal" to "tilted"
const events = [];
const userId = 'demo_user_1337';

const start = new Date(Date.now() - 3600 * 1000); // 1 hour ago

function addEvent(delayMin, action, sentiment, tiltScore, amountSol, isDM = false, metadata = {}) {
    const ts = new Date(start.getTime() + delayMin * 60000);
    events.push({
        '@timestamp': ts.toISOString(),
        user_id: userId,
        guild_id: '999999999999999',
        channel_id: '888888888888888',
        action,
        sentiment,
        tilt_score: tiltScore,
        amount_sol: amountSol,
        is_dm: isDM,
        metadata
    });
}

// 1. Normal gameplay start
addEvent(0, 'command_used', 0.8, 5, 0, false, { command: '/play' });
addEvent(5, 'message_sent', 0.5, 5, 0, false, null);
addEvent(12, 'command_used', 0.6, 10, 0, false, { command: '/play' });

// 2. Starts losing, sentiment drops, tip events with larger amounts (chasing losses)
addEvent(20, 'message_sent', -0.2, 35, 0, false, null);
addEvent(22, 'tip_sent', null, 40, 1.5, false, { counterpart: 'casino_bot' });
addEvent(25, 'command_used', -0.5, 55, 0, false, { command: '/play' });
addEvent(28, 'tip_sent', null, 65, 3.0, false, { counterpart: 'casino_bot' });

// 3. Very tilted behavior, swearing, very fast betting
addEvent(30, 'message_sent', -0.9, 80, 0, false, { flagged_words: ['rigged', 'scam'] });
addEvent(31, 'tip_sent', null, 85, 5.0, false, { counterpart: 'casino_bot' });
addEvent(32, 'wallet_checked', -0.8, 90, 0, true, null);

// 4. Tilt detection triggered
addEvent(33, 'tilt_detected', null, 95, 0, true, { signals: ['RTP Drift', 'Loss Chasing', 'Sentiment Crash'] });
addEvent(34, 'cooldown_triggered', null, 95, 0, true, { duration_hours: 24 });

async function ingest() {
    console.log(`Generating ${events.length} proxy telemetry events to ${ELASTIC_URL}/${INDEX}`);

    let ndjson = '';
    for (const e of events) {
        ndjson += JSON.stringify({ index: { _index: INDEX } }) + '\n';
        ndjson += JSON.stringify(e) + '\n';
    }

    try {
        const res = await fetch(`${ELASTIC_URL}/_bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Authorization': `ApiKey ${ELASTIC_API_KEY}`
            },
            body: ndjson
        });

        if (res.ok) {
            const data = await res.json();
            if (data.errors) {
                console.error("Bulk insert reported errors in payloads.");
            } else {
                console.log("Successfully ingested realistic tilt telemetry!");
            }
        } else {
            console.error(`Elastic returned ${res.status} ${await res.text()}`);
        }
    } catch (err) {
        console.error("Failed to fetch:", err);
    }
}

ingest();
