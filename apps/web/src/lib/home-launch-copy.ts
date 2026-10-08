// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04

export const HOME_LAUNCH = {
  h1: ['STOP GIVING', 'WINS BACK.'],
  kicker: ["The math isn't rigged. Your dopamine is.", 'The house banks on your tilt.'],
  lede:
    'Download the zip and load it in Chrome. Open a casino you already use. TiltCheck counts clicks on that tab. When the clicking gets frantic, it covers the whole tab for about two minutes so you cannot keep betting. That pause is called Touch Grass. When the timer ends, the site comes back.',
  ctaLabel: 'DOWNLOAD THE ZIP',
  ctaHref: '/downloads/tiltcheck-extension.zip',
  privacy: 'Does not read your wallet or your password. No account needed. You install the zip yourself.',
  installSteps: [
    'Download the zip. Extract it to a folder.',
    'Open chrome://extensions. Turn on Developer mode. Click Load unpacked. Select that folder.',
    'Open a supported casino and play. If the clicking gets frantic, the tab gets covered for about two minutes.',
  ],
  installNote: 'It works without an account. Discord is only for saving rules later.',
  cards: [
    {
      step: '01',
      title: 'Counts your clicks',
      body: 'On a supported casino tab, it counts every click. It is looking for clicking that has gotten too fast to be a deliberate bet.',
    },
    {
      step: '02',
      title: 'Covers the tab',
      body: 'Frantic clicking puts a full-screen pause over the game for about two minutes. That pause is called Touch Grass. You cannot close it early.',
    },
    {
      step: '03',
      title: 'Gives the site back',
      body: 'When the timer ends, the casino comes back. You can keep playing, or close the tab. The pause is there so a win does not get clicked away.',
    },
  ],
  mock: {
    status: 'Counting clicks',
    signal: 'Clicking too fast',
    footer: 'Tab covered · about 2 min',
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
