// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  dopamine: "The math isn't rigged. Your dopamine is.",
  kicker:
    'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.',
  lede:
    'Brakes for degens who still play. Slow the next spin. Block the game that rinses you. Sign a Cooldown so 3am-you cannot put the stack back on the table until the timer ends. Look up sus casinos before you deposit. We never hold your keys or take bets.',
  ctaReady: false,
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
    'We never ask for your casino password or wallet seed. You sign a Cooldown. Zip is not on this site.',
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
      body: 'Chrome on the casino tab. After a spin, the bet button is dead for two seconds. Games you name stop clicking. Zip is not on this site. Devs load unpacked dist.',
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
    body: 'Stake.us and nuts.gg only. Dashboard owns the rule. The tab presses the vault button so the hit is not sitting in playable balance. Not every casino.',
    ctaLabel: 'AUTOVAULT SETUP',
    href: '/tools/auto-vault',
  } as const,
  honesty: [
    'This is live: casino lookup, Discord tools, and Cooldown on Solana’s test network (devnet). Mainnet is later.',
    'The Chrome zip is not on this site and not in the Chrome Web Store. The two-second spin lock and game list exist in the repo as an unpacked install.',
    'Browser filters are your list. Not an operator account close. Turn the extension off and play continues.',
    'AutoVault is two casinos. We do not fake a vault button everywhere.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;
