// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09
// Keep in lockstep with scripts/pages-product-data.mjs (the GitHub Pages twin at tiltcheck.me).
// Voice: we talk shit and add friction. We do not save, shield, or guard anyone. The player does the work.
// No store-review status, roadmap, or dev notes in public copy (use <StaffOnly> for staff info).

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  dopamine: "The math isn't rigged. Your dopamine is.",
  kicker:
    'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.',
  lede:
    'Degen-built tools that talk shit and add friction. Two seconds between spins. Games you swore off stop clicking. A Touch Grass lock you sign yourself so 3am-you has to wait it out. A sus check before you deposit. You still drive. We just heckle from the passenger seat. No keys. No bets.',
  ctaReady: false,
  ctaLabel: 'ADD TO CHROME',
  ctaGatedLabel: 'EXTENSION: NOT PUBLIC YET',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  ctaGatedHint: 'Hop in the Discord to hear when it drops.',
  secondaryCtas: [
    { label: "DON'T FEED THE HOUSE", href: '/cooldown' },
    { label: 'IS THIS CASINO SUS?', href: '/casinos' },
  ] as const,
  tertiaryLink: { label: 'What the extension does', href: '/extension' } as const,
  privacy:
    'We never ask for your casino password or wallet seed. You sign your own Touch Grass lock. The extension runs in your browser, not on our servers.',
  installEyebrow: 'How it works',
  installTitle: 'Three moves. All yours.',
  installMoves: [
    {
      title: 'Look up the house',
      body: 'Receipts, not vibes: payout stories, licenses, scam reports. Check the casino before it checks your balance.',
    },
    {
      title: "Don't feed it",
      body: "Sign a Touch Grass lock. The win stays off the table until the timer runs out. You sign it. You honor it. Casinos don't have to. We never hold keys.",
    },
    {
      title: 'Slow the next click',
      body: 'The extension sits on the casino tab and gets in your way: two seconds between spins, your blocked games stop clicking, losses shown in hours of your actual job. Annoying on purpose.',
    },
  ] as const,
  vault: {
    title: 'AutoVault — skim the win on the sites we actually support.',
    body: 'Stake.us and nuts.gg. The tab presses vault so the hit is not sitting in playable balance.',
    ctaLabel: 'AUTOVAULT',
    href: '/tools/auto-vault',
  } as const,
  honesty: [
    'Live now: casino lookup, the extension tricks, and Touch Grass locks on Solana’s test network (devnet). Mainnet is later.',
    'None of this works unless you let it. Turn the extension off and play continues. That part is on you.',
    'Your game list lives in your browser. It is not a casino account ban.',
    'AutoVault is two casinos. We do not fake a vault button everywhere.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;

export const CORE_BRAKES = [
  {
    num: '01',
    title: '2-Second Spin Pause',
    body: 'After every spin the bet button naps for two seconds. Auto-spinning into a blackout gets a lot harder, and you actually see what just happened.',
    status: 'On by default',
  },
  {
    num: '02',
    title: 'Game Filters',
    body: 'Warning badges on Mines, Chicken, Plinko, and the high-edge slots. Put the ones that rinse you on your list and they stop clicking.',
    status: 'Your list',
  },
  {
    num: '03',
    title: 'Reality Wage Clock',
    body: 'Shows your losses in hours of your real job ($25/hr default). Twelve shifts torched hits different than a number on a screen.',
    status: 'Set your wage',
  },
  {
    num: '04',
    title: 'Deposit Speed Bump',
    body: 'While your Touch Grass lock is running, the cashier and deposit buttons go dead. Digging deeper now takes extra steps and a long look in the mirror.',
    status: 'During a lock',
  },
  {
    num: '05',
    title: 'Cancel-Withdrawal Blocker',
    body: 'Hides the "cancel withdrawal" button while a cashout is pending, so 3am-you has to work harder to un-cash-out.',
    status: 'While cashouts clear',
  },
  {
    num: '06',
    title: 'Profit Floor & Real Goals',
    body: 'Up big? It marks a floor. Slide toward it and you get a warning, then a 60-second pause, plus a reminder of what that money is: power bill, groceries, gas.',
    status: 'Warning, then pause',
  },
  {
    num: '07',
    title: 'Bonus Rollover & Max-Bet Alarm',
    body: "Tracks how much rollover you have left and yells if one bet breaks the casino's max-bet rule (like $5) before they void your bonus.",
    status: 'Rollover tracker',
  },
  {
    num: '08',
    title: 'Loss Speed Meter',
    body: 'How fast you are losing, in dollars per minute: Steady, Drain, Bleed, Cliff-Dive. Right there in the popup, no math required.',
    status: '$ per minute',
  },
  {
    num: '09',
    title: 'One-Click Cashout Links',
    body: 'Jumps straight to the cashier on 21+ crypto and sweeps casinos, with progress bars toward the bills you actually have.',
    status: '21+ casinos',
  },
  {
    num: '10',
    title: 'Mid-Session Auto-Vault',
    body: "Hit your goal and it moves a cut into the casino's own vault (like Stake Vault). Your account, your money. We never touch it.",
    status: 'Your vault',
  },
  {
    num: '11',
    title: "Streak & \"I'm Due\" Spotter",
    body: "Counts dead spins and heater streaks. Start raising bets because you're \"due\" and it calls you out and points at the cashier.",
    status: 'Calls you out',
  },
];
