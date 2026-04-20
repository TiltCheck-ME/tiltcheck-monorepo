// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19

import type {
  SeedAuditAlgorithmMetadata,
  SeedAuditAlgorithmReference,
  SeedAuditBaseResult,
  SeedAuditBetRecord,
  SeedAuditConfidenceTier,
  SeedAuditContext,
  SeedAuditEvidence,
  SeedAuditFormulaField,
  SeedAuditFormulaVerification,
  SeedAuditProofQualityResult,
  SeedAuditRecordResult,
  SeedAuditResultCategory,
  SeedAuditSampleCoverage,
  SeedAuditSessionExportInput,
  SeedAuditSessionExportResult,
  SeedAuditSingleBetVerificationInput,
  SeedAuditSingleBetVerificationResult,
  SeedAuditValueEncoding,
  SeedHygieneFinding,
  SeedHygieneFindingCode,
} from '@tiltcheck/types';
import { FairnessService } from './fairness.js';

type SeedAuditInput = SeedAuditSingleBetVerificationInput | SeedAuditSessionExportInput;

interface NormalizedRecord {
  recordId: string;
  source: SeedAuditBetRecord;
  index: number;
  timestamp?: number;
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  cursor?: number | string;
  round?: number | string;
  externalEntropy?: string;
  reportedHash?: string;
  commitmentHash?: string;
}

interface StrategyResolution {
  supported: boolean;
  metadata: SeedAuditAlgorithmMetadata;
  requiredRoles: Set<string>;
  computeHash?: (record: NormalizedRecord) => Promise<string>;
  getMissingDetails?: (record: NormalizedRecord) => string[];
}

interface RecordAuditState {
  result: SeedAuditRecordResult;
  formulaChecked: boolean;
  formulaMatched: boolean;
  formulaMismatched: boolean;
  missingFormulaInputs: string[];
}

const HASH_ENCODINGS: SeedAuditValueEncoding[] = ['hex', 'utf8', 'base64', 'unknown'];
const fairness = new FairnessService();
const DEFAULT_CLIENT_SEEDS = new Set([
  'clientseed',
  'default',
  'default-client-seed',
  'seed',
  'test',
  '12345',
  '000000',
]);

const GENERIC_FIELDS_BY_VARIANT: Record<string, SeedAuditFormulaField[]> = {
  'server-seed-client-seed-nonce': [
    { role: 'server-seed', label: 'Server seed', required: true, order: 1, encoding: 'utf8' },
    { role: 'client-seed', label: 'Client seed', required: true, order: 2, encoding: 'utf8', separator: ':' },
    { role: 'nonce', label: 'Nonce', required: true, order: 3, encoding: 'decimal', separator: ':' },
  ],
  'server-seed-client-seed-nonce-cursor': [
    { role: 'server-seed', label: 'Server seed', required: true, order: 1, encoding: 'utf8' },
    { role: 'client-seed', label: 'Client seed', required: true, order: 2, encoding: 'utf8', separator: ':' },
    { role: 'nonce', label: 'Nonce', required: true, order: 3, encoding: 'decimal', separator: ':' },
    { role: 'cursor', label: 'Cursor', required: true, order: 4, encoding: 'decimal', separator: ':' },
  ],
  'server-seed-client-seed-round': [
    { role: 'server-seed', label: 'Server seed', required: true, order: 1, encoding: 'utf8' },
    { role: 'client-seed', label: 'Client seed', required: true, order: 2, encoding: 'utf8', separator: ':' },
    { role: 'round', label: 'Round', required: true, order: 3, encoding: 'decimal', separator: ':' },
  ],
  'external-entropy-client-seed-nonce': [
    { role: 'external-entropy', label: 'External entropy', required: true, order: 1, encoding: 'utf8' },
    { role: 'client-seed', label: 'Client seed', required: true, order: 2, encoding: 'utf8', separator: ':' },
    { role: 'nonce', label: 'Nonce', required: true, order: 3, encoding: 'decimal', separator: ':' },
  ],
  'external-entropy-client-seed-nonce-cursor': [
    { role: 'external-entropy', label: 'External entropy', required: true, order: 1, encoding: 'utf8' },
    { role: 'client-seed', label: 'Client seed', required: true, order: 2, encoding: 'utf8', separator: ':' },
    { role: 'nonce', label: 'Nonce', required: true, order: 3, encoding: 'decimal', separator: ':' },
    { role: 'cursor', label: 'Cursor', required: true, order: 4, encoding: 'decimal', separator: ':' },
  ],
};

