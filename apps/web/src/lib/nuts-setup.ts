/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */

import {
  AUTOVAULT_SHARE_SCRIPT_PATH,
  AUTOVAULT_SHARE_SCRIPT_PRODUCTION,
} from '@/lib/share-qr';

/** Share Edition — mobile ON/OFF UI + session wager on nuts.gg (and Stake.us). */
export const NUTS_SETUP_SCRIPT_PATH = AUTOVAULT_SHARE_SCRIPT_PATH;
export const NUTS_SETUP_SCRIPT_PRODUCTION = AUTOVAULT_SHARE_SCRIPT_PRODUCTION;

/** @deprecated Use NUTS_SETUP_SCRIPT_* — kept for any stale imports. */
export const NUTS_AUTOVAULT_SCRIPT_PATH = NUTS_SETUP_SCRIPT_PATH;
export const NUTS_AUTOVAULT_SCRIPT_PRODUCTION = NUTS_SETUP_SCRIPT_PRODUCTION;

export const NUTS_SETUP_PAGE_PATH = '/nuts';
export const NUTS_SETUP_PAGE_PRODUCTION = 'https://tiltcheck.me/nuts';
export const NUTS_CASINO_URL = 'https://nuts.gg';

const FIREFOX_PLAY =
  'https://play.google.com/store/apps/details?id=org.mozilla.firefox';
const EDGE_PLAY =
  'https://play.google.com/store/apps/details?id=com.microsoft.emmx';
const VIOLENTMONKEY_AMO =
  'https://addons.mozilla.org/android/addon/violentmonkey/';
const TAMPERMONKEY_EDGE =
  'https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd';

export type NutsSetupStep = {
  order: number;
  title: string;
  body: string;
  actionLabel: string;
  url: string;
  hint?: string;
};

export type NutsBrowserTrack = {
  id: 'firefox' | 'edge';
  label: string;
  tagline: string;
  recommended?: boolean;
  steps: NutsSetupStep[];
};

export type NutsFaqItem = {
  q: string;
  a: string;
};

export const NUTS_DM_BLURB = `Auto-locks part of your wins to vault on nuts so you don't rinse the whole heater. Free, 2-minute setup:
${NUTS_SETUP_PAGE_PRODUCTION}`;

function scriptStep(scriptUrl: string): NutsSetupStep {
  return {
    order: 3,
    title: 'Turn on auto-vault',
    body: 'Tap the button below. When Firefox or Edge asks, tap Install or Confirm. That adds the auto-vault to nuts.',
    actionLabel: 'Install auto-vault',
    url: scriptUrl,
    hint: 'You must finish step 2 first or Install will not work.',
  };
}

function playStep(scriptUrl: string): NutsSetupStep {
  return {
    order: 4,
    title: 'Open nuts and flip ON',
    body: 'Log in on nuts.gg. You will see a big AUTOVAULT ON / OFF button. Tap ON. It skims wins to vault and shows session wager + P/L in the panel.',
    actionLabel: 'Open nuts.gg',
    url: NUTS_CASINO_URL,
  };
}

export function buildNutsTracks(scriptUrl: string): NutsBrowserTrack[] {
  return [
    {
      id: 'firefox',
      label: 'Firefox',
      tagline: 'Easiest on Android. Get Firefox, add one free helper, done.',
      recommended: true,
      steps: [
        {
          order: 1,
          title: 'Get Firefox on your phone',
          body: 'Regular Chrome on Android cannot run this. Firefox can.',
          actionLabel: 'Get Firefox (Play Store)',
          url: FIREFOX_PLAY,
        },
        {
          order: 2,
          title: 'Add Violentmonkey',
          body: 'Open Firefox, tap the button below, then tap Add to Firefox. Violentmonkey is the free helper that lets auto-vault run on nuts.',
          actionLabel: 'Add Violentmonkey',
          url: VIOLENTMONKEY_AMO,
        },
        scriptStep(scriptUrl),
        playStep(scriptUrl),
      ],
    },
    {
      id: 'edge',
      label: 'Microsoft Edge',
      tagline: 'Works if you already use Edge instead of Firefox.',
      steps: [
        {
          order: 1,
          title: 'Get Edge on your phone',
          body: 'Same idea as Firefox — Edge supports the helper app Chrome does not.',
          actionLabel: 'Get Edge (Play Store)',
          url: EDGE_PLAY,
        },
        {
          order: 2,
          title: 'Add Tampermonkey',
          body: 'Open Edge, tap below, install Tampermonkey, and turn it on in Extensions if asked.',
          actionLabel: 'Add Tampermonkey',
          url: TAMPERMONKEY_EDGE,
        },
        scriptStep(scriptUrl),
        playStep(scriptUrl),
      ],
    },
  ];
}

export const NUTS_FAQ: NutsFaqItem[] = [
  {
    q: 'Does this take my login or money?',
    a: 'No. It runs in your browser and vaults the same way you would manually. Non-custodial — we never see your password.',
  },
  {
    q: 'Why not Chrome?',
    a: 'Google blocked helper apps like this on Android Chrome. Firefox or Edge only.',
  },
  {
    q: 'Can I turn it off?',
    a: 'Yes. Big OFF button anytime. It stays off until you turn it back on.',
  },
  {
    q: 'Does it cost anything?',
    a: 'Free. Optional tip on vault withdraw is off unless you turn it on in settings.',
  },
  {
    q: 'What does it actually do?',
    a: 'When you are winning, it moves a slice of each win to vault before you can degen it back. Panel also tracks session wager and P/L.',
  },
];

export function resolveNutsScriptUrl(origin?: string): string {
  if (!origin) return NUTS_SETUP_SCRIPT_PRODUCTION;
  const base = origin.replace(/\/$/, '');
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    /^https?:\/\/192\.168\.|^https?:\/\/10\.|^https?:\/\/172\.(1[6-9]|2\d|3[01])\./.test(origin)
  ) {
    return `${base}${NUTS_SETUP_SCRIPT_PATH}`;
  }
  return NUTS_SETUP_SCRIPT_PRODUCTION;
}

export function resolveNutsPageUrl(origin?: string): string {
  if (!origin) return NUTS_SETUP_PAGE_PRODUCTION;
  const base = origin.replace(/\/$/, '');
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    /^https?:\/\/192\.168\.|^https?:\/\/10\.|^https?:\/\/172\.(1[6-9]|2\d|3[01])\./.test(origin)
  ) {
    return `${base}${NUTS_SETUP_PAGE_PATH}`;
  }
  return NUTS_SETUP_PAGE_PRODUCTION;
}
