#!/usr/bin/env node

/**
 * Import Casino CSV Data
 * Parses casino_data CSV and merges with casinos.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_PATH = join(__dirname, '../data/casino_data_20251121_205157.csv');
const JSON_PATH = join(__dirname, '../data/casinos.json');

// Parse CSV (handles quoted fields with commas)
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Generate slug ID from casino name
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

// Extract domain from URL for platform slugs
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0];
  } catch {
    return null;
  }
}

// Parse providers string
function parseProviders(providersStr) {
  if (!providersStr) return [];
  return providersStr
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
}

// Parse licenses string
function parseLicenses(licensesStr) {
  if (!licensesStr) return [];
  return licensesStr
    .split(',')
    .map(l => l.trim())
    .filter(Boolean);
}

// Main conversion
console.log('🎰 Importing casino data from CSV...\n');

const csvContent = readFileSync(CSV_PATH, 'utf-8');
const lines = csvContent.trim().split('\n');
const headers = parseCSVLine(lines[0]);

console.log(`Headers: ${headers.join(', ')}\n`);

const existingData = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
const existingIds = new Set(existingData.casinos.map(c => c.id));

const newCasinos = [];
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  
  const casino = {
    name: fields[0],
    url: fields[1],
    description: fields[2],
    collection_date: fields[3],
    completeness: parseFloat(fields[4]) || 0,
    license_count: parseInt(fields[5]) || 0,
    licenses: fields[6],
    rtp_count: parseInt(fields[7]) || 0,
    avg_rtp: parseFloat(fields[8]) || 0,
    fairness_certs: fields[9],
    provider_count: parseInt(fields[10]) || 0,
    providers: fields[11],
    has_ssl: fields[12] === 'True',
    encryption: fields[13],
    two_factor: fields[14] === 'True',
    withdrawal_count: parseInt(fields[15]) || 0,
    withdrawal_methods: fields[16],
    review_count: parseInt(fields[17]) || 0,
    avg_rating: parseFloat(fields[18]) || 0
  };
  
  const id = generateId(casino.name);
  
  // Skip if already exists
  if (existingIds.has(id)) {
    skipped++;
    continue;
  }
  
  const domain = extractDomain(casino.url);
  
  // Convert to casinos.json format
  const casinoEntry = {
    id,
    name: casino.name,
    baseURL: casino.url,
    endpoints: {},
    platforms: {
      reddit: domain ? `r/${domain}` : null,
      trustpilot: domain || null
    },
    regulator: casino.licenses || 'Unknown',
    enabled: true,
    lastCollected: null,
    metadata: {
      description: casino.description,
      completeness: casino.completeness,
      ssl: casino.has_ssl,
      encryption: casino.encryption || null,
      twoFactor: casino.two_factor,
      providers: parseProviders(casino.providers),
      providerCount: casino.provider_count,
      licenses: parseLicenses(casino.licenses),
      licenseCount: casino.license_count,
      fairnessCerts: casino.fairness_certs ? casino.fairness_certs.split(',').map(c => c.trim()) : [],
      withdrawalMethods: casino.withdrawal_methods ? casino.withdrawal_methods.split(',').map(w => w.trim()) : [],
      withdrawalMethodCount: casino.withdrawal_count,
      avgRTP: casino.avg_rtp,
      rtpCount: casino.rtp_count,
      reviewCount: casino.review_count,
      avgRating: casino.avg_rating,
      importDate: new Date().toISOString(),
      sourceFile: 'casino_data_20251121_205157.csv'
    }
  };
  
  newCasinos.push(casinoEntry);
}

// Merge with existing data
existingData.casinos.push(...newCasinos);

// Sort by name
existingData.casinos.sort((a, b) => a.name.localeCompare(b.name));

// Write updated file
writeFileSync(JSON_PATH, JSON.stringify(existingData, null, 2));

console.log(`✅ Import complete!`);
console.log(`   New casinos added: ${newCasinos.length}`);
console.log(`   Skipped (duplicates): ${skipped}`);
console.log(`   Total casinos: ${existingData.casinos.length}`);

// Show sample of new casinos
if (newCasinos.length > 0) {
  console.log(`\n📋 Sample of new casinos:`);
  newCasinos.slice(0, 5).forEach(c => {
    console.log(`   - ${c.name} (${c.id})`);
    console.log(`     Completeness: ${c.metadata.completeness}%`);
    console.log(`     Providers: ${c.metadata.providerCount}`);
    console.log(`     SSL: ${c.metadata.ssl ? '✅' : '❌'}`);
  });
}

console.log(`\n💾 Updated: ${JSON_PATH}`);