function buildGenericMetadata(reference: SeedAuditAlgorithmReference): SeedAuditAlgorithmMetadata {
  return {
    ...reference,
    description: 'Generic reusable seed-audit strategy using normalized colon-delimited inputs.',
    fields: GENERIC_FIELDS_BY_VARIANT[reference.formulaVariant] ?? [],
    outputEncoding: HASH_ENCODINGS.includes('hex') ? 'hex' : 'unknown',
    outputDomain: 'hash',
    supportsCursor: reference.formulaVariant.includes('cursor'),
    supportsRound: reference.formulaVariant.includes('round'),
    notes: [
      'Raw verification compares a recomputed hash against the supplied reported hash when present.',
      'Proof-quality findings remain evidence-based and do not claim intent.',
    ],
  };
}

async function computeHmac(hash: 'SHA-256' | 'SHA-512', key: string, message: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw new Error('WebCrypto subtle is not available in this environment');
  }

  const encoder = new TextEncoder();
  const keyBytes = Uint8Array.from(encoder.encode(key));
  const messageBytes = Uint8Array.from(encoder.encode(message));
  const importedKey = await subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash },
    false,
    ['sign'],
  );
  const signature = await subtle.sign('HMAC', importedKey, messageBytes);

  return bufferToHex(signature as ArrayBuffer);
}

async function computeDigest(hash: 'SHA-256' | 'SHA-512', value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw new Error('WebCrypto subtle is not available in this environment');
  }

  const encoder = new TextEncoder();
  const bytes = Uint8Array.from(encoder.encode(value));
  const digest = await subtle.digest(hash, bytes);

  return bufferToHex(digest);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeHash(value: unknown): string | undefined {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  return normalized.toLowerCase().replace(/^0x/, '');
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.trim());

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeCursorOrRound(value: unknown): number | string | undefined {
  const asNumber = normalizeNumber(value);

  if (asNumber !== undefined) {
    return asNumber;
  }

  return normalizeString(value);
}

