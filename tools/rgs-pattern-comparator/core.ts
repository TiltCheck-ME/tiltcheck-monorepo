// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AssetSizeHint, ComparisonBucket, ComparisonReport, RgsFingerprintProfile } from './types.js';

const stopWords = new Set([
  'api',
  'app',
  'assets',
  'auth',
  'bundle',
  'cache',
  'cdn',
  'com',
  'config',
  'content',
  'css',
  'data',
  'default',
  'false',
  'frontend',
  'game',
  'games',
  'get',
  'html',
  'https',
  'http',
  'index',
  'js',
  'json',
  'min',
  'null',
  'page',
  'post',
  'public',
  'script',
  'service',
  'static',
  'true',
  'undefined',
  'version',
  'www',
]);

const bucketWeights = {
  artifacts: 0.18,
  concepts: 0.22,
  routes: 0.26,
  requestKeys: 0.14,
  responseKeys: 0.12,
  assetSizes: 0.08,
} as const;

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

export function normalizeTextToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeKeyToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

function normalizeArtifactToken(value: string): string {
  return path.basename(value).trim().toLowerCase();
}

function isDynamicRouteSegment(segment: string): boolean {
  return /^\d+$/.test(segment)
    || /^[0-9a-f]{8,}$/i.test(segment)
    || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)
    || /^[a-z0-9_-]{16,}$/i.test(segment);
}

function normalizeRouteSegment(segment: string): string {
  const trimmed = segment.trim().toLowerCase();
  if (trimmed === ':id') {
    return ':id';
  }

  const normalized = trimmed.replace(/[^a-z0-9:_-]+/g, '');
  if (!normalized) {
    return '';
  }

  if (isDynamicRouteSegment(normalized)) {
    return ':id';
  }

  return normalized;
}

export function normalizeRouteSignature(method: string, urlOrPath: string): string {
  const fallbackBase = 'https://tiltcheck.local';
  const parsed = new URL(urlOrPath, fallbackBase);
  const segments = parsed.pathname
    .split('/')
    .map((segment) => normalizeRouteSegment(segment))
    .filter(Boolean);

  return `${method.toUpperCase()} /${segments.join('/')}`;
}

function flattenJsonKeys(value: unknown, prefix = '', depth = 0, acc = new Set<string>()): Set<string> {
  if (depth > 4 || value === null || value === undefined) {
    return acc;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      flattenJsonKeys(entry, prefix, depth + 1, acc);
    }
    return acc;
  }

  if (typeof value !== 'object') {
    return acc;
  }

  for (const [rawKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const key = normalizeTextToken(rawKey);
    if (!key) {
      continue;
    }

    const nestedPath = prefix ? `${prefix}.${key}` : key;
    acc.add(nestedPath);
    acc.add(key);
    flattenJsonKeys(nestedValue, nestedPath, depth + 1, acc);
  }

  return acc;
}

export function extractBodyKeys(body: string | null | undefined): string[] {
  if (!body) {
    return [];
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return [];
  }

  try {
    return uniq([...flattenJsonKeys(JSON.parse(trimmed))]);
  } catch {
    const urlSearchParams = new URLSearchParams(trimmed);
    if ([...urlSearchParams.keys()].length > 0) {
      return uniq([...urlSearchParams.keys()].map(normalizeKeyToken).filter(Boolean));
    }
  }

  return [];
}

export function tokenizeText(value: string): string[] {
  return uniq(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stopWords.has(token)),
  );
}

function routeTokens(signature: string): string[] {
  return signature
    .toLowerCase()
    .split(/[^a-z0-9:]+/g)
    .filter((token) => token && token !== ':id');
}

function overlapScore(left: string[], right: string[]): number {
  if (left.length === 0) {
    return 0;
  }

  const rightSet = new Set(right);
  const matched = left.filter((token) => rightSet.has(token)).length;
  return matched / left.length;
}

function compareStringSets(
  name: string,
  weight: number,
  baselineValues: string[],
  targetValues: string[],
  normalizer: (value: string) => string = normalizeTextToken,
): ComparisonBucket {
  const baseline = uniq(baselineValues.map(normalizer).filter(Boolean));
  const target = uniq(targetValues.map(normalizer).filter(Boolean));
  const targetSet = new Set(target);
  const matched = baseline.filter((entry) => targetSet.has(entry));
  const missing = baseline.filter((entry) => !targetSet.has(entry));
  const matchedSet = new Set(matched);
  const unexpected = target.filter((entry) => !matchedSet.has(entry));
  const score = baseline.length === 0 ? 1 : matched.length / baseline.length;

  return {
    name,
    weight,
    available: baseline.length > 0,
    baselineCount: baseline.length,
    targetCount: target.length,
    matched,
    missing,
    unexpected,
    score: round(score),
    weightedScore: round(score * weight),
  };
}

