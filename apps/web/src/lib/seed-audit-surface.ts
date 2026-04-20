/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */

import { auditSeedHealth } from '@tiltcheck/shared';
import type {
  SeedAuditAlgorithmMetadata,
  SeedAuditEvidence,
  SeedAuditSessionExportResult,
  SeedAuditSingleBetVerificationResult,
  SeedHygieneFinding,
} from '@tiltcheck/types';
import type { CasinoEntry } from './casino-trust';

type SeedAuditSurfaceResult = SeedAuditSessionExportResult | SeedAuditSingleBetVerificationResult;

interface AlgorithmSupportMetadataShape {
  supported?: boolean;
  metadata?: SeedAuditAlgorithmMetadata;
}

export interface SeedAuditSupportMetadata {
  supported: boolean;
  referenceOnly: boolean;
  summary: string;
  algorithmName: string;
  hashFamily: string;
  formulaVariant: string;
  requiredFields: string[];
  notes: string[];
}

export interface SeedAuditSurfaceSummary {
  statusTone: 'live' | 'warning' | 'unavailable';
  categoryLabel: string;
  sampleSummary: string;
  formulaSummary: string;
  continuitySummary: string;
  findingSummary: string;
  proofNotes: string[];
  highlightedFindings: SeedHygieneFinding[];
  highlightedEvidence: SeedAuditEvidence[];
}

export interface CasinoSeedAuditSurface {
  result: SeedAuditSessionExportResult;
  summary: SeedAuditSurfaceSummary;
  support: SeedAuditSupportMetadata;
}

const PUBLIC_TRUST_REFERENCE_ALGORITHM = {
  algorithmId: 'reference-server-seed-client-seed-nonce-hmac-sha256',
  name: 'Common public seed model (reference only)',
  hashFamily: 'hmac-sha256',
  formulaVariant: 'server-seed-client-seed-nonce',
} as const;

const CONTINUITY_FINDING_CODES = new Set([
  'seed-reuse',
  'nonce-gap',
  'nonce-reset',
  'cursor-gap',
  'round-gap',
]);

const EVIDENCE_PRIORITY = [
  'reported-hash-mismatch',
  'reported-hash-match',
  'insufficient-evidence',
  'unsupported-formula',
  'algorithm-supported',
];

function formatTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function formatCoverageLabel(value: string): string {
  return value === 'unknown' ? 'Unknown coverage' : formatTitleCase(value);
}

export function formatSeedAuditCategoryLabel(value: string): string {
  return formatTitleCase(value);
}

export function extractSeedAuditSupportMetadata(result: SeedAuditSurfaceResult): SeedAuditSupportMetadata {
  const algorithmSupport = result.metadata?.algorithmSupport as AlgorithmSupportMetadataShape | undefined;
  const metadata = algorithmSupport?.metadata;
  const contextMetadata = result.context?.metadata;
  const referenceOnly = contextMetadata?.referenceOnly === true;
  const supported = Boolean(algorithmSupport?.supported);
  const algorithmName = metadata?.name ?? result.algorithm.name;
  const requiredFields = (metadata?.fields ?? [])
    .filter((field) => field.required)
    .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER))
    .map((field) => field.label);
  const notes = [
    ...(referenceOnly ? ['Operator-specific formula mapping is not attached to this surface yet.'] : []),
    ...(metadata?.notes ?? []),
  ];

  return {
    supported,
    referenceOnly,
    summary: supported
      ? referenceOnly
        ? 'Reusable audit support exists for a common HMAC seed model, but this trust surface does not have an operator-specific formula mapping yet.'
        : 'Reusable audit support is active for the supplied proof path.'
      : referenceOnly
        ? 'This surface only has a reference placeholder right now. Operator-specific formula support is still missing.'
        : 'Reusable audit support is not registered for this proof path yet.',
    algorithmName,
    hashFamily: metadata?.hashFamily ?? result.algorithm.hashFamily,
    formulaVariant: metadata?.formulaVariant ?? result.algorithm.formulaVariant,
    requiredFields,
    notes,
  };
}

