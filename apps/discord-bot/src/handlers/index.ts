/**
 * Handler Index
 * 
 * Exports all handlers.
 */

export { CommandHandler } from './commands.js';
export { EventHandler } from './events.js';
export { registerDMHandler, handleDirectMessage } from './dm-handler.js';
export { TrustAlertsHandler } from './trust-alerts-handler.js';
export { 
  checkAndOnboard, 
  needsOnboarding, 
  markOnboarded, 
  sendWelcomeDM,
  handleOnboardingInteraction,
  getUserPreferences,
  saveUserPreferences,
} from './onboarding.js';
export {
  initializeTiltEventsHandler,
  getUserTiltHistory,
  getUserTiltStats,
} from './tilt-events-handler.js';
export { initializeCollectClock } from './collectclock-handler.js';