function getMetadataString(metadata: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!metadata) {
    return undefined;
  }

  for (const key of keys) {
    const value = normalizeString(metadata[key]);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function compareCategory(left: SeedAuditResultCategory, right: SeedAuditResultCategory): SeedAuditResultCategory {
  const order: Record<SeedAuditResultCategory, number> = {
    verified: 0,
    partial: 1,
    'insufficient-sample': 2,
    suspicious: 3,
  };

  return order[left] >= order[right] ? left : right;
}

function severityToCategory(severity: SeedHygieneFinding['severity']): SeedAuditResultCategory {
  switch (severity) {
    case 'high':
    case 'medium':
      return 'suspicious';
    case 'low':
      return 'partial';
    default:
      return 'verified';
  }
}

function createEvidence(
  code: string,
  category: SeedAuditResultCategory,
  kind: SeedAuditEvidence['kind'],
  summary: string,
  options: Omit<SeedAuditEvidence, 'code' | 'category' | 'kind' | 'summary'> = {},
): SeedAuditEvidence {
  return {
    code,
    category,
    kind,
    summary,
    ...options,
  };
}

function createFinding(
  code: SeedHygieneFindingCode,
  category: SeedAuditResultCategory,
  severity: SeedHygieneFinding['severity'],
  summary: string,
  options: Omit<SeedHygieneFinding, 'code' | 'category' | 'severity' | 'summary'> = {},
): SeedHygieneFinding {
  return {
    code,
    category,
    severity,
    summary,
    ...options,
  };
}

function toNormalizedRecord(record: SeedAuditBetRecord, index: number): NormalizedRecord {
  return {
    recordId: normalizeString(record.recordId)
      ?? normalizeString(record.betId)
      ?? normalizeString(record.roundId)
      ?? `record-${index + 1}`,
    source: record,
    index,
    timestamp: normalizeNumber(record.timestamp),
    serverSeed: normalizeString(record.serverSeed),
    serverSeedHash: normalizeHash(record.serverSeedHash),
    clientSeed: normalizeString(record.clientSeed),
    nonce: normalizeNumber(record.nonce),
    cursor: normalizeCursorOrRound(record.cursor),
    round: normalizeCursorOrRound(record.round),
    externalEntropy: normalizeString(record.externalEntropy),
    reportedHash: normalizeHash(record.reportedHash),
    commitmentHash: normalizeHash(record.commitmentHash),
  };
}

function getSeedGroupKey(record: NormalizedRecord): string | undefined {
  return record.serverSeedHash
    ?? record.commitmentHash
    ?? record.serverSeed
    ?? record.externalEntropy;
}

function getMissingRoleLabels(record: NormalizedRecord, fields: SeedAuditFormulaField[]): string[] {
  const missing: string[] = [];

  for (const field of fields) {
    if (!field.required) {
      continue;
    }

    const value = (() => {
      switch (field.role) {
        case 'server-seed':
          return record.serverSeed;
        case 'server-seed-hash':
          return record.serverSeedHash;
        case 'client-seed':
          return record.clientSeed;
        case 'nonce':
          return record.nonce;
        case 'cursor':
          return record.cursor;
        case 'round':
          return record.round;
        case 'external-entropy':
          return record.externalEntropy;
        case 'reported-hash':
          return record.reportedHash;
        case 'commitment-hash':
          return record.commitmentHash;
        default:
          return undefined;
      }
    })();

    if (value === undefined || value === null || value === '') {
      missing.push(field.label);
    }
  }

  return missing;
}

function buildStrategy(reference: SeedAuditAlgorithmReference): StrategyResolution {
  if (reference.algorithmId === 'tiltcheck-4-key-hmac-sha256') {
    const metadata: SeedAuditAlgorithmMetadata = {
      ...reference,
      description: 'TiltCheck wrapper over the 4-key HMAC flow using external entropy and a metadata-bound Discord ID.',
      fields: [
        { role: 'external-entropy', label: 'External entropy', required: true, order: 1, encoding: 'utf8' },
        { role: 'client-seed', label: 'Client seed', required: true, order: 2, encoding: 'utf8' },
        { role: 'nonce', label: 'Nonce', required: true, order: 3, encoding: 'decimal' },
      ],
      outputEncoding: 'hex',
      outputDomain: 'hash',
      notes: [
        'This clean wrapper additionally requires record.metadata.discordId.',
        'Raw verification stays separate from broader seed hygiene findings.',
      ],
    };

    return {
      supported: true,
      metadata,
      requiredRoles: new Set(['external-entropy', 'client-seed', 'nonce']),
      getMissingDetails: (record) => {
        const discordId = getMetadataString(record.source.metadata, ['discordId', 'discord_id']);
        return discordId ? [] : ['record.metadata.discordId'];
      },
      computeHash: async (record) => {
        const discordId = getMetadataString(record.source.metadata, ['discordId', 'discord_id']);

        if (!record.externalEntropy || !record.clientSeed || record.nonce === undefined || !discordId) {
          throw new Error('Missing required fields for TiltCheck 4-key verification');
        }

        return fairness.generateHash(record.externalEntropy, discordId, record.clientSeed, record.nonce);
      },
    };
  }

  const metadata = buildGenericMetadata(reference);

  if (reference.formulaVariant === 'custom' || metadata.fields.length === 0) {
    return {
      supported: false,
      metadata: {
        ...metadata,
        notes: [...(metadata.notes ?? []), 'No reusable computation strategy is registered for this formula.'],
      },
      requiredRoles: new Set(),
    };
  }

  if (!['hmac-sha256', 'hmac-sha512', 'sha256', 'sha512'].includes(reference.hashFamily)) {
    return {
      supported: false,
      metadata: {
        ...metadata,
        notes: [...(metadata.notes ?? []), 'Hash family is not currently supported by the reusable auditor.'],
      },
      requiredRoles: new Set(metadata.fields.filter((field) => field.required).map((field) => field.role)),
    };
  }

  return {
    supported: true,
    metadata,
    requiredRoles: new Set(metadata.fields.filter((field) => field.required).map((field) => field.role)),
    computeHash: async (record) => {
      const inputValues = metadata.fields.map((field) => {
        switch (field.role) {
          case 'server-seed':
            return record.serverSeed;
          case 'client-seed':
            return record.clientSeed;
          case 'nonce':
            return record.nonce;
          case 'cursor':
            return record.cursor;
          case 'round':
            return record.round;
          case 'external-entropy':
            return record.externalEntropy;
          default:
            return undefined;
        }
      });

      if (inputValues.some((value) => value === undefined || value === null || value === '')) {
        throw new Error('Missing required fields for formula verification');
      }

      const [first, ...rest] = inputValues;
      const stringValues = [first, ...rest].map((value) => String(value));

      if (reference.hashFamily === 'hmac-sha256' || reference.hashFamily === 'hmac-sha512') {
        const key = stringValues[0];
        const message = stringValues.slice(1).join(':');

        return reference.hashFamily === 'hmac-sha256'
          ? computeHmac('SHA-256', key, message)
          : computeHmac('SHA-512', key, message);
      }

      const payload = stringValues.join(':');
      return reference.hashFamily === 'sha256'
        ? computeDigest('SHA-256', payload)
        : computeDigest('SHA-512', payload);
    },
  };
}

async function verifyCommitment(
  record: NormalizedRecord,
  recordResult: SeedAuditRecordResult,
): Promise<void> {
  if (!record.serverSeed) {
    if (record.serverSeedHash || record.commitmentHash) {
      recordResult.hygieneFindings.push(createFinding(
        'missing-server-seed-reveal',
        'partial',
        'low',
        'Commitment exists but the revealed server seed is missing.',
        {
          affectedRecordIds: [record.recordId],
          confidence: 'medium',
          recommendation: 'Provide the revealed server seed to validate the precommitment.',
        },
      ));
    }

    return;
  }

  const commitment = record.serverSeedHash ?? record.commitmentHash;

  if (!commitment) {
    recordResult.hygieneFindings.push(createFinding(
      'missing-server-seed-hash',
      'partial',
      'low',
      'Revealed server seed has no commitment hash to anchor it.',
      {
        affectedRecordIds: [record.recordId],
        confidence: 'medium',
        recommendation: 'Include the original commitment hash alongside the revealed seed.',
      },
    ));
    return;
  }

  const algorithm = commitment.length > 64 ? 'SHA-512' : 'SHA-256';
  const computed = await computeDigest(algorithm, record.serverSeed);

  if (computed === commitment) {
    recordResult.evidence.push(createEvidence(
      'commitment-match',
      'verified',
      'commitment',
      'Revealed seed matches the supplied commitment hash.',
      {
        expected: commitment,
        observed: computed,
        recordIds: [record.recordId],
        relatedRoles: ['server-seed', 'server-seed-hash'],
      },
    ));
    return;
  }

  const evidence = createEvidence(
    'commitment-mismatch',
    'suspicious',
    'commitment',
    'Revealed seed does not match the supplied commitment hash.',
    {
      expected: commitment,
      observed: computed,
      recordIds: [record.recordId],
      relatedRoles: ['server-seed', 'server-seed-hash'],
    },
  );

  recordResult.evidence.push(evidence);
  recordResult.hygieneFindings.push(createFinding(
    'commitment-mismatch',
    'suspicious',
    'high',
    'Commitment mismatch between the revealed server seed and the published hash.',
    {
      affectedRecordIds: [record.recordId],
      confidence: 'high',
      evidence: [evidence],
      recommendation: 'Re-check the reveal source and original commitment before trusting the sample.',
    },
  ));
}

function buildRecordSummary(recordResult: SeedAuditRecordResult): string {
  if (recordResult.category === 'verified') {
    return 'Raw verification matched the supplied evidence.';
  }

  if (recordResult.category === 'suspicious') {
    return 'The record contains mismatches or continuity problems that need review.';
  }

  return 'The record is only partially auditable with the supplied evidence.';
}

function buildProofQuality(
  scope: SeedAuditInput['scope'],
  recordCount: number,
  checkedRecords: number,
  matchedRecords: number,
  incompleteSamples: number,
  coverage: SeedAuditSampleCoverage,
  aggregateCategory: SeedAuditResultCategory,
  strategy: StrategyResolution,
): SeedAuditProofQualityResult {
  const recommendedMinimum = scope === 'single-bet' ? 1 : 3;
  const notes: string[] = [];

  notes.push(strategy.supported
    ? `Algorithm support is available for ${strategy.metadata.name}.`
    : `Algorithm support is limited for ${strategy.metadata.name}.`);

  if (scope === 'single-bet') {
    notes.push('Single-bet inputs can confirm raw math, but they do not establish long-run seed hygiene on their own.');
  } else if (recordCount < 3) {
    notes.push('Session export is too small for strong continuity conclusions.');
  }

  if (incompleteSamples > 0) {
    notes.push(`${incompleteSamples} record(s) were incomplete for the declared formula.`);
  }

  if (checkedRecords === 0) {
    notes.push('No record included enough information to compare a recomputed hash against a reported hash.');
  } else if (matchedRecords < checkedRecords) {
    notes.push(`${matchedRecords}/${checkedRecords} checked record(s) matched the supplied reported hash.`);
  } else {
    notes.push(`${matchedRecords}/${checkedRecords} checked record(s) matched the supplied reported hash.`);
  }

  let confidence: SeedAuditConfidenceTier = 'unknown';

  if (recordCount >= 25 && coverage === 'full') {
    confidence = 'high';
  } else if (recordCount >= 10 && coverage !== 'fragmented') {
    confidence = 'medium';
  } else if (recordCount > 0) {
    confidence = 'low';
  }

  return {
    category: aggregateCategory,
    confidence,
    summary: aggregateCategory === 'verified'
      ? 'Evidence supports the supplied proof path without hygiene anomalies in the audited sample.'
      : aggregateCategory === 'suspicious'
        ? 'Evidence shows mismatches or continuity anomalies that weaken the proof set.'
        : aggregateCategory === 'insufficient-sample'
          ? 'Sample is too small for a reliable proof-quality read.'
          : 'Evidence supports only a partial proof-quality read.',
    sample: {
      observedSamples: recordCount,
      recommendedMinimum,
      coverage,
      incompleteSamples,
      note: scope === 'single-bet'
        ? 'One sample is enough for a raw recomputation, not for broad seed hygiene conclusions.'
        : 'Three or more ordered records are the minimum for basic continuity review.',
    },
    notes,
  };
}

function getCoverage(recordCount: number, incompleteSamples: number): SeedAuditSampleCoverage {
  if (recordCount === 0) {
    return 'unknown';
  }

  if (incompleteSamples === 0) {
    return 'full';
  }

  const completeRatio = (recordCount - incompleteSamples) / recordCount;

  if (completeRatio >= 0.6) {
    return 'partial';
  }

  return 'fragmented';
}

function pushIfMissing(
  findingMap: Map<string, SeedHygieneFinding>,
  finding: SeedHygieneFinding,
): void {
  const key = [
    finding.code,
    finding.summary,
    (finding.affectedRecordIds ?? []).join(','),
  ].join('|');

  if (!findingMap.has(key)) {
    findingMap.set(key, finding);
  }
}

function getRecordOrder(records: NormalizedRecord[]): NormalizedRecord[] {
  return [...records].sort((left, right) => {
    if (left.timestamp !== undefined && right.timestamp !== undefined && left.timestamp !== right.timestamp) {
      return left.timestamp - right.timestamp;
    }

    return left.index - right.index;
  });
}

function analyzeContinuity(records: NormalizedRecord[]): SeedHygieneFinding[] {
  const findings: SeedHygieneFinding[] = [];
  const groups = new Map<string, NormalizedRecord[]>();

  for (const record of records) {
    const key = getSeedGroupKey(record);

    if (!key) {
      continue;
    }

    const current = groups.get(key) ?? [];
    current.push(record);
    groups.set(key, current);
  }

  for (const groupedRecords of groups.values()) {
    if (groupedRecords.length < 2) {
      continue;
    }

    const ordered = getRecordOrder(groupedRecords);

    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];

      if (previous.nonce !== undefined && current.nonce !== undefined) {
        const nonceDelta = current.nonce - previous.nonce;

        if (nonceDelta <= 0) {
          findings.push(createFinding(
            'nonce-reset',
            'suspicious',
            'medium',
            'Nonce moved backward or repeated within the same seed group.',
            {
              affectedRecordIds: [previous.recordId, current.recordId],
              confidence: 'medium',
              detail: `Observed ${previous.nonce} followed by ${current.nonce}.`,
              recommendation: 'Review export ordering and seed rotation boundaries.',
            },
          ));
        } else if (nonceDelta > 1) {
          findings.push(createFinding(
            'nonce-gap',
            'partial',
            'low',
            'Nonce sequence contains a gap within the same seed group.',
            {
              affectedRecordIds: [previous.recordId, current.recordId],
              confidence: 'medium',
              detail: `Observed ${previous.nonce} followed by ${current.nonce}.`,
              recommendation: 'Confirm whether omitted rounds or filtered rows explain the gap.',
            },
          ));
        }
      }

      if (typeof previous.cursor === 'number' && typeof current.cursor === 'number') {
        const cursorDelta = current.cursor - previous.cursor;

        if (cursorDelta <= 0 || cursorDelta > 1) {
          findings.push(createFinding(
            'cursor-gap',
            cursorDelta <= 0 ? 'suspicious' : 'partial',
            cursorDelta <= 0 ? 'medium' : 'low',
            'Cursor sequence is not strictly continuous within the same seed group.',
            {
              affectedRecordIds: [previous.recordId, current.recordId],
              confidence: 'medium',
              detail: `Observed ${previous.cursor} followed by ${current.cursor}.`,
              recommendation: 'Check whether the export mixes partial cursor windows or reset boundaries.',
            },
          ));
        }
      }

      if (typeof previous.round === 'number' && typeof current.round === 'number') {
        const roundDelta = current.round - previous.round;

        if (roundDelta <= 0 || roundDelta > 1) {
          findings.push(createFinding(
            'round-gap',
            roundDelta <= 0 ? 'suspicious' : 'partial',
            roundDelta <= 0 ? 'medium' : 'low',
            'Round sequence is not strictly continuous within the same seed group.',
            {
              affectedRecordIds: [previous.recordId, current.recordId],
              confidence: 'medium',
              detail: `Observed ${previous.round} followed by ${current.round}.`,
              recommendation: 'Check whether the export spans multiple round windows.',
            },
          ));
        }
      }
    }
  }

  return findings;
}

