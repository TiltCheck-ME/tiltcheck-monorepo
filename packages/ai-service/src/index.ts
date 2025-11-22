/**
 * AI Service Package
 * Natural language understanding and smart assistance
 */

export * from './nlu.js';
export * from './smart-help.js';
export * from './setup-wizard.js';

// Re-export common types
export type {
  Intent,
  Entities,
  NLUResult
} from './nlu.js';

export type {
  HelpContext,
  HelpResponse
} from './smart-help.js';

export type {
  SetupIntent,
  SetupAction
} from './setup-wizard.js';

console.log('[AI Service] Module loaded');