function compareRoutes(
  baselineValues: string[],
  targetValues: string[],
): ComparisonBucket {
  const baseline = uniq(baselineValues);
  const target = uniq(targetValues);
  const matched: string[] = [];
  const missing: string[] = [];
  const matchedTargets = new Set<string>();

  for (const baselineRoute of baseline) {
    const baselineTokens = routeTokens(baselineRoute);
    let bestTarget = '';
    let bestScore = 0;

    for (const targetRoute of target) {
      const score = overlapScore(baselineTokens, routeTokens(targetRoute));
      if (score > bestScore) {
        bestScore = score;
        bestTarget = targetRoute;
      }
    }

    if (bestTarget && bestScore >= 0.66) {
      matched.push(bestTarget === baselineRoute ? baselineRoute : `${baselineRoute} => ${bestTarget}`);
      matchedTargets.add(bestTarget);
    } else {
      missing.push(baselineRoute);
    }
  }

  const unexpected = target.filter((route) => !matchedTargets.has(route));
  const score = baseline.length === 0 ? 1 : matched.length / baseline.length;

  return {
    name: 'route-signatures',
    weight: bucketWeights.routes,
    available: baseline.length > 0,
    baselineCount: baseline.length,
    targetCount: target.length,
    matched,
    missing,
    unexpected,
    score: round(score),
    weightedScore: round(score * bucketWeights.routes),
  };
}

function compareAssetSizes(
  baselineValues: AssetSizeHint[],
  targetValues: { url: string; sizeKb?: number }[],
): ComparisonBucket {
  const matched: string[] = [];
  const missing: string[] = [];

  if (baselineValues.length === 0) {
    return {
      name: 'asset-sizes',
      weight: bucketWeights.assetSizes,
      available: false,
      baselineCount: 0,
      targetCount: targetValues.length,
      matched,
      missing,
      unexpected: [],
      score: 1,
      weightedScore: round(bucketWeights.assetSizes),
    };
  }

  const targetSizes = targetValues
    .map((asset) => ({ ...asset, roundedSize: typeof asset.sizeKb === 'number' ? round(asset.sizeKb) : undefined }))
    .filter((asset) => typeof asset.roundedSize === 'number');

  for (const hint of baselineValues) {
    const tolerance = hint.toleranceKb ?? Math.max(2, hint.sizeKb * 0.15);
    const match = targetSizes.find((asset) => Math.abs((asset.roundedSize as number) - hint.sizeKb) <= tolerance);
    if (match) {
      matched.push(`${hint.label}:${hint.sizeKb}KB => ${path.basename(match.url)}:${match.roundedSize}KB`);
    } else {
      missing.push(`${hint.label}:${hint.sizeKb}KB±${round(tolerance)}KB`);
    }
  }

  const unexpected = targetSizes.map((asset) => `${path.basename(asset.url)}:${asset.roundedSize}KB`);
  const score = targetSizes.length === 0 ? 0 : matched.length / baselineValues.length;

  return {
    name: 'asset-sizes',
    weight: bucketWeights.assetSizes,
    available: targetSizes.length > 0,
    baselineCount: baselineValues.length,
    targetCount: targetSizes.length,
    matched,
    missing,
    unexpected,
    score: round(score),
    weightedScore: round(score * bucketWeights.assetSizes),
  };
}

export function normalizeProfile(profile: RgsFingerprintProfile): RgsFingerprintProfile {
  return {
    ...profile,
    artifactHints: uniq(profile.artifactHints.map(normalizeArtifactToken).filter(Boolean)),
    conceptTokens: uniq(profile.conceptTokens.map(normalizeTextToken).filter(Boolean)),
    routeSignatures: uniq(profile.routeSignatures.map((signature) => {
      const [method = 'GET', route = '/'] = signature.split(/\s+/, 2);
      return normalizeRouteSignature(method, route);
    })),
    requestBodyKeys: uniq(profile.requestBodyKeys.map(normalizeKeyToken).filter(Boolean)),
    responseKeys: uniq(profile.responseKeys.map(normalizeKeyToken).filter(Boolean)),
    scriptAssets: profile.scriptAssets.map((asset) => ({
      url: asset.url,
      sizeKb: typeof asset.sizeKb === 'number' ? round(asset.sizeKb) : undefined,
    })),
    notes: uniq(profile.notes),
  };
}

export async function loadProfileFromFile(filePath: string): Promise<RgsFingerprintProfile> {
  const content = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(content) as RgsFingerprintProfile;

  return normalizeProfile({
    ...parsed,
    source: parsed.source ?? 'file',
    generatedAt: parsed.generatedAt ?? new Date().toISOString(),
    assetSizeHints: parsed.assetSizeHints ?? [],
    artifactHints: parsed.artifactHints ?? [],
    conceptTokens: parsed.conceptTokens ?? [],
    routeSignatures: parsed.routeSignatures ?? [],
    requestBodyKeys: parsed.requestBodyKeys ?? [],
    responseKeys: parsed.responseKeys ?? [],
    scriptAssets: parsed.scriptAssets ?? [],
    notes: parsed.notes ?? [],
  });
}