function analyzeSeedReuse(records: NormalizedRecord[]): SeedHygieneFinding[] {
  const groups = new Map<string, string[]>();

  for (const record of records) {
    if (!record.serverSeed) {
      continue;
    }

    const current = groups.get(record.serverSeed) ?? [];
    current.push(record.recordId);
    groups.set(record.serverSeed, current);
  }

  const findings: SeedHygieneFinding[] = [];

  for (const [seed, recordIds] of groups.entries()) {
    if (recordIds.length < 2) {
      continue;
    }

    const evidence = createEvidence(
      'seed-reuse',
      'suspicious',
      'hygiene',
      'The same revealed server seed appears multiple times in the audited sample.',
      {
        observed: { reusedServerSeed: seed, records: recordIds.length },
        recordIds,
        relatedRoles: ['server-seed'],
      },
    );

    findings.push(createFinding(
      'seed-reuse',
      'suspicious',
      'medium',
      'Repeated revealed server seed detected across multiple records.',
      {
        affectedRecordIds: recordIds,
        confidence: 'medium',
        evidence: [evidence],
        recommendation: 'Confirm whether this reflects legitimate duplicate export rows or real seed reuse across rounds.',
      },
    ));
  }

  return findings;
}

function analyzeClientSeed(records: NormalizedRecord[]): SeedHygieneFinding[] {
  const findings: SeedHygieneFinding[] = [];

  for (const record of records) {
    if (!record.clientSeed) {
      findings.push(createFinding(
        'missing-client-seed',
        'partial',
        'low',
        'Client seed is missing.',
        {
          affectedRecordIds: [record.recordId],
          confidence: 'high',
          recommendation: 'Include the client seed to support raw recomputation.',
        },
      ));
      continue;
    }

    if (DEFAULT_CLIENT_SEEDS.has(record.clientSeed.toLowerCase())) {
      findings.push(createFinding(
        'default-client-seed',
        'partial',
        'low',
        'Client seed uses a low-entropy default-looking value.',
        {
          affectedRecordIds: [record.recordId],
          confidence: 'low',
          recommendation: 'Prefer a user-controlled client seed if the operator supports it.',
        },
      ));
    }
  }

  return findings;
}

