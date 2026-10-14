// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  kicker: [
    'The house banks on your tilt.',
    'Harm reduction made for degens, by degens. Tested tools — not a lecture from your mom.',
    'Cooldown v2: you sign. No keys. Wen mainnet? soon.',
  ],
  ctaReady: false,
  ctaLabel: 'DOWNLOAD THE ZIP',
  ctaGatedLabel: 'ZIP DROPS SOON™',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  ctaGatedHint: 'Zip is not public yet. Cooldown is the lock that ships today.',
  secondaryCtas: [
    { label: 'SET A COOLDOWN LOCK', href: '/cooldown' },
    { label: 'EXTENSION DETAILS', href: '/extension' },
  ] as const,
  privacy: 'No wallet keys. No casino passwords.',
  installSteps: [
    'Zip is not public. soon™. Do not hunt a sideload.',
    'When it drops: Load unpacked in chrome://extensions.',
    'Core is a 2s spin lock. Touch Grass is Pro.',
  ],
  cards: [
    { step: '01', title: 'Cooldown', body: 'On-chain lock you sign. No cancel in v1. Devnet.' },
    { step: '02', title: 'Session intel', body: '2s spin lock on supported tabs when the zip drops. Touch Grass is Pro.' },
    { step: '03', title: 'Trust receipts', body: 'Public RTP, filings, payout evidence. Not a casino-sponsored grade.' },
  ],
  honesty: [
    'Cooldown is Solana devnet. Not mainnet.',
    'Zip is not public. Core is 2s. Touch Grass is Pro. No Chrome Web Store.',
    'Trust scores use live feeds when the API is up. Curated baselines when it is not.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;

export const EXTENSION_PAGE = {
  eyebrow: 'Browser extension // Core',
  title: 'Session intel in the tab. Two-second spin lock.',
  beats: [
    { title: 'Watches the tab', body: 'Read-only signals on supported casino tabs. Click pacing, not wallet keys.' },
    { title: '2s spin lock', body: 'Core locks the spin button for two seconds. A click during the lock does not spin.' },
    { title: 'Not the Pro HUD', body: 'Fullscreen Touch Grass is Pro. This zip does not turn that on.' },
  ],
  honesty: [
    'Not on the Chrome Web Store.',
    'Zip is not public yet — soon™.',
    'No wallet keys. No casino passwords.',
  ],
} as const;
