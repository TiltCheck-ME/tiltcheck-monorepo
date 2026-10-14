// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  kicker: [
    'The house banks on your tilt.',
    'Harm reduction made for degens, by degens. Tested tools that actually work — not a lecture from your mom.',
    'Cooldown v2: sign a Solana devnet lock. No cancel. No keys held. Wen mainnet? soon.',
  ],
  lede:
    'Cooldown is on-chain self-exclusion — you sign, we never hold keys. Chrome Core (zip not public yet) is a two-second spin lock on supported casino tabs. Fullscreen Touch Grass (~2 min) is Pro only. Trust Engine scores casinos from public RTP, compliance, and payout evidence. No custody. No passwords.',
  ctaReady: false,
  ctaLabel: 'DOWNLOAD THE ZIP',
  ctaGatedLabel: 'ZIP DROPS SOON™',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  ctaGatedHint:
    'Disabled because the zip is not public yet. No half-baked sideload. Cooldown is the lock that ships today.',
  secondaryCtas: [
    { label: 'SET A COOLDOWN LOCK', href: '/cooldown' },
    { label: 'EXTENSION DETAILS', href: '/extension' },
  ] as const,
  privacy:
    'Does not read your wallet keys or casino password. Cooldown is you signing an on-chain lock — we never hold keys.',
  installSteps: [
    'Zip is not public yet. soon™ — do not hunt a half-baked sideload.',
    'When it drops: chrome://extensions → Developer mode → Load unpacked.',
    'Core will lock the spin button for two seconds on supported tabs. Fullscreen Touch Grass stays Pro.',
  ],
  installNote:
    'Core will run guest when the zip drops. Cooldown is the lock that ships today. Discord later for dashboard vault rules, buddies, and sync.',
  cards: [
    {
      step: '01',
      title: 'Cooldown (on-chain)',
      body: 'Self-exclusion that cannot be weaseled off in a settings menu. Lock all play, a category, or one game. Stronger locks only — expires on-chain when the timer hits. Solana devnet today.',
    },
    {
      step: '02',
      title: 'Session intel',
      body: 'Chrome Core will lock the spin button for two seconds on supported tabs once the zip is public. Fullscreen Touch Grass (~2 min cover) is Pro monolith only.',
    },
    {
      step: '03',
      title: 'Trust receipts',
      body: 'Trust Engine grades operators from public data — RTP drift, compliance filings, payout evidence, scam reports. Bonus tracker and intel tools link back to those scores.',
    },
  ],
  mock: {
    status: 'Live stack',
    signal: 'Cooldown + extension + trust intel',
    footer: 'Self-sovereign brakes — not a casino nanny hotline.',
    chip: 'Non-custodial. You sign locks. We read public data.',
  },
  honesty: [
    'Cooldown ships on Solana devnet — not mainnet custody theater.',
    'Extension zip is not public yet. Core is a 2s spin lock when it drops. Fullscreen Touch Grass is Pro only. No Chrome Web Store.',
    'Trust scores blend live rollup feeds with curated baselines when the API is down.',
    'JustTheTip tips USDC on Solana with tilt-aware velocity guards — optional, separate flow.',
    'Discord bot exposes tilt checks and tip commands for server-side degens.',
    'Supported extension tabs include Stake, Stake.us, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, and CSGOEmpire.',
    'SusLink can bounce critical scam URLs to a warning page when the API is up.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;
