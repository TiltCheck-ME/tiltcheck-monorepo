#!/usr/bin/env node
/**
 * Build trust-engines seed data from enriched scrape records.
 *
 * Input:  data/trust-engine/remaining-sweepstakes-records.v3.json
 * Output: data/trust-engine/casino-trust.seeded.json (tracked artifact)
 * Optional runtime output: data/casino-trust.json (ignored by git, used at startup)
 */

import fs from 'fs';
import path from 'path';

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

function boolFlag(flag) {
  return process.argv.includes(flag);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function riskBand(rawRisk) {
  const text = String(rawRisk || '').toLowerCase();
  if (text.includes('high')) return 'high';
  if (text.includes('medium')) return 'medium';
  return 'low';
}

function riskPenalty(rawRisk, { low = 0, medium = 0, high = 0 }) {
  const band = riskBand(rawRisk);
  if (band === 'high') return high;
  if (band === 'medium') return medium;
  return low;
}

function toCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function scoreRecord(record) {
  const completeness = Number(record.dataCompletenessScore || 0); // expected 0..100-ish in current files
  const completenessFactor = clamp(completeness, 0, 100) / 100;

  const fairnessCerts = Array.isArray(record.fairnessCertifications)
    ? record.fairnessCertifications.length
    : (hasText(record.fairnessCertifications) ? 1 : 0);
  const withdrawCount = Math.max(toCount(record.withdrawalMethods), Number(record.withdrawalMethodsCount || 0));
  const nerfSignals = Array.isArray(record.knownNerfSignals)
    ? record.knownNerfSignals.length
    : (hasText(record.knownNerfSignals) ? 1 : 0);

  const fairnessScore = clamp(
    70 +
    (fairnessCerts > 0 ? 12 : 0) +
    (hasText(record.responsibleGamingInfo) ? 4 : 0) +
    (record.hasSsl === true ? 3 : 0) +
    completenessFactor * 8 -
    riskPenalty(record.category, { medium: 7, high: 15 })
  );

  const payoutScore = clamp(
    70 +
    Math.min(withdrawCount * 2, 10) +
    (hasText(record.payoutTimeClaims) ? 8 : 0) +
    (hasText(record.kycPolicySummary) ? 3 : 0) +
    completenessFactor * 6 -
    riskPenalty(record.category, { medium: 5, high: 10 })
  );

  const bonusScore = clamp(
    72 +
    (hasText(record.bonusTermsSummary) ? 10 : 0) +
    (hasText(record.wageringRequirements) ? 6 : 0) +
    (nerfSignals > 0 ? -8 : 0) +
    completenessFactor * 6 -
    riskPenalty(record.category, { medium: 4, high: 8 })
  );

  const userReportScore = clamp(
    72 +
    completenessFactor * 10 -
    riskPenalty(record.riskFlags && record.riskFlags.length ? 'high' : record.category, { medium: 6, high: 12 })
  );

  const freespinScore = clamp(
    70 +
    (hasText(record.bonusTermsSummary) ? 5 : 0) +
    (nerfSignals > 0 ? -10 : 0) +
    completenessFactor * 5 -
    riskPenalty(record.category, { medium: 4, high: 8 })
  );

  const complianceScore = clamp(
    68 +
    (hasText(record.jurisdictionOrLicenseClaims) ? 12 : 0) +
    (hasText(record.complianceNotes) ? 8 : 0) +
    (hasText(record.kycPolicySummary) ? 6 : 0) +
    (record.hasSsl === true ? 3 : 0) +
    completenessFactor * 8 -
    riskPenalty(record.category, { medium: 6, high: 12 })
  );

  const supportScore = clamp(
    70 +
    (hasText(record.primaryUrl) ? 5 : 0) +
    (hasText(record.complianceNotes) ? 3 : 0) +
    (hasText(record.responsibleGamingInfo) ? 3 : 0) +
    completenessFactor * 5 -
    riskPenalty(record.category, { medium: 4, high: 8 })
  );

  const score = clamp(
    fairnessScore * 0.30 +
    payoutScore * 0.20 +
    bonusScore * 0.15 +
    userReportScore * 0.15 +
    freespinScore * 0.10 +
    complianceScore * 0.05 +
    supportScore * 0.05
  );

  return {
    score,
    fairnessScore,
    payoutScore,
    bonusScore,
    userReportScore,
    freespinScore,
    complianceScore,
    supportScore
  };
}

function recordKey(record) {
  if (hasText(record.canonicalDomain)) return String(record.canonicalDomain).trim().toLowerCase();
  return String(record.casinoName || '').trim();
}

function main() {
  const workspaceRoot = process.cwd();
  const input = argValue('--input') || path.join(workspaceRoot, 'data/trust-engine/remaining-sweepstakes-records.v3.json');
  const output = argValue('--output') || path.join(workspaceRoot, 'data/trust-engine/casino-trust.seeded.json');
  const runtimeOutput = argValue('--runtime-output') || null;
  const includeExisting = boolFlag('--include-existing');

  const scrapeRecords = readJson(input);
  if (!Array.isArray(scrapeRecords)) {
    throw new Error('Input JSON must be an array of scrape records.');
  }

  const now = Date.now();
  const seededMap = new Map();

  scrapeRecords.forEach((record) => {
    const key = recordKey(record);
    if (!key) return;
    const categoryScores = scoreRecord(record);
    const delta = categoryScores.score - 75;
    seededMap.set(key, {
      ...categoryScores,
      history: [
        {
          timestamp: now,
          delta,
          reason: 'Seeded from public scrape ingestion dataset',
          severity: Math.abs(delta) >= 12 ? 4 : Math.abs(delta) >= 8 ? 3 : Math.abs(delta) >= 4 ? 2 : 1,
          category: 'score'
        }
      ],
      lastUpdated: now
    });
  });

  if (includeExisting) {
    const existingPath = path.join(workspaceRoot, 'packages/trust-engines/data/casino-trust.json');
    if (fs.existsSync(existingPath)) {
      const existing = readJson(existingPath);
      if (Array.isArray(existing)) {
        existing.forEach((entry) => {
          if (!Array.isArray(entry) || entry.length !== 2) return;
          const key = entry[0];
          const value = entry[1];
          if (!seededMap.has(key)) seededMap.set(key, value);
        });
      }
    }
  }

  const asEntries = Array.from(seededMap.entries());
  writeJson(output, asEntries);

  if (runtimeOutput) {
    writeJson(runtimeOutput, asEntries);
  }

  console.log(JSON.stringify({
    inputRecords: scrapeRecords.length,
    seededEntries: asEntries.length,
    output,
    runtimeOutput: runtimeOutput || null,
    includeExisting
  }, null, 2));
}

main();
