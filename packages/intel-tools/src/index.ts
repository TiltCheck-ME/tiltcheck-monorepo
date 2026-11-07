/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-06 */

export type {
  CasinoRecord,
  CasinoSummary,
  DataSource,
  DomainScanResult,
  IntelToolsConfig,
  ListFilters,
  LiveTrustScore,
} from './types.js';

export type {
  OperatorFactStatus,
  OperatorFactRecord,
  OperatorFactsFile,
  RedemptionFact,
  VipCurrencyRule,
  WelcomeBonusFact,
} from './operator-facts-types.js';

export {
  GRADE_SCORE,
  mapRawCasinos,
  normalizeQuery,
  slugifyCasinoName,
  type RawCasino,
} from './grades.js';
export {
  applyListFilters,
  extractCasinoNameCandidate,
  extractDomainCandidate,
  findCasinoByName,
  parseListFiltersFromText,
} from './filters.js';
export {
  filterLiveOperatorFacts,
  STALE_AFTER_DAYS,
  getRedemptionAnswer,
  getVipCurrencyAnswer,
  getWelcomeBonusAnswer,
  isFactStale,
  listAvailableFactTypesAnswer,
  resolveOperatorFacts,
} from './operator-facts.js';
export type {
  FactAnswer,
  OperatorFactType,
  VipCurrencyAnswer,
} from './operator-facts.js';
export {
  calculateCasinoTrust,
  calculateCommunityReputation,
  calculateFairnessTransparency,
  calculateFinancialPayouts,
  calculateOperationalSupport,
  calculatePromotionalHonesty,
  gradeFromScore,
  riskFromScore,
} from './calculator.js';
export type {
  CasinoPillars,
  CasinoTrustCalculation,
  CasinoTrustInput,
  PillarBreakdownItem,
} from './calculator.js';
export { IntelTools, createIntelTools, toCasinoSummary } from './tools.js';
