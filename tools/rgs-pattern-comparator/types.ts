// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25

export interface AssetSizeHint {
  label: string;
  sizeKb: number;
  toleranceKb?: number;
}

export interface CapturedScriptAsset {
  url: string;
  sizeKb?: number;
}

export interface CapturedRoute {
  method: string;
  url: string;
  signature: string;
}

export interface RgsFingerprintProfile {
  label: string;
  source: 'baseline' | 'scrape' | 'file';
  pageUrl?: string;
  generatedAt: string;
  artifactHints: string[];
  assetSizeHints: AssetSizeHint[];
  scriptAssets: CapturedScriptAsset[];
  conceptTokens: string[];
  routeSignatures: string[];
  requestBodyKeys: string[];
  responseKeys: string[];
  notes: string[];
}

export interface ComparisonBucket {
  name: string;
  weight: number;
  available: boolean;
  baselineCount: number;
  targetCount: number;
  matched: string[];
  missing: string[];
  unexpected: string[];
  score: number;
  weightedScore: number;
}

export interface ComparisonReport {
  baselineLabel: string;
  targetLabel: string;
  generatedAt: string;
  overallScore: number;
  confidence: 'low' | 'medium' | 'high';
  buckets: ComparisonBucket[];
  matchedPatterns: string[];
  missingPatterns: string[];
  summary: string[];
}

export interface ScrapeOptions {
  url: string;
  timeoutMs?: number;
  settleMs?: number;
  maxTrackedRequests?: number;
}