export function buildProfileFromCapture(input: {
  label: string;
  url: string;
  scriptUrls: string[];
  scriptAssets: { url: string; sizeKb?: number }[];
  routeSignatures: string[];
  requestBodyKeys: string[];
  responseKeys: string[];
  rawText: string;
  notes?: string[];
}): RgsFingerprintProfile {
  const artifactHints = uniq(
    input.scriptUrls
      .map((url) => {
        try {
          return path.basename(new URL(url).pathname).toLowerCase();
        } catch {
          return path.basename(url).toLowerCase();
        }
      })
      .filter(Boolean),
  );

  const conceptTokens = uniq([
    ...tokenizeText(input.rawText),
    ...tokenizeText(input.scriptUrls.join(' ')),
    ...tokenizeText(input.routeSignatures.join(' ')),
    ...input.requestBodyKeys.map(normalizeTextToken).filter(Boolean),
    ...input.responseKeys.map(normalizeTextToken).filter(Boolean),
  ]);

  return normalizeProfile({
    label: input.label,
    source: 'scrape',
    pageUrl: input.url,
    generatedAt: new Date().toISOString(),
    artifactHints,
    assetSizeHints: [],
    scriptAssets: input.scriptAssets,
    conceptTokens,
    routeSignatures: input.routeSignatures,
    requestBodyKeys: input.requestBodyKeys,
    responseKeys: input.responseKeys,
    notes: input.notes ?? [],
  });
}

export function compareProfiles(
  baselineProfile: RgsFingerprintProfile,
  targetProfile: RgsFingerprintProfile,
): ComparisonReport {
  const baseline = normalizeProfile(baselineProfile);
  const target = normalizeProfile(targetProfile);

  const buckets: ComparisonBucket[] = [
    compareStringSets('artifacts', bucketWeights.artifacts, baseline.artifactHints, target.artifactHints, normalizeArtifactToken),
    compareStringSets('concept-tokens', bucketWeights.concepts, baseline.conceptTokens, target.conceptTokens),
    compareRoutes(baseline.routeSignatures, target.routeSignatures),
    compareStringSets('request-body-keys', bucketWeights.requestKeys, baseline.requestBodyKeys, target.requestBodyKeys, normalizeKeyToken),
    compareStringSets('response-keys', bucketWeights.responseKeys, baseline.responseKeys, target.responseKeys, normalizeKeyToken),
    compareAssetSizes(baseline.assetSizeHints, target.scriptAssets),
  ];

  const applicableBuckets = buckets.filter((bucket) => bucket.available);
  const totalWeight = applicableBuckets.reduce((sum, bucket) => sum + bucket.weight, 0);
  const weightedScore = applicableBuckets.reduce((sum, bucket) => sum + bucket.weightedScore, 0);
  const overallScore = totalWeight === 0 ? 0 : round(weightedScore / totalWeight);
  const confidence = overallScore >= 0.75 ? 'high' : overallScore >= 0.5 ? 'medium' : 'low';
  const matchedPatterns = buckets.flatMap((bucket) => bucket.matched.map((value) => `${bucket.name}:${value}`));
  const missingPatterns = buckets.flatMap((bucket) => bucket.missing.map((value) => `${bucket.name}:${value}`));

  return {
    baselineLabel: baseline.label,
    targetLabel: target.label,
    generatedAt: new Date().toISOString(),
    overallScore,
    confidence,
    buckets,
    matchedPatterns,
    missingPatterns,
    summary: [
      `${baseline.label} vs ${target.label}`,
      `confidence=${confidence}`,
      `overall-score=${overallScore}`,
      `matched-patterns=${matchedPatterns.length}`,
      `missing-patterns=${missingPatterns.length}`,
    ],
  };
}

export function formatComparisonReport(report: ComparisonReport): string {
  const lines: string[] = [];

  lines.push(`RGS similarity report: ${report.baselineLabel} -> ${report.targetLabel}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Confidence: ${report.confidence}`);
  lines.push(`Overall score: ${report.overallScore}`);
  lines.push('');

  for (const bucket of report.buckets) {
    lines.push(
      `- ${bucket.name}: score=${bucket.score} weight=${bucket.weight} matched=${bucket.matched.length}/${bucket.baselineCount}`,
    );
    if (bucket.matched.length > 0) {
      lines.push(`  matched: ${bucket.matched.join(', ')}`);
    }
    if (bucket.missing.length > 0) {
      lines.push(`  missing: ${bucket.missing.join(', ')}`);
    }
    if (bucket.unexpected.length > 0) {
      lines.push(`  observed-only: ${bucket.unexpected.slice(0, 12).join(', ')}`);
    }
  }

  return lines.join('\n');
}
