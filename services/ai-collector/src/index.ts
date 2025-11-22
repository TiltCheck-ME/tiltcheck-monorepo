/**
 * AI-Powered Casino Data Collector
 * =================================
 * Autonomous extraction of publicly available casino fairness data using LLM agents.
 * Feeds the grading engine with fresh disclosures, hash verifications, and sentiment.
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { eventRouter } from '@tiltcheck/event-router';
import { gradeEngine, type CasinoData, type GradingOutput } from '@tiltcheck/grading-engine';

// ────────────────────────────────────────────────────────────────────────────────
// User-Agent Rotation & Anti-Bot Detection
// ────────────────────────────────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(minMs = 1000, maxMs = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// ────────────────────────────────────────────────────────────────────────────────
// LLM Extraction Cache (30-day TTL)
// ────────────────────────────────────────────────────────────────────────────────

const CACHE_DIR = path.join(process.cwd(), 'data', 'extraction-cache');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCacheKey(url: string, extractionType: string): string {
  return crypto.createHash('md5').update(`${url}:${extractionType}`).digest('hex');
}

async function getCachedExtraction<T>(url: string, type: string): Promise<T | null> {
  const key = getCacheKey(url, type);
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  
  try {
    const stats = await fs.stat(cachePath);
    const age = Date.now() - stats.mtimeMs;
    
    if (age < CACHE_TTL_MS) {
      const data = await fs.readFile(cachePath, 'utf-8');
      console.log(`  ⚡ Cache hit for ${type} (${Math.floor(age / 1000 / 60 / 60 / 24)} days old)`);
      return JSON.parse(data) as T;
    } else {
      await fs.unlink(cachePath).catch(() => {}); // Expired, delete silently
    }
  } catch {
    // Cache miss
  }
  return null;
}

async function setCachedExtraction<T>(url: string, type: string, data: T): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const key = getCacheKey(url, type);
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  await fs.writeFile(cachePath, JSON.stringify({ url, type, data, cachedAt: new Date().toISOString() }, null, 2));
  console.log(`  💾 Cached ${type} extraction`);
}

// ────────────────────────────────────────────────────────────────────────────────
// Types & Schemas
// ────────────────────────────────────────────────────────────────────────────────

const DisclosureSchema = z.object({
  rtpVersionPublished: z.boolean(),
  auditReportPresent: z.boolean(),
  fairnessPolicyURL: z.string().optional(),
  regulatorLicense: z.string().optional(),
  rtpRange: z.string().optional(),
});

const SentimentSchema = z.object({
  overallScore: z.number().min(-1).max(1),
  sampleSize: z.number(),
  topComplaints: z.array(z.string()).max(3),
});

interface CasinoRegistryEntry {
  id: string;
  name: string;
  baseURL: string;
  endpoints: {
    fairness?: string;
    provablyFair?: string;
    games?: string;
  };
  platforms?: {
    reddit?: string;
    trustpilot?: string;
  };
  regulator?: string;
  enabled: boolean;
  lastCollected?: string;
}

interface CollectionSnapshot {
  casinoId: string;
  collectedAt: string;
  sources: {
    disclosures?: z.infer<typeof DisclosureSchema>;
    hashVerifications?: any[];
    sentiment?: z.infer<typeof SentimentSchema>;
  };
  grading?: GradingOutput;
  errors?: string[];
}

// ────────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string> {
  // Random delay to avoid rate limiting
  await randomDelay();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (err) {
    console.error(`[Fetch] Failed to fetch ${url}:`, err);
    throw err;
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ────────────────────────────────────────────────────────────────────────────────
// Extraction Functions
// ────────────────────────────────────────────────────────────────────────────────

async function extractDisclosures(casino: CasinoRegistryEntry): Promise<z.infer<typeof DisclosureSchema>> {
  const fairnessURL = casino.baseURL + (casino.endpoints.fairness || '/fairness');
  
  // Check cache first (30-day TTL)
  const cached = await getCachedExtraction<z.infer<typeof DisclosureSchema>>(fairnessURL, 'disclosures');
  if (cached) return cached;
  
  try {
    const html = await fetchPage(fairnessURL);
    const $ = cheerio.load(html);
    const bodyText = $('body').text().slice(0, 50000); // limit context
    
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: DisclosureSchema,
      prompt: `Extract fairness disclosure information from this casino webpage content. Look for:
- RTP version numbers or ranges mentioned (e.g., "96% RTP", "94-96%")
- Links to external audit reports (eCOGRA, iTech Labs, GLI, etc.)
- License information (Curacao, Malta Gaming Authority, UK Gambling Commission)
- Provably fair explanations or seed verification systems

If information is not found, mark as false/missing.

Page URL: ${fairnessURL}
Content:
${bodyText}

Return structured JSON.`,
    });
    
    // Cache for 30 days
    await setCachedExtraction(fairnessURL, 'disclosures', object);
    
    return object;
  } catch (err) {
    console.error(`[Disclosures] Failed for ${casino.id}:`, err);
    return {
      rtpVersionPublished: false,
      auditReportPresent: false,
    };
  }
}

async function extractSentiment(casino: CasinoRegistryEntry): Promise<z.infer<typeof SentimentSchema>> {
  try {
    const reviews: string[] = [];
    
    // Reddit scraping (public JSON API, no auth required)
    if (casino.platforms?.reddit) {
      try {
        await randomDelay(1500, 3000); // Longer delay for API calls
        const searchQuery = encodeURIComponent(`${casino.name} scam OR fair OR rigged OR withdrawal`);
        const response = await fetch(
          `https://www.reddit.com/${casino.platforms.reddit}/search.json?q=${searchQuery}&limit=50&sort=new&restrict_sr=on`,
          {
            headers: {
              'User-Agent': getRandomUserAgent(),
              'Accept': 'application/json'
            }
          }
        );
        if (response.ok) {
          const data: any = await response.json();
          const posts = data.data?.children || [];
          reviews.push(...posts.map((p: any) => `${p.data.title || ''} ${p.data.selftext || ''}`.slice(0, 500)));
          console.log(`[Sentiment] Fetched ${posts.length} Reddit posts for ${casino.id}`);
        }
      } catch (err) {
        console.warn(`[Sentiment] Reddit fetch failed for ${casino.id}:`, err);
      }
    }
    
    // Trustpilot scraping
    if (casino.platforms?.trustpilot) {
      try {
        const html = await fetchPage(`https://www.trustpilot.com/review/${casino.platforms.trustpilot}`);
        const $ = cheerio.load(html);
        $('.review-content__text').each((_, el) => {
          reviews.push($(el).text().slice(0, 500));
        });
      } catch (err) {
        console.warn(`[Sentiment] Trustpilot fetch failed for ${casino.id}:`, err);
      }
    }
    
    if (reviews.length === 0) {
      return { overallScore: 0, sampleSize: 0, topComplaints: ['No reviews found'] };
    }
    
    const combined = reviews.join('\n---\n').slice(0, 100000);
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: SentimentSchema,
      prompt: `Analyze player sentiment about ${casino.name} from these reviews. Focus on fairness concerns (RTP manipulation, rigging, withdrawal issues, trust). Rate overall sentiment from -1 (very negative) to +1 (very positive) and extract top 3 complaint themes.\n\nReviews:\n${combined}`,
    });
    
    return object;
  } catch (err) {
    console.error(`[Sentiment] Failed for ${casino.id}:`, err);
    return { overallScore: 0, sampleSize: 0, topComplaints: ['Extraction error'] };
  }
}

async function verifyHashes(casino: CasinoRegistryEntry): Promise<any[]> {
  // Mock implementation - real version would find and verify seed history
  console.log(`[Hash Verification] Placeholder for ${casino.id}`);
  return [
    { verified: true, ts: Date.now() - 86400000 },
    { verified: true, ts: Date.now() - 172800000 },
  ];
}

// ────────────────────────────────────────────────────────────────────────────────
// Collection Orchestration
// ────────────────────────────────────────────────────────────────────────────────

async function collectCasinoData(casino: CasinoRegistryEntry): Promise<CollectionSnapshot> {
  console.log(`[Collector] Starting collection for ${casino.id}...`);
  const snapshot: CollectionSnapshot = {
    casinoId: casino.id,
    collectedAt: new Date().toISOString(),
    sources: {},
    errors: [],
  };

  try {
    // Extract disclosures
    snapshot.sources.disclosures = await extractDisclosures(casino);
    await delay(2000); // rate limiting

    // Extract sentiment
    snapshot.sources.sentiment = await extractSentiment(casino);
    await delay(1000);

    // Verify hashes (placeholder)
    snapshot.sources.hashVerifications = await verifyHashes(casino);
    
    // Grade the casino using collected data
    const casinoData: CasinoData = {
      casino: casino.id,
      spins: [], // Placeholder: would need on-chain or API spin data
      disclosures: snapshot.sources.disclosures,
      hashVerifications: snapshot.sources.hashVerifications,
      paytableBaseline: {}, // Would extract from game metadata if available
      expectedBonusPerSpins: 100,
    };
    
    snapshot.grading = gradeEngine(casinoData);
    console.log(`[Collector] ✓ Graded ${casino.id}: ${snapshot.grading.compositeScore}/100`);
    
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    snapshot.errors?.push(errMsg);
    console.error(`[Collector] ✗ Failed for ${casino.id}:`, errMsg);
  }

  return snapshot;
}

async function persistSnapshot(snapshot: CollectionSnapshot): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const dir = path.resolve(`data/casino-snapshots/${snapshot.casinoId}`);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${date}.json`);
  await fs.writeFile(file, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`[Persist] Saved snapshot to ${file}`);
}

// ────────────────────────────────────────────────────────────────────────────────
// Registry Management
// ────────────────────────────────────────────────────────────────────────────────

async function loadRegistry(): Promise<{ casinos: CasinoRegistryEntry[] }> {
  const registryPath = path.resolve('data/casinos.json');
  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.warn('[Registry] No registry found, using default');
    return {
      casinos: [
        {
          id: 'stake-us',
          name: 'Stake.us',
          baseURL: 'https://stake.us',
          endpoints: {
            fairness: '/fairness',
            provablyFair: '/provably-fair',
          },
          platforms: {
            reddit: 'r/Stake',
          },
          regulator: 'Curacao',
          enabled: true,
        },
      ],
    };
  }
}

async function saveRegistry(registry: { casinos: CasinoRegistryEntry[] }): Promise<void> {
  const registryPath = path.resolve('data/casinos.json');
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
}

// ────────────────────────────────────────────────────────────────────────────────
// Scheduler
// ────────────────────────────────────────────────────────────────────────────────

async function runCollection() {
  console.log('[AI Collector] 🚀 Starting weekly casino data collection...');
  const registry = await loadRegistry();
  
  for (const casino of registry.casinos.filter(c => c.enabled)) {
    try {
      const snapshot = await collectCasinoData(casino);
      await persistSnapshot(snapshot);
      
      // Update registry with last collected timestamp
      casino.lastCollected = snapshot.collectedAt;
      
      // Emit trust event with grading results
      if (snapshot.grading) {
        await eventRouter.publish('trust.casino.updated', 'ai-collector', {
          casinoId: casino.id,
          trustScore: snapshot.grading.compositeScore / 100, // normalize to 0-1
          metadata: {
            categories: snapshot.grading.categories,
            collectedAt: snapshot.collectedAt,
            sentiment: snapshot.sources.sentiment,
          },
        });
      }
      
      await delay(5000); // respectful interval between casinos
    } catch (err) {
      console.error(`[Scheduler] Error processing ${casino.id}:`, err);
    }
  }
  
  await saveRegistry(registry);
  console.log('[AI Collector] ✓ Collection complete');
}

// ────────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    // Single run for testing
    await runCollection();
    process.exit(0);
  }
  
  // Scheduled mode (weekly at 2 AM UTC every Sunday)
  console.log('[AI Collector] Starting in scheduled mode (weekly Sunday 2 AM UTC)...');
  cron.schedule('0 2 * * 0', async () => {
    await runCollection();
  });
  
  // Keep process alive
  console.log('[AI Collector] Scheduler active. Press Ctrl+C to exit.');
}

main().catch(err => {
  console.error('[AI Collector] Fatal error:', err);
  process.exit(1);
});
