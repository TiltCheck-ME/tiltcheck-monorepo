// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
/**
 * Casino Email Crawler
 *
 * Connects to a Gmail (or any IMAP) account, finds casino marketing emails,
 * and pipes them through the TiltCheck email-ingest API automatically.
 *
 * SETUP:
 *   1. Enable IMAP in Gmail: Settings → See all settings → Forwarding and POP/IMAP → Enable IMAP
 *   2. Create a Gmail App Password: myaccount.google.com/apppasswords
 *      (Requires 2FA enabled. Name it "TiltCheck Crawler")
 *   3. Copy .env.example → .env and fill in CRAWLER_EMAIL + CRAWLER_APP_PASSWORD
 *
 * USAGE:
 *   npx tsx scripts/email-crawler.ts              # process new emails
 *   npx tsx scripts/email-crawler.ts --all        # reprocess all (ignores seen log)
 *   npx tsx scripts/email-crawler.ts --dry-run    # parse only, don't call API
 *   npx tsx scripts/email-crawler.ts --limit 50   # cap at 50 emails per run
 *   npx tsx scripts/email-crawler.ts --delete-processed # delete emails after successful ingest
 */

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: resolve(process.cwd(), '.env') });

// ─── Config ───────────────────────────────────────────────────────────────────

const SEEN_LOG_PATH = resolve(process.cwd(), 'data', 'crawler-seen.json');
const API_URL = process.env.CRAWLER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const EMAIL = process.env.CRAWLER_EMAIL;
const APP_PASSWORD = process.env.CRAWLER_APP_PASSWORD;

const FLAGS = {
  all: process.argv.includes('--all'),
  dryRun: process.argv.includes('--dry-run'),
  deleteProcessed: process.argv.includes('--delete-processed'),
  limit: (() => {
    const idx = process.argv.indexOf('--limit');
    return idx !== -1 ? parseInt(process.argv[idx + 1], 10) || 100 : 200;
  })(),
};

// ─── Known casino sender domains to search for ────────────────────────────────
// Add any domain you get emails from here.

const CASINO_SENDER_DOMAINS = [
  // Social/Sweepstakes casinos (US)
  'chumbacasino.com',
  'luckylandslots.com',
  'pulsz.com',
  'high5casino.com',
  'wowvegas.com',
  'funrize.com',
  'modo.us',
  'hellomillions.com',
  'fortunecoins.com',
  'sportzino.com',
  'zulacasino.com',
  'crowncoinscasino.com',
  'myprize.us',
  'gains.com',
  'rolla.com',
  'realprize.com',
  'americanluck.com',
  'chanced.com',
  'punt.com',
  'spindoo.com',
  'spinfinite.com',
  'babacasino.com',
  'getzoot.us',
  'mcluck.com',
  'nolimitcoins.com',
  'rollinriches.com',
  'jackpota.com',
  'lonestarcasino.com',
  'tao.fun',
  'dingdingding.com',
  'slotpark.com',
  'slotomania.com',
  'caesarssocialcasino.com',
  'playamazing.com',
  'blinkist.com',
  'playfame.com',
  'megabonanza.com',
  'yaycasino.com',
  'gambino.com',
  'vegasworldcasino.com',
  'scratchful.com',
  'spree.com',
  'fortunata.com',
  'globalpoker.com',
  'pulszbingo.com',
  'pokerrrr.com',
  'worldpokerclub.com',
  'wsop.com',
  'zynga.com',

  // Real-money offshore/crypto casinos
  'stake.com',
  'stake.us',
  'roobet.com',
  'rollbit.com',
  'gamdom.com',
  'shuffle.com',
  'bc.game',
  'betplay.io',
  'cloudbet.com',
  'trustdice.win',
  'crashino.com',
  'fairspin.io',
  'bitstarz.com',
  'bitsler.com',
  'wolf.bet',
  'duelbits.com',
  'metaspins.com',
  'fortunejack.com',
  'betfury.io',
  'winna.com',
  '1xbet.com',
  'betway.com',
  'betmgm.com',
  'draftkings.com',
  'fanduel.com',
  'caesars.com',
  'hardrock.bet',
  'pointsbet.com',
  'barstoolsportsbook.com',
  'unibet.com',
  'williamhill.com',
  'bet365.com',
  'ladbrokes.com',
  'coral.co.uk',
  'paddypower.com',
  'betfair.com',
  'sky.bet',
  'pokerstars.com',
  'pokerstars.eu',
  'partypoker.com',
  '888casino.com',
  '888poker.com',
  'mrgreen.com',
  'leovegas.com',
  'casumo.com',
  'videoslots.com',
  'netbet.com',
  'spin.com',
  'jackpotcity.com',
  'royalvegas.com',
  'zodiac.casino',
  'playnow.com',
  'prismcasino.com',
  'slotocash.im',
  'bovada.lv',
  'ignitioncasino.eu',
  'cafecasino.lv',
  'betonline.ag',
  'mybookie.ag',
  'superslots.ag',
  'wildz.com',
  'jackpotjoy.com',
  'bingo.com',
  'wink.com',
  'gala.co.uk',
  'foxy.com',
  'moonpay.com',
  'fortunepay.com',
  'luckycasino.com',
  'luckystar.io',
  'katsubet.com',
  'kingbilly.com',
  'casinoextreme.eu',
  'goldenpalace.be',
  'spinaway.com',
  'draftpot.com',
  'underdog.com',
  'prizepicks.com',
  'sleeper.app',
  'parlayplay.com',
];