async function auditRecord(
  record: NormalizedRecord,
  strategy: StrategyResolution,
  scope: SeedAuditInput['scope'],
): Promise<RecordAuditState> {
  const recordResult: SeedAuditRecordResult = {
    recordId: record.recordId,
    category: 'partial',
    summary: 'Record audit pending.',
    evidence: [],
    hygieneFindings: [],
  };

  const missingFormulaInputs = getMissingRoleLabels(record, strategy.metadata.fields);
  const additionalMissing = strategy.getMissingDetails?.(record) ?? [];
  missingFormulaInputs.push(...additionalMissing);

  await verifyCommitment(record, recordResult);

  if (!strategy.supported) {
    const evidence = createEvidence(
      'unsupported-formula',
      'partial',
      'formula',
      'Reusable verification support is not registered for this algorithm.',
      {
        observed: {
          algorithmId: strategy.metadata.algorithmId,
          formulaVariant: strategy.metadata.formulaVariant,
          hashFamily: strategy.metadata.hashFamily,
        },
        recordIds: [record.recordId],
      },
    );

    recordResult.evidence.push(evidence);
    recordResult.hygieneFindings.push(createFinding(
      'unsupported-formula',
      'partial',
      'medium',
      'Algorithm metadata is present, but the reusable auditor has no registered compute strategy.',
      {
        affectedRecordIds: [record.recordId],
        confidence: 'high',
        evidence: [evidence],
        recommendation: 'Wrap this operator-specific formula in a dedicated strategy before treating it as raw-verified.',
      },
    ));
  } else if (missingFormulaInputs.length > 0) {
    const evidence = createEvidence(
      'insufficient-evidence',
      'partial',
      scope === 'session-export' ? 'export' : 'sample',
      'Required formula inputs are missing for raw verification.',
      {
        observed: missingFormulaInputs,
        recordIds: [record.recordId],
      },
    );

    recordResult.evidence.push(evidence);
    recordResult.hygieneFindings.push(createFinding(
      scope === 'session-export' ? 'export-row-incomplete' : 'insufficient-evidence',
      'partial',
      'medium',
      'Record does not contain all inputs required by the declared formula.',
      {
        affectedRecordIds: [record.recordId],
        confidence: 'high',
        evidence: [evidence],
        recommendation: 'Add the missing fields before calling this record raw-verified.',
      },
    ));
  } else if (strategy.computeHash) {
    const computedHash = normalizeHash(await strategy.computeHash(record));

    if (record.reportedHash) {
      if (computedHash === record.reportedHash) {
        recordResult.evidence.push(createEvidence(
          'reported-hash-match',
          'verified',
          'formula',
          'Recomputed hash matches the supplied reported hash.',
          {
            expected: record.reportedHash,
            observed: computedHash,
            recordIds: [record.recordId],
            relatedRoles: ['reported-hash'],
          },
        ));
      } else {
        recordResult.evidence.push(createEvidence(
          'reported-hash-mismatch',
          'suspicious',
          'formula',
          'Recomputed hash does not match the supplied reported hash.',
          {
            expected: record.reportedHash,
            observed: computedHash,
            recordIds: [record.recordId],
            relatedRoles: ['reported-hash'],
          },
        ));
      }
    } else {
      const evidence = createEvidence(
        'reported-hash-missing',
        'partial',
        scope === 'session-export' ? 'export' : 'sample',
        'Raw formula inputs were present, but no reported hash was supplied for comparison.',
        {
          observed: computedHash,
          recordIds: [record.recordId],
          relatedRoles: ['reported-hash'],
        },
      );

      recordResult.evidence.push(evidence);
      recordResult.hygieneFindings.push(createFinding(
        scope === 'session-export' ? 'export-row-incomplete' : 'insufficient-evidence',
        'partial',
        'low',
        'No reported hash was supplied for a direct raw verification comparison.',
        {
          affectedRecordIds: [record.recordId],
          confidence: 'high',
          evidence: [evidence],
          recommendation: 'Provide the reported hash or result hash from the operator export.',
        },
      ));
    }
  }

  let category: SeedAuditResultCategory = 'verified';

  for (const evidence of recordResult.evidence) {
    category = compareCategory(category, evidence.category);
  }

  for (const finding of recordResult.hygieneFindings) {
    category = compareCategory(category, finding.category);
    category = compareCategory(category, severityToCategory(finding.severity));
  }

  if (recordResult.evidence.length === 0 && recordResult.hygieneFindings.length === 0) {
    category = 'partial';
  }

  recordResult.category = category;
  recordResult.summary = buildRecordSummary(recordResult);

  return {
    result: recordResult,
    formulaChecked: record.reportedHash !== undefined && recordResult.evidence.some((evidence) => evidence.code === 'reported-hash-match' || evidence.code === 'reported-hash-mismatch'),
    formulaMatched: recordResult.evidence.some((evidence) => evidence.code === 'reported-hash-match'),
    formulaMismatched: recordResult.evidence.some((evidence) => evidence.code === 'reported-hash-mismatch'),
    missingFormulaInputs,
  };
}

