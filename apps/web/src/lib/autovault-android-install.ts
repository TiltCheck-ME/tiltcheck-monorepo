/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import {
  AUTOVAULT_SHARE_PAGE_PRODUCTION,
  AUTOVAULT_SHARE_SCRIPT_PRODUCTION,
  buildShareQrImageUrl,
} from '@/lib/share-qr';

export const AUTOVAULT_ANDROID_PAGE_PATH = '/tools/auto-vault/android';
export const AUTOVAULT_ANDROID_PAGE_PRODUCTION = `https://tiltcheck.me${AUTOVAULT_ANDROID_PAGE_PATH}`;
export const AUTOVAULT_ANDROID_STATIC_PATH = '/userscripts/android-install.html';

export type AndroidInstallStep = {
  id: string;
  order: number;
  title: string;
  body: string;
  url: string;
  urlLabel: string;
  qrSize?: number;
  optional?: boolean;
};

export type AndroidInstallTrack = {
  id: 'firefox' | 'edge';
  label: string;
  recommended?: boolean;
  summary: string;
  steps: AndroidInstallStep[];
};

const FIREFOX_PLAY =
  'https://play.google.com/store/apps/details?id=org.mozilla.firefox';
const EDGE_PLAY =
  'https://play.google.com/store/apps/details?id=com.microsoft.emmx';
const VIOLENTMONKEY_AMO =
  'https://addons.mozilla.org/android/addon/violentmonkey/';
const TAMPERMONKEY_EDGE =
  'https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd';

function scriptAndCasinoSteps(): AndroidInstallStep[] {
  return [
    {
      id: 'autovault-script',
      order: 3,
      title: 'Install AutoVault Share Edition',
      body:
        'Open this link in the same browser where you installed the userscript manager. Tap Install when prompted. One script covers Stake.us and nuts.gg.',
      url: AUTOVAULT_SHARE_SCRIPT_PRODUCTION,
      urlLabel: 'Share Edition userscript',
      qrSize: 240,
    },
    {
      id: 'stake',
      order: 4,
      title: 'Open Stake.us (optional)',
      body: 'Log in on stake.us in that browser. Complete the one-time AutoVault setup, then use the big AUTOVAULT toggle.',
      url: 'https://stake.us',
      urlLabel: 'stake.us',
      qrSize: 200,
      optional: true,
    },
    {
      id: 'nuts',
      order: 5,
      title: 'Open nuts.gg (optional)',
      body: 'Same flow on nuts.gg. WebSocket vault. Auto-tip stays off unless you enable it in Advanced.',
      url: 'https://nuts.gg',
      urlLabel: 'nuts.gg',
      qrSize: 200,
      optional: true,
    },
    {
      id: 'guide',
      order: 6,
      title: 'Full install page (bookmark this)',
      body: 'Send this page to anyone. Same steps, copy links, and QRs — no localhost required.',
      url: AUTOVAULT_ANDROID_PAGE_PRODUCTION,
      urlLabel: 'tiltcheck.me android install',
      qrSize: 200,
    },
  ];
}

export const ANDROID_INSTALL_TRACKS: AndroidInstallTrack[] = [
  {
    id: 'firefox',
    label: 'Firefox + Violentmonkey',
    recommended: true,
    summary: 'Play Store browser + official add-on. Best compatibility for userscripts on Android.',
    steps: [
      {
        id: 'firefox-app',
        order: 1,
        title: 'Install Firefox for Android',
        body: 'Get Firefox from Google Play. No sideloading required.',
        url: FIREFOX_PLAY,
        urlLabel: 'Firefox on Google Play',
        qrSize: 220,
      },
      {
        id: 'violentmonkey',
        order: 2,
        title: 'Add Violentmonkey to Firefox',
        body: 'Open Firefox, scan this QR, tap Add to Firefox. Restart Firefox once if prompted.',
        url: VIOLENTMONKEY_AMO,
        urlLabel: 'Violentmonkey on Firefox Add-ons',
        qrSize: 220,
      },
      ...scriptAndCasinoSteps(),
    ],
  },
  {
    id: 'edge',
    label: 'Microsoft Edge + Tampermonkey',
    summary: 'Edge supports Tampermonkey as an extension on Android. Good if you already use Edge.',
    steps: [
      {
        id: 'edge-app',
        order: 1,
        title: 'Install Microsoft Edge',
        body: 'Get Edge from Google Play.',
        url: EDGE_PLAY,
        urlLabel: 'Edge on Google Play',
        qrSize: 220,
      },
      {
        id: 'tampermonkey-edge',
        order: 2,
        title: 'Enable Tampermonkey in Edge',
        body: 'In Edge: menu → Extensions → Get extensions → install Tampermonkey → enable it.',
        url: TAMPERMONKEY_EDGE,
        urlLabel: 'Tampermonkey on Edge Add-ons',
        qrSize: 220,
      },
      ...scriptAndCasinoSteps(),
    ],
  },
];

export function qrForUrl(url: string, size = 220): string {
  return buildShareQrImageUrl(url, size);
}

export function resolveAndroidPageUrl(origin?: string): string {
  if (!origin) return AUTOVAULT_ANDROID_PAGE_PRODUCTION;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return `${origin.replace(/\/$/, '')}${AUTOVAULT_ANDROID_PAGE_PATH}`;
  }
  if (/^https?:\/\/192\.168\.|^https?:\/\/10\.|^https?:\/\/172\.(1[6-9]|2\d|3[01])\./.test(origin)) {
    return `${origin.replace(/\/$/, '')}${AUTOVAULT_ANDROID_PAGE_PATH}`;
  }
  return AUTOVAULT_ANDROID_PAGE_PRODUCTION;
}
