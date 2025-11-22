#!/usr/bin/env node

/**
 * Generate Trust Snapshots from CSV Metadata
 * Creates initial trust scores based on available CSV data (SSL, licenses, providers, etc.)
 * without expensive AI calls. AI Collector can enrich these later.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JSON_PATH = join(__dirname, '../data/casinos.json');
const SNAPSHOTS_DIR = join(__dirname, '../data/casino-snapshots');

// Score based on CSV metadata
function scoreFromMetadata(casino) {
  const meta = casino.metadata || {};
  let score = 50; // baseline
  
  // SSL/Security (20 points max)
  if (meta.ssl) score += 10;
  if (meta.encryption) score += 5;
  if (meta.twoFactor) score += 5;
  
  // Licensing (15 points max)
  if (meta.licenseCount > 0) score += 10;
  if (meta.licenses?.includes('Malta Gaming Authority')) score += 5;
  if (meta.licenses?.includes('UK Gambling Commission')) score += 5;
  
  // Fairness Certifications (10 points max)
  if (meta.fairnessCerts?.includes('GLI')) score += 5;
  if (meta.fairnessCerts?.includes('TST')) score += 5;
  
  // Provider Diversity (10 points max)
  if (meta.providerCount >= 5) score += 10;
  else if (meta.providerCount >= 3) score += 5;
  else if (meta.providerCount >= 1) score += 3;
  
  // RTP Data (10 points max)
  if (meta.avgRTP >= 96) score += 10;
  else if (meta.avgRTP >= 94) score += 5;
  else if (meta.avgRTP > 0) score += 3;
  
  // Reviews (5 points max)
  if (meta.avgRating >= 4.5) score += 5;
  else if (meta.avgRating >= 4.0) score += 3;
  else if (meta.avgRating >= 3.0) score += 1;
  
  // Data completeness penalty
  const completenessMultiplier = meta.completeness ? (meta.completeness / 100) : 0.5;
  score = Math.round(score * completenessMultiplier);
  
  return Math.min(100, Math.max(0, score));
}

// Generate category breakdown
function generateCategories(casino, compositeScore) {
  const meta = casino.metadata || {};
  
  return {
    rng_fairness: {
      score: meta.fairnessCerts?.length > 0 ? 85 : 50,
      confidence: meta.fairnessCerts?.length > 0 ? 0.7 : 0.3,
      rationale: meta.fairnessCerts?.length > 0 
        ? [`Certifications: ${meta.fairnessCerts.join(', ')}`]
        : ['No fairness certifications found in metadata']
    },
    rtp_transparency: {
      score: meta.avgRTP > 0 ? Math.min(100, meta.avgRTP) : 50,
      confidence: meta.rtpCount > 0 ? 0.6 : 0.2,
      rationale: meta.avgRTP > 0
        ? [`Average RTP: ${meta.avgRTP}% (${meta.rtpCount} games)`]
        : ['No RTP data available']
    },
    volatility_consistency: {
      score: 70, // neutral - requires on-chain data
      confidence: 0.1,
      rationale: ['No historical spin data available yet']
    },
    session_integrity: {
      score: meta.ssl ? 80 : 40,
      confidence: 0.8,
      rationale: [
        `SSL: ${meta.ssl ? '✅' : '❌'}`,
        `Encryption: ${meta.encryption || 'Unknown'}`,
        `2FA: ${meta.twoFactor ? '✅' : '❌'}`
      ]
    },
    operational_transparency: {
      score: meta.licenseCount > 0 ? 75 : 40,
      confidence: 0.7,
      rationale: [
        `Licenses: ${meta.licenseCount} (${meta.licenses?.join(', ') || 'None'})`,
        `Providers: ${meta.providerCount}`,
        `Withdrawal methods: ${meta.withdrawalMethodCount}`
      ]
    }
  };
}

// Risk level classification
function getRiskLevel(score) {
  if (score >= 90) return { level: 'LOW', color: '🟢', label: 'Excellent' };
  if (score >= 75) return { level: 'MODERATE', color: '🟡', label: 'Good' };
  if (score >= 60) return { level: 'ELEVATED', color: '🟠', label: 'Fair' };
  if (score >= 40) return { level: 'HIGH', color: '🔴', label: 'Poor' };
  return { level: 'CRITICAL', color: '⛔', label: 'Critical' };
}

// Main
console.log('📊 Generating trust snapshots from CSV metadata...\n');

const casinos = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
let generated = 0;
let skipped = 0;

for (const casino of casinos.casinos) {
  // Only generate for newly imported casinos (those with metadata.sourceFile)
  if (!casino.metadata?.sourceFile) {
    skipped++;
    continue;
  }
  
  const compositeScore = scoreFromMetadata(casino);
  const categories = generateCategories(casino, compositeScore);
  const risk = getRiskLevel(compositeScore);
  
  const snapshot = {
    casinoId: casino.id,
    casinoName: casino.name,
    collectedAt: new Date().toISOString(),
    source: 'csv-metadata',
    version: '1.0',
    compositeScore,
    riskLevel: risk.level,
    categories,
    metadata: {
      completeness: casino.metadata.completeness,
      providers: casino.metadata.providers,
      licenses: casino.metadata.licenses,
      fairnessCerts: casino.metadata.fairnessCerts,
      ssl: casino.metadata.ssl,
      encryption: casino.metadata.encryption,
      twoFactor: casino.metadata.twoFactor,
      avgRTP: casino.metadata.avgRTP,
      avgRating: casino.metadata.avgRating,
      reviewCount: casino.metadata.reviewCount
    },
    notes: [
      'Generated from CSV scraper metadata',
      'AI enrichment pending - schedule for next AI Collector run',
      `Data completeness: ${casino.metadata.completeness.toFixed(1)}%`
    ]
  };
  
  // Write snapshot
  const snapshotDir = join(SNAPSHOTS_DIR, casino.id);
  mkdirSync(snapshotDir, { recursive: true });
  
  const snapshotPath = join(snapshotDir, 'latest.json');
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  
  console.log(`${risk.color} ${casino.name}`);
  console.log(`   Score: ${compositeScore}/100 (${risk.label})`);
  console.log(`   Completeness: ${casino.metadata.completeness.toFixed(1)}%`);
  console.log(`   Path: data/casino-snapshots/${casino.id}/latest.json`);
  
  generated++;
}

console.log(`\n✅ Snapshot generation complete!`);
console.log(`   Generated: ${generated}`);
console.log(`   Skipped (existing casinos): ${skipped}`);
console.log(`\n💡 Next steps:`);
console.log(`   1. Review snapshots in data/casino-snapshots/`);
console.log(`   2. Test /trust-report command with new casinos`);
console.log(`   3. Schedule AI Collector run for enrichment`);
