/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */

import {
  AUTOVAULT_SHARE_SCRIPT_PATH,
  AUTOVAULT_SHARE_SCRIPT_PRODUCTION,
} from '@/lib/share-qr';

export type CasinoSiteId = 'nuts' | 'stake';

export const CASINO_INSTALL_SCRIPT_PATH = AUTOVAULT_SHARE_SCRIPT_PATH;
export const CASINO_INSTALL_SCRIPT_PRODUCTION = AUTOVAULT_SHARE_SCRIPT_PRODUCTION;

const FIREFOX_PLAY =
  'https://play.google.com/store/apps/details?id=org.mozilla.firefox';
const EDGE_PLAY =
  'https://play.google.com/store/apps/details?id=com.microsoft.emmx';
const VIOLENTMONKEY_AMO =
  'https://addons.mozilla.org/android/addon/violentmonkey/';
const TAMPERMONKEY_EDGE =
  'https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd';

export type CasinoInstallStep = {
  order: number;
  title: string;
  body: string;
  actionLabel: string;
  url: string;
  hint?: string;
};

export type CasinoBrowserTrack = {
  id: 'firefox' | 'edge';
  label: string;
  tagline: string;
  recommended?: boolean;
  steps: CasinoInstallStep[];
};

export type CasinoFaqItem = {
  q: string;
  a: string;
};

export type CasinoInstallPreset = {
  id: CasinoSiteId;
  eyebrow: string;
  headline: string;
  subtitle: string;
  casinoName: string;
  casinoUrl: string;
  pagePath: string;
  pageProduction: string;
  dmBlurb: string;
  faq: CasinoFaqItem[];
};

export const CASINO_INSTALL_PRESETS: Record<CasinoSiteId, CasinoInstallPreset> = {
  nuts: {
    id: 'nuts',
    eyebrow: 'nuts.gg only',
    headline: 'Auto-lock wins to vault',
    subtitle:
      'On a heater? This skims part of each win to vault so you do not rinse it all back. Free. You flip it ON or OFF anytime.',
    casinoName: 'nuts.gg',
    casinoUrl: 'https://nuts.gg',
    pagePath: '/nuts',
    pageProduction: 'https://tiltcheck.me/nuts',
    dmBlurb: `Auto-locks part of your wins to vault on nuts so you don't rinse the whole heater. Free, 2-minute setup:
https://tiltcheck.me/nuts`,
    faq: [
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
        a: 'Free. Optional tip on vault withdraw is off by default — enable it in Advanced if you want.',
      },
      {
        q: 'What does it actually do?',
        a: 'When you are winning, it moves a slice of each win to vault before you can degen it back. Panel also tracks session wager and P/L.',
      },
    ],
  },
  stake: {
    id: 'stake',
    eyebrow: 'Stake.us only',
    headline: 'Auto-lock wins to vault',
    subtitle:
      'Heater on Stake.us? Skims part of each win to vault (SC or GC) before you give it back. Free. Big ON / OFF toggle.',
    casinoName: 'Stake.us',
    casinoUrl: 'https://stake.us',
    pagePath: '/stake',
    pageProduction: 'https://tiltcheck.me/stake',
    dmBlurb: `Auto-locks part of your wins to vault on Stake.us so you don't rinse the heater. Free, 2-minute setup:
https://tiltcheck.me/stake`,
    faq: [
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
        a: 'Free. No tips, no upsell — just auto-vault and session stats in the panel.',
      },
      {
        q: 'SC and GC?',
        a: 'Same script detects which balance you are playing. Vault skim follows your active currency.',
      },
    ],
  },
};

function scriptStep(preset: CasinoInstallPreset, scriptUrl: string): CasinoInstallStep {
  return {
    order: 3,
    title: 'Turn on auto-vault',
    body: `Tap the button below. When Firefox or Edge asks, tap Install or Confirm. That adds auto-vault to ${preset.casinoName}.`,
    actionLabel: 'Install auto-vault',
    url: scriptUrl,
    hint: 'You must finish step 2 first or Install will not work.',
  };
}

function playStep(preset: CasinoInstallPreset): CasinoInstallStep {
  return {
    order: 4,
    title: `Open ${preset.casinoName} and flip ON`,
    body: `Log in on ${preset.casinoName}. You will see a big AUTOVAULT ON / OFF button. Tap ON. Wins skim to vault and session wager + P/L show in the panel.`,
    actionLabel: `Open ${preset.casinoName}`,
    url: preset.casinoUrl,
  };
}

export function buildCasinoTracks(
  preset: CasinoInstallPreset,
  scriptUrl: string
): CasinoBrowserTrack[] {
  const helperBody = (browser: 'Firefox' | 'Edge') =>
    browser === 'Firefox'
      ? `Open Firefox, tap the button below, then tap Add to Firefox. Violentmonkey is the free helper that lets auto-vault run on ${preset.casinoName}.`
      : `Open Edge, tap below, install Tampermonkey, and turn it on in Extensions if asked.`;

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
          body: helperBody('Firefox'),
          actionLabel: 'Add Violentmonkey',
          url: VIOLENTMONKEY_AMO,
        },
        scriptStep(preset, scriptUrl),
        playStep(preset),
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
          body: helperBody('Edge'),
          actionLabel: 'Add Tampermonkey',
          url: TAMPERMONKEY_EDGE,
        },
        scriptStep(preset, scriptUrl),
        playStep(preset),
      ],
    },
  ];
}

export function resolveCasinoScriptUrl(origin?: string): string {
  if (!origin) return CASINO_INSTALL_SCRIPT_PRODUCTION;
  const base = origin.replace(/\/$/, '');
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    /^https?:\/\/192\.168\.|^https?:\/\/10\.|^https?:\/\/172\.(1[6-9]|2\d|3[01])\./.test(origin)
  ) {
    return `${base}${CASINO_INSTALL_SCRIPT_PATH}`;
  }
  return CASINO_INSTALL_SCRIPT_PRODUCTION;
}

export function resolveCasinoPageUrl(preset: CasinoInstallPreset, origin?: string): string {
  if (!origin) return preset.pageProduction;
  const base = origin.replace(/\/$/, '');
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    /^https?:\/\/192\.168\.|^https?:\/\/10\.|^https?:\/\/172\.(1[6-9]|2\d|3[01])\./.test(origin)
  ) {
    return `${base}${preset.pagePath}`;
  }
  return preset.pageProduction;
}

export function getCasinoPreset(siteId: CasinoSiteId): CasinoInstallPreset {
  return CASINO_INSTALL_PRESETS[siteId];
}
