// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  dopamine: "The math isn't rigged. Your dopamine is.",
  kicker:
    'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.',
  lede:
    'Brakes for degens who still play. Slow the next spin. Block the game that rinses you. Sign a Cooldown so 3am-you cannot put the stack back on the table until the timer ends. Look up sus casinos before you deposit. We never hold your keys or take bets.',
  ctaReady: true,
  ctaLabel: 'DOWNLOAD THE ZIP',
  ctaGatedLabel: 'CHROME ZIP NOT ON THIS SITE',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  ctaGatedHint:
    'The public zip is not up yet. Wallet lock and casino lookup work now. If you are building the extension, load unpacked dist from the repo.',
  secondaryCtas: [
    { label: "DON'T FEED THE HOUSE", href: '/cooldown' },
    { label: 'IS THIS CASINO SUS?', href: '/casinos' },
  ] as const,
  tertiaryLink: { label: 'How the Chrome brakes work', href: '/extension' } as const,
  privacy:
    'We never ask for your casino password or wallet seed. You sign a Cooldown. Download the extension zip directly or build from source.',
  installEyebrow: 'How it works',
  installTitle: 'Three moves. None of them are a lecture.',
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
      body: 'Chrome on the casino tab. After a spin, the bet button is dead for two seconds. Games you name stop clicking. Wage-hour HUD tracks torched shifts. Deposit barrier blocks re-ups. Sideload zip is live.',
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
    'This is live: casino lookup, Discord tools, and Cooldown on Solana’s test network (devnet). Mainnet is later.',
    'The Chrome extension is a direct zip download on this site (sideload via Developer mode; Web Store listing later). Includes 2s spin brake, game filters, reality wage HUD, and deposit barrier.',
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
];
