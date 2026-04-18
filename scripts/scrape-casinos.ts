/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 */
/**
 * Casino Data Scraper
 * Scrapes sweepscoinguide.com to populate the casino_data table.
 * 
 * Usage: npx tsx scripts/scrape-casinos.ts
 */

import { JSDOM } from 'jsdom';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { mkdirSync, writeFileSync } from 'node:fs';

// Load environment variables from root
const rootDir = process.cwd();
dotenv.config({ path: path.resolve(rootDir, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ScrapedCasinoData {
  domain: string;
  name: string;
  status: 'active';
  license_info: {
    source?: string;
    scraped_at?: string;
    welcome_bonus?: string | null;
    site_rating?: string | null;
    type: string;
    logo_url?: string | null;
    source_logo_url?: string | null;
    logo_storage_path?: string | null;
    logo_cache_status?: 'hosted' | 'mirrored' | 'external' | 'failed' | 'missing';
  };
  claimed_rtp: number;
  updated_at?: string;
}

const CASINO_ASSET_BUCKET = process.env.CASINO_ASSET_BUCKET?.trim() || null;
const CASINO_ASSET_PREFIX = (process.env.CASINO_ASSET_PREFIX?.trim() || 'casino-assets').replace(/^\/+|\/+$/g, '');
const CASINO_ASSET_OUTPUT_DIR = process.env.CASINO_ASSET_OUTPUT_DIR?.trim() || null;
const CASINO_ASSET_PUBLIC_BASE_URL = process.env.CASINO_ASSET_PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || null;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'casino';
}

function getExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (/^\.[a-z0-9]{2,5}$/.test(ext)) return ext;
    return null;
  } catch {
    return null;
  }
}

function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return '.png';
  if (contentType.includes('svg')) return '.svg';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
  if (contentType.includes('gif')) return '.gif';
  return '.png';
}

async function cacheLogoAsset(logoUrl: string | null, domain: string): Promise<{
  logoUrl: string | null;
  sourceLogoUrl: string | null;
  storagePath: string | null;
  cacheStatus: 'hosted' | 'mirrored' | 'external' | 'failed' | 'missing';
}> {
  if (!logoUrl) {
    return {
      logoUrl: null,
      sourceLogoUrl: null,
      storagePath: null,
      cacheStatus: 'missing',
    };
  }

  const sourceLogoUrl = logoUrl;
  const timeoutSignal = AbortSignal.timeout(12_000);

  try {
    const response = await fetch(logoUrl, {
      headers: { Accept: 'image/*' },
      signal: timeoutSignal,
    });
    if (!response.ok) {
      console.warn(`⚠️ Could not fetch logo for ${domain}: HTTP ${response.status}`);
      return { logoUrl, sourceLogoUrl, storagePath: null, cacheStatus: 'failed' };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.warn(`⚠️ Skipping non-image logo for ${domain}: ${contentType ?? 'unknown content type'}`);
      return { logoUrl, sourceLogoUrl, storagePath: null, cacheStatus: 'failed' };
    }

    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const extension = getExtensionFromUrl(response.url || logoUrl) || getExtensionFromContentType(contentType);
    const filename = `${slugify(domain)}${extension}`;
    const storagePath = `${CASINO_ASSET_PREFIX}/${filename}`;

    if (CASINO_ASSET_BUCKET) {
      const { error: uploadError } = await supabase.storage
        .from(CASINO_ASSET_BUCKET)
        .upload(storagePath, body, {
          contentType,
          upsert: true,
          cacheControl: '86400',
        });

      if (uploadError) {
        console.warn(`⚠️ Failed to upload hosted logo for ${domain}:`, uploadError.message);
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from(CASINO_ASSET_BUCKET).getPublicUrl(storagePath);

        return {
          logoUrl: publicUrl || logoUrl,
          sourceLogoUrl,
          storagePath,
          cacheStatus: 'hosted',
        };
      }
    }

    if (CASINO_ASSET_OUTPUT_DIR && CASINO_ASSET_PUBLIC_BASE_URL) {
      const outputPath = path.join(CASINO_ASSET_OUTPUT_DIR, filename);
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, body);
      return {
        logoUrl: `${CASINO_ASSET_PUBLIC_BASE_URL}/${filename}`,
        sourceLogoUrl,
        storagePath: outputPath,
        cacheStatus: 'mirrored',
      };
    }

    return {
      logoUrl,
      sourceLogoUrl,
      storagePath: null,
      cacheStatus: 'external',
    };
  } catch (error) {
    console.warn(`⚠️ Failed to cache logo for ${domain}:`, error);
    return {
      logoUrl,
      sourceLogoUrl,
      storagePath: null,
      cacheStatus: 'failed',
    };
  }
}

