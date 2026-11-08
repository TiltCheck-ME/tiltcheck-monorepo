// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  dopamine: "The math isn't rigged. Your dopamine is.",
  kicker:
    'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.',
  lede:
    'Brakes for degens who still play. Slow the next spin. Block the game that rinses you. Sign a Cooldown so 3am-you cannot put the stack back on the table until the timer ends. Look up sus casinos before you deposit. We never hold your keys or take bets.',
  ctaReady: false,
  ctaLabel: 'ADD TO CHROME',
  ctaGatedLabel: 'CHROME WEB STORE (PENDING REVIEW)',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  ctaGatedHint:
    'Submitted to Google Chrome Web Store. Official 1-click install link will be live here upon store approval.',
  secondaryCtas: [
    { label: "DON'T FEED THE HOUSE", href: '/cooldown' },
    { label: 'IS THIS CASINO SUS?', href: '/casinos' },
  ] as const,
  tertiaryLink: { label: 'How the Chrome brakes work', href: '/extension' } as const,
  privacy:
    'We never ask for your casino password or wallet seed. You sign a Cooldown. All extension guardrails run 100% locally in your browser.',
  installEyebrow: 'Store Submission Status',
  installTitle: 'Official Chrome Web Store Listing In Progress',
  installMoves: [
    {
      title: 'Look up the house',
      body: 'Trust scores are receipts — payout stories, licenses, scam reports — not a vibe rank.',
    },
    {
      title: "Don't feed it",
      body: 'Sign a Cooldown. The win stays off the table until the timer ends. Stronger locks only. You sign. We never hold keys. Casinos do not have to honor it. You do.',
    },
    {
      title: 'Slow the next click',
      body: 'Chrome on the casino tab. Two seconds between spins, game filters, reality wage HUD, deposit barrier, reverse-withdrawal shield, profit-lock ratchet, bonus tracker, velocity radar, one-click cashout router, and streak volatility spotter. Extension submitted for Chrome Web Store review.',
    },
  ] as const,
  hud: {
    spin: 'SPIN',
    countdown: '2s',
    chip: 'On your list',
    lock: 'Cooldown signed',
    lockMeta: 'devnet',
  } as const,
  vault: {
    title: 'AutoVault — skim the win on the sites we actually support.',
    body: 'Stake.us and nuts.gg. The tab presses vault so the hit is not sitting in playable balance.',
    ctaLabel: 'AUTOVAULT',
    href: '/tools/auto-vault',
  } as const,
  honesty: [
    'This is live: casino lookup, browser brakes, and Cooldown on Solana’s test network (devnet). Mainnet is later.',
    'The Chrome extension has been submitted to the Chrome Web Store and is pending review. Includes two seconds spin brake, game filters, reality wage HUD, deposit barrier, reverse-withdrawal shield, profit-lock ratchet, bonus tracker, velocity radar, one-click cashout router, and streak volatility spotter.',
    'Browser filters are your list. Not an operator account close. Turn the extension off and play continues.',
    'AutoVault is two casinos. We do not fake a vault button everywhere.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;

export const CORE_BRAKES = [
  {
    num: "01",
    title: "2s Spin Brake",
    body: "Locks the bet button for two seconds after every single spin. You cannot spam auto-spin into a blackout. Your balance actually catches up before you fire again.",
    status: "Enforced by default",
  },
  {
    num: "02",
    title: "Strategic Game Filters",
    body: "Puts blunt warning badges right on Mines, Chicken, Plinko, and high-house-edge slots. Shows you the mathematical trap before you drop your stack.",
    status: "Live game scan",
  },
  {
    num: "03",
    title: "Reality Wage Clock",
    body: "Translates casino chips into your actual hourly day-job wage ($25/hr default). Seeing 12 hours of labor torched hits different than numbers on a screen.",
    status: "Configurable wage",
  },
  {
    num: "04",
    title: "DOM Deposit Barrier",
    body: "Freezes cashier and deposit triggers across Stake, Roobet, and sweepstakes frontends when you are tilted or on a Cooldown. Stops you from digging the hole deeper.",
    status: "Hard stop on reload",
  },
  {
    num: "05",
    title: "Reverse-Withdrawal Shield",
    body: "Neutralizes cancel cashout and reverse payout triggers while withdrawals are pending. Locks your hit in place so you cannot feed settled wins back to the house.",
    status: "Active cashier guard",
  },
  {
    num: "06",
    title: "Profit-Lock & Reality Goals",
    body: "Trailing profit floor with 2-stage intervention (soft warning escalating to 60s hard brake) plus real-world goal toasts (power bills, groceries, gas) to remind you what credits are worth.",
    status: "Trailing floor + goal alerts",
  },
  {
    num: "07",
    title: "Bonus Playthrough & Max-Bet Traps",
    body: "Tracks promotional rollover wagering in real time with an in-page HUD and triggers alarms or bet-interception if a single stake violates operator max-bet limits (e.g. $5.00 limit).",
    status: "Live HUD + trap interceptor",
  },
  {
    num: "08",
    title: "Session Velocity Radar & Sparkline",
    body: "Calculates rolling loss velocity ($/min) with status bands (Steady, Drain, Bleed, Cliff-Dive) and displays vector momentum sparklines directly in the popup.",
    status: "Rolling velocity telemetry",
  },
  {
    num: "09",
    title: "One-Click Cashout Router & Goal Bars",
    body: "Deep-links straight to native cashier and redemption portals across 21+ crypto and sweeps casinos, backed by visual progress bars towards tangible bills and life goals.",
    status: "21+ operator deep links",
  },
  {
    num: "10",
    title: "In-Session Auto-Vaulting",
    body: "Executes non-custodial in-casino safe deposits (e.g. Stake Vault) directly from your browser session when cashout goals and profit ratchets are unlocked.",
    status: "Non-custodial safe deposits",
  },
  {
    num: "11",
    title: "Session Win-Streak & Volatility Spotter",
    body: "Monitors dead-spin runs, personal hit rates, and consecutive heater streaks in real time. Flags Gambler's Fallacy ('I'm Due') stake escalations with immediate Cashier exit ramps before tilt sets in.",
    status: "Live streak & fallacy telemetry",
  },
];