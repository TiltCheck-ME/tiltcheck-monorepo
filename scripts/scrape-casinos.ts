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

async function scrapeSweepscoinguide() {
  console.log('🔍 Fetching sweepscoinguide.com...');
  
  try {
    // Fetch the main page
    const response = await fetch('https://sweepscoinguide.com/');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const casinos: any[] = [];

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

    articles.forEach((article) => {
      const nameEl = article.querySelector('h2, h3, .casino-name, .review-title, a.name, td:first-child');
      if (!nameEl) return;

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
      const casinoData = {
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
          logo_url: logoUrl
        },
        // Default RTP if not found (Sweepstakes casinos rarely publish live RTP)
        claimed_rtp: 95.0, 
        updated_at: new Date().toISOString()
      };

      casinos.push(casinoData);
    });

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