function buildAggregateCategory(
  scope: SeedAuditInput['scope'],
  formulaVerification: SeedAuditFormulaVerification,
  findings: SeedHygieneFinding[],
  recordCount: number,
  incompleteSamples: number,
): SeedAuditResultCategory {
  let category = formulaVerification.category;

  for (const finding of findings) {
    category = compareCategory(category, finding.category);
    category = compareCategory(category, severityToCategory(finding.severity));
  }

  if (category === 'verified' && scope === 'session-export' && recordCount < 3) {
    return 'insufficient-sample';
  }

  if (category === 'verified' && incompleteSamples > 0) {
    return 'partial';
  }

  return category;
}

function createFormulaVerification(
  recordStates: RecordAuditState[],
): SeedAuditFormulaVerification {
  const evidence = recordStates.flatMap((state) => state.result.evidence.filter((item) => item.kind === 'formula' || item.kind === 'commitment'));
  const checkedRecords = recordStates.filter((state) => state.formulaChecked).length;
  const matchedRecords = recordStates.filter((state) => state.formulaMatched).length;
  const mismatchedRecords = recordStates.filter((state) => state.formulaMismatched).length;

  let category: SeedAuditResultCategory = 'partial';

  if (checkedRecords > 0 && mismatchedRecords === 0) {
    category = 'verified';
  }

  if (mismatchedRecords > 0) {
    category = 'suspicious';
  }

  return {
    category,
    summary: checkedRecords === 0
      ? 'No direct hash comparison was possible with the supplied records.'
      : mismatchedRecords > 0
        ? 'At least one recomputed hash did not match the supplied reported hash.'
        : 'All checked records matched the supplied reported hash.',
    checkedRecords,
    matchedRecords,
    mismatchedRecords,
    evidence,
  };
}

