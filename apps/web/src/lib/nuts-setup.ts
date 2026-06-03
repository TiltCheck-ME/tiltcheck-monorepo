/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */

/** @deprecated Import from `@/lib/casino-install-setup` — kept for older imports. */
export {
  CASINO_INSTALL_PRESETS,
  getCasinoPreset,
  buildCasinoTracks,
  resolveCasinoScriptUrl,
  resolveCasinoPageUrl,
  CASINO_INSTALL_SCRIPT_PATH as NUTS_SETUP_SCRIPT_PATH,
  CASINO_INSTALL_SCRIPT_PRODUCTION as NUTS_SETUP_SCRIPT_PRODUCTION,
  CASINO_INSTALL_SCRIPT_PATH as NUTS_AUTOVAULT_SCRIPT_PATH,
  CASINO_INSTALL_SCRIPT_PRODUCTION as NUTS_AUTOVAULT_SCRIPT_PRODUCTION,
} from '@/lib/casino-install-setup';

import {
  buildCasinoTracks,
  getCasinoPreset,
  resolveCasinoPageUrl,
  resolveCasinoScriptUrl,
} from '@/lib/casino-install-setup';

const nuts = getCasinoPreset('nuts');

export const NUTS_SETUP_PAGE_PATH = nuts.pagePath;
export const NUTS_SETUP_PAGE_PRODUCTION = nuts.pageProduction;
export const NUTS_CASINO_URL = nuts.casinoUrl;
export const NUTS_DM_BLURB = nuts.dmBlurb;
export const NUTS_FAQ = nuts.faq;

export function buildNutsTracks(scriptUrl: string) {
  return buildCasinoTracks(nuts, scriptUrl);
}

export { resolveCasinoScriptUrl as resolveNutsScriptUrl };

export function resolveNutsPageUrl(origin?: string): string {
  return resolveCasinoPageUrl(nuts, origin);
}
