// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09

export const HOME_LAUNCH = {
  h1: ['House always wins?', 'FUCK THAT.'],
  kicker: ["The math isn't rigged. Your dopamine is.", 'The house banks on your tilt.'],
  lede:
    'Download the zip and load it in Chrome. Open a casino you already use. Every spin locks the spin button for two seconds. The countdown sits on the button. Click it early and the click does not go through.',
  ctaLabel: 'DOWNLOAD THE ZIP',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  privacy: 'Does not read your wallet or your password. No account needed. You install the zip yourself.',
  installSteps: [
    'Download the zip. Extract it to a folder.',
    'Open chrome://extensions. Turn on Developer mode. Click Load unpacked. Select that folder.',
    'Open a supported casino and play. Every spin locks the button for two seconds.',
  ],
  installNote: 'It works without an account. Discord is only for saving rules later.',
  cards: [
    {
      step: '01',
      title: 'Locks the spin',
      body: 'Every spin goes through, then the spin button locks for two seconds. Other clicks on the page do not start the lock.',
    },
    {
      step: '02',
      title: 'Swallows the mash',
      body: 'A click while the button is locked does not spin and does not add time. The line is: No cap, the balance is still catching that last spin.',
    },
    {
      step: '03',
      title: 'Gives the button back',
      body: 'At zero the button works again. The next spin starts a fresh two seconds.',
    },
  ],
  mock: {
    status: 'Button locked',
    signal: '2s',
    footer: 'Balance still catching up',
    chip: 'Does not touch your wallet',
  },
  honesty: [
    'Works with no account.',
    'Does not read your password. Does not move money.',
    'Not in the Chrome Web Store. You load the zip yourself.',
    'Runs on Stake, Stake.us, Roobet, BC.Game, Rollbit, Shuffle, Gamdom, and CSGOEmpire.',
    'Some casino links get checked before they open. If the check flags one as a serious scam, that tab goes to a warning page instead. If the check is down, the link opens normally.',
  ],
  footerDisclaimer:
    'TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call 1-800-GAMBLER or visit NCPG.org.',
} as const;