async function auditRecords(
  scope: SeedAuditInput['scope'],
  algorithm: SeedAuditAlgorithmReference,
  context: SeedAuditContext | undefined,
  records: SeedAuditBetRecord[],
): Promise<{
  category: SeedAuditResultCategory;
  formulaVerification: SeedAuditFormulaVerification;
  proofQuality: SeedAuditProofQualityResult;
  hygieneFindings: SeedHygieneFinding[];
  evidence: SeedAuditEvidence[];
  recordResults: SeedAuditRecordResult[];
  metadata: SeedAuditBaseResult['metadata'];
}> {
  const normalizedRecords = records.map(toNormalizedRecord);
  const strategy = buildStrategy(algorithm);
  const recordStates = await Promise.all(normalizedRecords.map((record) => auditRecord(record, strategy, scope)));
  const recordResults = recordStates.map((state) => state.result);
  const findingMap = new Map<string, SeedHygieneFinding>();

  for (const finding of recordResults.flatMap((result) => result.hygieneFindings)) {
    pushIfMissing(findingMap, finding);
  }

  for (const finding of analyzeSeedReuse(normalizedRecords)) {
    pushIfMissing(findingMap, finding);
  }

  for (const finding of analyzeContinuity(normalizedRecords)) {
    pushIfMissing(findingMap, finding);
  }

  for (const finding of analyzeClientSeed(normalizedRecords)) {
    pushIfMissing(findingMap, finding);
  }

  const hygieneFindings = [...findingMap.values()];
  const formulaVerification = createFormulaVerification(recordStates);
  const incompleteSamples = recordStates.filter((state) => state.missingFormulaInputs.length > 0).length;
  const coverage = getCoverage(records.length, incompleteSamples);
  const category = buildAggregateCategory(scope, formulaVerification, hygieneFindings, records.length, incompleteSamples);
  const proofQuality = buildProofQuality(
    scope,
    records.length,
    formulaVerification.checkedRecords,
    formulaVerification.matchedRecords,
    incompleteSamples,
    coverage,
    category,
    strategy,
  );

  const evidence = [
    ...formulaVerification.evidence,
    ...hygieneFindings.flatMap((finding) => finding.evidence ?? []),
    createEvidence(
      strategy.supported ? 'algorithm-supported' : 'unsupported-formula',
      strategy.supported ? 'verified' : 'partial',
      'formula',
      strategy.supported
        ? `Reusable audit strategy resolved for ${strategy.metadata.name}.`
        : `Reusable audit strategy is not available for ${strategy.metadata.name}.`,
      {
        observed: {
          algorithmId: strategy.metadata.algorithmId,
          formulaVariant: strategy.metadata.formulaVariant,
          hashFamily: strategy.metadata.hashFamily,
        },
      },
    ),
  ];

  return {
    category,
    formulaVerification,
    proofQuality,
    hygieneFindings,
    evidence,
    recordResults,
    metadata: {
      algorithmSupport: {
        supported: strategy.supported,
        metadata: strategy.metadata,
      },
      auditedRecordCount: records.length,
      checkedRecordCount: formulaVerification.checkedRecords,
      incompleteSamples,
      contextSource: context?.source,
    },
  };
}

