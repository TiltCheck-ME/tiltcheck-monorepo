// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  kicker: [
    'Non-custodial intelligence for degens who hate nanny tools.',
    'New: Cooldown — on-chain self-exclusion on Solana devnet. Your wallet, your lock.',
  ],
  lede:
    'TiltCheck tracks tilt signals, session behavior, and sketch casino math — then gives you brakes you actually control. Cooldown is on-chain self-exclusion: lock your wallet from games, categories, or everything. The Chrome extension watches live sessions and fires Touch Grass when clicking turns into autopilot. Trust Engine scores casinos from public RTP, compliance, and payout evidence. No custody. No passwords.',
  ctaLabel: 'DOWNLOAD THE ZIP',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  secondaryCtas: [
    { label: 'SET A COOLDOWN LOCK', href: '/cooldown' },
    { label: 'EXTENSION DETAILS', href: '/extension' },
  ] as const,
  privacy:
    'Does not read your wallet seed or casino password. Cooldown is you signing an on-chain lock — we never hold keys.',
  installSteps: [
    'Download the zip. Extract it to a folder.',
    'Open chrome://extensions. Turn on Developer mode. Click Load unpacked. Select that folder.',
    'Open a supported casino and play. Frantic clicking triggers Touch Grass — full tab lock for about two minutes.',
  ],
  installNote:
    'Core extension runs guest. Link Discord later for dashboard vault rules, buddies, and sync.',
  cards: [
    {
      step: '01',
      title: 'Cooldown (on-chain)',
      body: 'Self-exclusion that cannot be weaseled off in a settings menu. Lock all play, a category, or one game. Stronger locks only — expires on-chain when the timer hits. Solana devnet today.',
    },
    {
      step: '02',
      title: 'Session intel',
      body: 'Chrome extension monitors click pacing and tilt patterns on supported casino tabs. Touch Grass covers the game when you start mashing like you are rinsed.',
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
    'Extension: no Chrome Web Store listing yet. Sideload the zip.',
    'Trust scores blend live rollup feeds with curated baselines when the API is down.',
    'JustTheTip tips USDC on Solana with tilt-aware velocity guards — optional, separate flow.',
    'Discord bot exposes tilt checks and tip commands for server-side degens.',
    'Supported extension tabs include Stake, Stake.us, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, and CSGOEmpire.',
    'SusLink can bounce critical scam URLs to a warning page when the API is up.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;