async function scrapeSweepscoinguide() {
  console.log('🔍 Fetching sweepscoinguide.com...');
  
  try {
    // Fetch the main page
    const response = await fetch('https://sweepscoinguide.com/');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const casinos: ScrapedCasinoData[] = [];

    // Selectors based on typical affiliate site structures (headings, review cards)
    // Note: These are best-effort selectors. If the site layout changes, these need updates.
    const selectors = [
      'article',
      '.casino-item',
      '.review-card',
      '.casino-card',
      '.toplist-item',
      '.review-box',
      '.table-row',
      'tr',
      '.casino-row',
      'div[class*="casino"]', // Catch-all for divs with casino in class
      'div[class*="review"]',
      'a[href*="visit"]' // Links to casinos often are in containers we want
    ];
    const articles = document.querySelectorAll(selectors.join(', '));

    console.log(`📄 Found ${articles.length} potential casino entries.`);

    if (articles.length === 0) {
      console.log('⚠️ Debug: No entries found. The site might be using client-side rendering or blocking bots.');
      console.log(`ℹ️ HTML Content Length: ${html.length} characters`);
    }

    for (const article of articles) {
      const nameEl = article.querySelector('h2, h3, .casino-name, .review-title, a.name, td:first-child');
      if (!nameEl) continue;

      const name = nameEl.textContent?.trim() || 'Unknown';
      
      // Infer domain from name (e.g., "Chumba Casino" -> "chumbacasino.com")
      // We intentionally use generic domains and do NOT scrape affiliate links.
      const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

      // Extract features/bonuses if available
      const bonusEl = article.querySelector('.bonus, .offer, .welcome-bonus');
      const bonusText = bonusEl?.textContent?.trim() || null;

      const ratingEl = article.querySelector('.rating, .score, .stars');
      const ratingText = ratingEl?.textContent?.trim() || null;

      // Extract logo URL
      const imgEl = article.querySelector('img');
      let logoUrl = imgEl?.getAttribute('src') || null;
      
      // Resolve relative URLs
      if (logoUrl && !logoUrl.startsWith('http')) {
        try {
          logoUrl = new URL(logoUrl, 'https://sweepscoinguide.com').toString();
        } catch (e) {
          logoUrl = null;
        }
      }

      // Construct data object
      const cachedLogo = await cacheLogoAsset(logoUrl, domain);

      const casinoData: ScrapedCasinoData = {
        domain,
        name,
        status: 'active',
        // Store scraped metadata in license_info JSONB column
        license_info: {
          source: 'sweepscoinguide.com',
          scraped_at: new Date().toISOString(),
          welcome_bonus: bonusText,
          site_rating: ratingText,
          type: 'Sweepstakes Casino',
          logo_url: cachedLogo.logoUrl,
          source_logo_url: cachedLogo.sourceLogoUrl,
          logo_storage_path: cachedLogo.storagePath,
          logo_cache_status: cachedLogo.cacheStatus,
        },
        // Default RTP if not found (Sweepstakes casinos rarely publish live RTP)
        claimed_rtp: 95.0, 
        updated_at: new Date().toISOString()
      };

      casinos.push(casinoData);
    }

    // If scraping yields nothing (e.g., site structure changed), add some known defaults
    if (casinos.length === 0) {
      console.warn('⚠️ No casinos parsed. Adding default sweepstakes casinos...');
      casinos.push(
        { domain: 'chumbacasino.com', name: 'Chumba Casino', status: 'active', claimed_rtp: 96.0, license_info: { type: 'Sweepstakes' } },
        { domain: 'luckylandslots.com', name: 'LuckyLand Slots', status: 'active', claimed_rtp: 95.0, license_info: { type: 'Sweepstakes' } },
        { domain: 'pulsz.com', name: 'Pulsz', status: 'active', claimed_rtp: 96.5, license_info: { type: 'Sweepstakes' } },
        { domain: 'wowvegas.com', name: 'WOW Vegas', status: 'active', claimed_rtp: 97.0, license_info: { type: 'Sweepstakes' } },
        { domain: 'stake.us', name: 'Stake.us', status: 'active', claimed_rtp: 98.0, license_info: { type: 'Sweepstakes' } }
      );
    }

    console.log(`💾 Upserting ${casinos.length} casinos to database...`);

    const { error } = await supabase.from('casino_data').upsert(casinos, { onConflict: 'domain' });

    if (error) throw error;
    console.log('✅ Successfully populated casino_data table!');

  } catch (error) {
    console.error('❌ Error scraping casinos:', error);
  }
}

scrapeSweepscoinguide();