export class SeedHealthAuditor {
  getAlgorithmMetadata(reference: SeedAuditAlgorithmReference): SeedAuditAlgorithmMetadata {
    return buildStrategy(reference).metadata;
  }

  async audit(input: SeedAuditSingleBetVerificationInput): Promise<SeedAuditSingleBetVerificationResult>;
  async audit(input: SeedAuditSessionExportInput): Promise<SeedAuditSessionExportResult>;
  async audit(input: SeedAuditInput): Promise<SeedAuditSingleBetVerificationResult | SeedAuditSessionExportResult> {
    if (input.scope === 'single-bet') {
      return this.auditSingleBet(input);
    }

    return this.auditSessionExport(input);
  }

  async auditSingleBet(input: SeedAuditSingleBetVerificationInput): Promise<SeedAuditSingleBetVerificationResult> {
    const aggregate = await auditRecords(input.scope, input.algorithm, input.context, [input.record]);

    return {
      scope: 'single-bet',
      category: aggregate.category,
      algorithm: input.algorithm,
      context: input.context,
      formulaVerification: aggregate.formulaVerification,
      proofQuality: aggregate.proofQuality,
      hygieneFindings: aggregate.hygieneFindings,
      evidence: aggregate.evidence,
      generatedAt: Date.now(),
      metadata: aggregate.metadata,
      record: input.record,
      recordResult: aggregate.recordResults[0] ?? {
        recordId: input.record.recordId ?? input.record.betId ?? input.record.roundId,
        category: 'partial',
        summary: 'No audit result generated for this record.',
        evidence: [],
        hygieneFindings: [],
      },
    };
  }

  async auditSessionExport(input: SeedAuditSessionExportInput): Promise<SeedAuditSessionExportResult> {
    const aggregate = await auditRecords(input.scope, input.algorithm, input.context, input.records);

    return {
      scope: 'session-export',
      category: aggregate.category,
      algorithm: input.algorithm,
      context: input.context,
      formulaVerification: aggregate.formulaVerification,
      proofQuality: aggregate.proofQuality,
      hygieneFindings: aggregate.hygieneFindings,
      evidence: aggregate.evidence,
      generatedAt: Date.now(),
      metadata: aggregate.metadata,
      export: input.export,
      auditedRecords: input.records.length,
      recordResults: aggregate.recordResults,
    };
  }
}

export const seedHealthAuditor = new SeedHealthAuditor();

export async function auditSeedHealth(
  input: SeedAuditSingleBetVerificationInput,
): Promise<SeedAuditSingleBetVerificationResult>;
export async function auditSeedHealth(
  input: SeedAuditSessionExportInput,
): Promise<SeedAuditSessionExportResult>;
export async function auditSeedHealth(
  input: SeedAuditInput,
): Promise<SeedAuditSingleBetVerificationResult | SeedAuditSessionExportResult> {
  return input.scope === 'single-bet'
    ? seedHealthAuditor.auditSingleBet(input)
    : seedHealthAuditor.auditSessionExport(input);
}