// ─── Seen log (tracks processed message IDs) ─────────────────────────────────

function loadSeen(): Set<string> {
  if (FLAGS.all || !existsSync(SEEN_LOG_PATH)) return new Set();
  try {
    return new Set(JSON.parse(readFileSync(SEEN_LOG_PATH, 'utf8')));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>): void {
  writeFileSync(SEEN_LOG_PATH, JSON.stringify([...seen]), 'utf8');
}

// ─── API call ────────────────────────────────────────────────────────────────

async function ingestEmail(rawEmail: string): Promise<{ success: boolean; brand?: string; bonusCount?: number; riskLevel?: string }> {
  if (FLAGS.dryRun) return { success: true };

  const res = await fetch(`${API_URL}/rgaas/email-ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'TiltCheck-Email-Crawler',
    },
    body: JSON.stringify({ raw_email: rawEmail }),
  });

  if (!res.ok) {
    console.warn(`  API ${res.status}: ${await res.text().catch(() => '')}`);
    return { success: false };
  }

  const data = await res.json() as { intel?: { casinoBrand?: string; bonusSignals?: unknown[] }; domainScan?: { riskLevel?: string } };
  return {
    success: true,
    brand: data.intel?.casinoBrand ?? undefined,
    bonusCount: data.intel?.bonusSignals?.length ?? 0,
    riskLevel: data.domainScan?.riskLevel ?? 'unknown',
  };
}

// ─── IMAP helpers ────────────────────────────────────────────────────────────

function buildImapClient(): Imap {
  if (!EMAIL || !APP_PASSWORD) {
    console.error([
      '',
      'CRAWLER_EMAIL and CRAWLER_APP_PASSWORD are required.',
      '',
      'Set them in your .env file or as env vars:',
      '  CRAWLER_EMAIL=you@gmail.com',
      '  CRAWLER_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx',
      '',
      'Get a Gmail App Password at: https://myaccount.google.com/apppasswords',
      '(Requires 2FA to be enabled on your Google account)',
    ].join('\n'));
    process.exit(1);
  }

  return new Imap({
    user: EMAIL,
    password: APP_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: true, servername: 'imap.gmail.com' },
    authTimeout: 10000,
  });
}

function fetchRawMessage(imap: Imap, uid: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch(uid, { bodies: '' });
    let raw = '';
    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        stream.on('data', (chunk: Buffer) => { raw += chunk.toString('utf8'); });
        stream.on('end', () => {});
      });
    });
    fetch.on('error', reject);
    fetch.on('end', () => resolve(raw));
  });
}

function deleteMessage(imap: Imap, uid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    imap.addFlags(uid, '\\Deleted', (flagError) => {
      if (flagError) {
        reject(flagError);
        return;
      }

      imap.expunge(uid, (expungeError) => {
        if (expungeError) {
          reject(expungeError);
          return;
        }

        resolve();
      });
    });
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const seen = loadSeen();
  const imap = buildImapClient();

  console.log(`\nTiltCheck Casino Email Crawler`);
  console.log(`Mode: ${FLAGS.dryRun ? 'DRY RUN' : 'LIVE'} | Limit: ${FLAGS.limit} | Reset: ${FLAGS.all} | Delete processed: ${FLAGS.deleteProcessed}`);
  console.log(`API: ${API_URL}`);
  console.log(`Searching for emails from ${CASINO_SENDER_DOMAINS.length} known casino domains...\n`);

  await new Promise<void>((resolve, reject) => {
    imap.once('ready', async () => {
      try {
        // Open inbox
        await promisify(imap.openBox.bind(imap))('INBOX', !FLAGS.deleteProcessed);

        const searchDomain = (domain: string): Promise<number[]> => new Promise((res, rej) => {
          imap.search([['FROM', domain]] as Parameters<typeof imap.search>[0], (err, results) => {
            if (err) rej(err);
            else res((results as number[]) ?? []);
          });
        });

        // Gmail/IMAP chokes on a very large nested OR tree. Search each sender
        // domain independently, then union the matching UIDs.
        const uidSet = new Set<number>();
        for (const domain of CASINO_SENDER_DOMAINS) {
          try {
            const domainUids = await searchDomain(domain);
            for (const uid of domainUids) {
              uidSet.add(uid);
            }
          } catch (err) {
            console.warn(`Skipping domain ${domain}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        const uids = [...uidSet].sort((a, b) => a - b);

        console.log(`Found ${uids.length} matching emails in inbox.`);

        const toProcess = uids
          .filter((uid) => !seen.has(String(uid)))
          .slice(-FLAGS.limit); // process oldest first, cap at limit

        console.log(`${toProcess.length} not yet processed (${uids.length - toProcess.length} already seen).\n`);

        let processed = 0;
        let errors = 0;
        let totalBonuses = 0;

        for (const uid of toProcess) {
          try {
            const raw = await fetchRawMessage(imap, uid);

            // Quick parse to get subject for logging
            const parsed = await simpleParser(raw);
            const subject = parsed.subject ?? '(no subject)';
            const from = parsed.from?.text ?? '?';

            process.stdout.write(`[${processed + 1}/${toProcess.length}] ${from.slice(0, 40).padEnd(40)} | ${subject.slice(0, 50)} ... `);

            const result = await ingestEmail(raw);

            if (result.success) {
              seen.add(String(uid));
              totalBonuses += result.bonusCount ?? 0;
              if (FLAGS.deleteProcessed) {
                await deleteMessage(imap, uid);
              }
              console.log(`OK | ${result.brand ?? 'unknown brand'} | ${result.bonusCount ?? 0} bonuses | domain: ${result.riskLevel}`);
            } else {
              console.log('FAILED');
              errors++;
            }

            processed++;

            // Small delay to avoid hammering the API
            await new Promise((r) => setTimeout(r, 150));
          } catch (err) {
            console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
            errors++;
          }
        }

        console.log(`\nDone. Processed: ${processed} | Errors: ${errors} | Total bonuses extracted: ${totalBonuses}`);
        if (!FLAGS.dryRun) saveSeen(seen);

        imap.end();
        resolve();
      } catch (err) {
        imap.end();
        reject(err);
      }
    });

    imap.once('error', reject);
    imap.connect();
  });
}

run().catch((err) => {
  console.error('\nCrawler failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