export function summarizeSeedAuditResult(result: SeedAuditSurfaceResult): SeedAuditSurfaceSummary {
  const observedSamples = result.proofQuality.sample.observedSamples;
  const recommendedMinimum = result.proofQuality.sample.recommendedMinimum ?? (result.scope === 'single-bet' ? 1 : 3);
  const incompleteSamples = result.proofQuality.sample.incompleteSamples ?? 0;
  const continuityFindings = result.hygieneFindings.filter((finding) => CONTINUITY_FINDING_CODES.has(finding.code));
  const highlightedEvidence = EVIDENCE_PRIORITY
    .flatMap((code) => result.evidence.filter((evidence) => evidence.code === code))
    .filter((evidence, index, collection) => collection.findIndex((item) => item.code === evidence.code) === index)
    .slice(0, 3);
  const highlightedFindings = result.hygieneFindings.slice(0, 3);

  const sampleSummary = observedSamples === 0
    ? `No ordered session export is attached here yet. ${recommendedMinimum}+ record${recommendedMinimum === 1 ? '' : 's'} are the minimum for a continuity read.`
    : `${observedSamples}/${recommendedMinimum} audited record${observedSamples === 1 ? '' : 's'} · ${formatCoverageLabel(result.proofQuality.sample.coverage)}${incompleteSamples > 0 ? ` · ${incompleteSamples} incomplete` : ''}`;

  const formulaSummary = result.formulaVerification.checkedRecords === 0
    ? 'No reported-hash comparison is attached to this surface yet.'
    : result.formulaVerification.mismatchedRecords > 0
      ? `${result.formulaVerification.mismatchedRecords} checked record${result.formulaVerification.mismatchedRecords === 1 ? '' : 's'} did not match the supplied reported hash.`
      : `${result.formulaVerification.matchedRecords}/${result.formulaVerification.checkedRecords} checked record${result.formulaVerification.checkedRecords === 1 ? '' : 's'} matched the supplied reported hash.`;

  const continuitySummary = continuityFindings.length > 0
    ? continuityFindings.map((finding) => finding.summary).join(' ')
    : observedSamples === 0
      ? 'Reuse, reset, and continuity checks are unavailable because no ordered session export is attached to this surface.'
      : result.scope === 'single-bet'
        ? 'One sample is enough for a raw receipt, not for reuse, reset, or continuity conclusions.'
        : observedSamples < 2
          ? 'Need at least two ordered records before reuse or reset patterns can be checked.'
          : 'No reuse, reset, or continuity anomalies were flagged in the audited sample.';

  let statusTone: SeedAuditSurfaceSummary['statusTone'] = 'warning';

  if (observedSamples === 0) {
    statusTone = 'unavailable';
  } else if (
    result.scope === 'session-export'
    && result.category === 'verified'
    && result.proofQuality.category === 'verified'
    && result.proofQuality.confidence !== 'low'
    && observedSamples >= recommendedMinimum
  ) {
    statusTone = 'live';
  }

  return {
    statusTone,
    categoryLabel: formatSeedAuditCategoryLabel(result.category),
    sampleSummary,
    formulaSummary,
    continuitySummary,
    findingSummary: highlightedFindings.length > 0
      ? `${highlightedFindings.length} seed-health finding${highlightedFindings.length === 1 ? '' : 's'} surfaced in the attached sample.`
      : observedSamples === 0
        ? 'No seed-health findings are attached because this surface does not include a session export yet.'
        : 'No seed-health findings were flagged in the audited sample.',
    proofNotes: result.proofQuality.notes.slice(0, 3),
    highlightedFindings,
    highlightedEvidence,
  };
}

export async function getCasinoSeedAuditSurface(
  casino: Pick<CasinoEntry, 'slug' | 'name' | 'category' | 'monitoredDomain'>,
): Promise<CasinoSeedAuditSurface> {
  const result = await auditSeedHealth({
    scope: 'session-export',
    algorithm: PUBLIC_TRUST_REFERENCE_ALGORITHM,
    context: {
      source: 'web',
      casinoId: casino.slug,
      casinoName: casino.name,
      metadata: {
        surface: 'casino-trust-page',
        referenceOnly: true,
        category: casino.category,
        monitoredDomain: casino.monitoredDomain ?? null,
      },
    },
    export: {
      formatId: 'public-trust-surface-reference',
      recordCount: 0,
      notes: [
        'No session export is attached to this public trust surface yet.',
        'Manual single-bet verification stays on /tools/verify.',
      ],
    },
    records: [],
  });

  return {
    result,
    summary: summarizeSeedAuditResult(result),
    support: extractSeedAuditSupportMetadata(result),
  };
}
