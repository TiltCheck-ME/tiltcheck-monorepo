/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */

export type {
  Citation,
  IntelAgentContext,
  IntelBlock,
  IntelChatResponse,
  ProcessIntelMessageInput,
  RoutedIntent,
} from './types.js';

export type { RedemptionAnswerInput } from './block-builder.js';
export { routeIntelIntent } from './intent-router.js';
export {
  buildListBlocks,
  buildLookupBlocks,
  buildOperatorFactAmbiguousBlocks,
  buildOperatorFactHitBlocks,
  buildOperatorFactMissBlocks,
  buildOperatorFactNoneBlocks,
  buildOperatorFactTypeBlocks,
  buildPayoutRankingBlocks,
  buildRedemptionAnswerBlocks,
  formatAsOfDate,
  formatPayoutBenchmarkLine,
  PAYOUT_BENCHMARK_METHOD_TEXT,
  PAYOUT_BENCHMARK_SCOPE_TEXT,
  resolveDataSource,
  summarizeCasinoVerdict,
} from './block-builder.js';
export {
  createDefaultIntelAgent,
  createIntelAgent,
  type IntelAgent,
  type IntelAgentOptions,
} from './process-message.js';
