/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */

export const SITE_URL = 'https://tiltcheck.me';
export const API_URL = 'https://collectclock-api.j-chapman7.workers.dev';
export const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';
export const DISCORD_INVITE_URL = 'https://discord.gg/gdBsEJfCar';
export const DISCORD_OAUTH_LOGIN_URL = 'https://discord.com/oauth2/authorize?client_id=1445916179163250860&response_type=token&scope=identify&redirect_uri=https%3A%2F%2Fcollectclock-api.j-chapman7.workers.dev%2Fauth%2Fcallback&state=h.web';
export const KOFI_URL = 'https://ko-fi.com/jmenichole7';
export const EXTENSION_ZIP_URL = `${SITE_URL}/downloads/tiltcheck-extension.zip`;
export const SOLANA_TIP_WALLET = 'DgeYJvpRQGmYgyXQNqm2nGxwoxABa43dvQY5HJU57ET1';
export const SOLSCAN_TIP_URL = `https://solscan.io/account/${SOLANA_TIP_WALLET}`;

export const SITE_H1_LINES = ['House always wins?', 'NOT TODAY.'];
export const SITE_HERO_HEADLINE = 'House always wins? NOT TODAY.';
export const SITE_DOPAMINE = "The math isn't rigged. Your dopamine is.";
export const SITE_KICKER = 'Chasing losses and thinking you are due is how the casino eats your balance.';
export const SITE_LEDE =
  'Free tools that put a little friction between you and the next deposit. You switch them on. You make the calls.';
export const SITE_ONE_LINER =
  'Free tools for casino players: TrustCheck, TimeCheck, ClickCheck, and RealityCheck.';
export const SITE_META_DESCRIPTION = SITE_ONE_LINER;

export const CTA_READY = true;
export const CTA_LABEL = 'Download the extension';
export const CTA_GATED_LABEL = 'DIRECT DOWNLOAD';
export const CTA_GATED_HINT = 'Free manual sideload for Chrome, Brave, and Edge.';

export const SECONDARY_CTAS = [
  { label: 'TIMECHECK (TIMER)', href: 'gate/', primary: true },
  { label: 'REALITYCHECK (TOUCH GRASS)', href: 'cooldown/', primary: false },
];

export const TERTIARY_LINK = {
  label: 'Browse all tools',
  href: 'tools/',
};

// Homepage: one hero CTA, then what it does (each thing said once), then how to get it.
export const HOME_CTA = { label: 'Get it free', href: '#get' };

export const HOME_DOES = [
  {
    title: 'Check a casino pays',
    body: 'Payout complaints, licenses and red flags, graded. Look before you deposit.',
    links: [{ label: 'See the grades', href: 'casinos/' }],
  },
  {
    title: 'Verify your rolls',
    body: 'Paste the server seed, client seed and nonce. See if that dice, crash or plinko result adds up.',
    links: [{ label: 'Verify a roll', href: 'tools/verify/' }],
  },
  {
    title: 'Take a break',
    body: 'Set a session timer and a stop-loss before you start, or lock yourself out of the cashier for 24 hours up to 30 days.',
    links: [
      { label: 'TimeCheck', href: 'gate/' },
      { label: 'RealityCheck', href: 'cooldown/' },
    ],
  },
  {
    title: 'Touch grass with friends',
    body: 'Trivia, Bluff and Degens Against Decency in a Discord voice channel. Points are bragging rights. Nothing to bet.',
    links: [{ label: 'Join the Discord', href: 'DISCORD', external: true }],
  },
];

export const HOME_GET = [
  {
    where: 'On a computer',
    body: 'The extension works on the casino tab: a 2-second pause between spins, a Nope List for the games that rinse you, a heads-up when a slot opens at a big bet, and the rest.',
    note: 'Desktop Chrome, Brave or Edge.',
    cta: 'zip',
    link: { label: "What's in it", href: 'extension.html' },
  },
  {
    where: 'On your phone',
    body: 'The web tools run in your browser. Add TimeCheck to your home screen and it opens like an app.',
    link: { label: 'All tools', href: 'tools/' },
  },
];

export const HOME_FINE_PRINT =
  'No passwords, no keys, no deposits. TiltCheck never holds your money, and every limit runs in your own browser.';

export const VAULT = {
  title: 'Win Skim — Skim your wins.',
  body: 'Auto-skims a cut of big hits into your casino vault before you give it back.',
  ctaLabel: 'WIN SKIM',
  href: 'wincheck/',
};

export const AUTOVAULT_PAGE = {
  eyebrow: 'Profit Skimmer',
  title: 'Win Skim',
  punch:
    'Hit a heater? Win Skim stashes a percentage into your casino vault so it is off the table before your next spin.',
  steps: [
    'Download the TiltCheck extension for your desktop browser.',
    'Set your skim percentage (e.g. 10%) and win threshold.',
    'When a win hits, that cut moves into your casino vault automatically.',
  ],
  fine: 'Works with your own signed-in casino session. TiltCheck never touches keys or handles funds.',
};

export const RTP_SCANNER_PAGE = {
  eyebrow: 'Slot Payout Check',
  title: 'RTP Scanner',
  punch: 'Slots ship with multiple payout tiers (e.g. 96% down to 88%). See if your casino picked the nerfed setting.',
  fine: 'Compare live slot payout settings against original provider baselines.',
};

export const VERIFY_PAGE = {
  eyebrow: 'Game Fairness Check',
  title: 'Fairness Verifier',
  punch: 'Paste your server seed, client seed, and nonce to verify whether a dice, crash, or plinko roll was fair.',
  fine: 'Client-side verification computed right in your browser.',
};

export const HOUSE_EDGE_PAGE = {
  eyebrow: 'House Math & VIP Calculator',
  title: 'House Edge Scanner',
  punch: 'Check the real math on VIP level-up grinds, wagering requirements, and house edge.',
  fine: 'Calculates expected house edge loss against comp return ratios.',
};

export const EXTENSION_SIGNALS = [
  {
    title: 'ClickCheck (Spin Delay)',
    body: 'A mandatory 2-second pause between spins to kill the auto-spin daze and stop bankroll bleed.',
  },
  {
    title: 'Nope List (Rinse Blocker)',
    body: 'Put high-drain trap games on your blocklist to make them completely unclickable.',
  },
  {
    title: 'Sneaky Bet Alert (Default Bet Breaker)',
    body: 'Spots slots that sneakily open at $1.00–$2.00 a spin instead of $0.10 and catches it before spin one.',
  },
  {
    title: 'Keep the Win (Payout Lock)',
    body: 'Disables "Cancel Withdrawal" buttons so pending cashouts actually hit your pocket.',
  },
  {
    title: 'Win Skim (Profit Skimmer)',
    body: 'Skims a configurable percentage of heater wins straight into your vault before you give it back.',
  },
  {
    title: 'RealityCheck (Touch Grass)',
    body: 'Locks cashier and spin buttons for 24 hours, 3, 7 or 30 days when you need a hard reset.',
  },
];

/** Casino Ask box on /casinos/. The worker lives in workers/casino-ask (not deployed until Jamie OKs it). */
export const CASINO_ASK = {
  endpoint: 'https://tiltcheck-casino-ask.j-chapman7.workers.dev/ask',
  eyebrow: 'Ask',
  title: 'Ask about a casino.',
  lede: "Answers come only from the casino's own terms and help pages, TiltCheck's audits and CollectClock player reports, with links. If none of them say, it says I don't know.",
  placeholder: 'How long does Acebet take to redeem?',
  button: 'Ask',
  covered: "Covers Acebet's own pages and the casinos TiltCheck has audited. More casinos as their pages get added.",
};

export const GRADING_STEPS = [
  {
    title: 'Payout speed & receipts',
    body: 'Recent player cashout proofs, turnaround times, and stuck withdrawal complaints.',
  },
  {
    title: 'Licensing & jurisdiction',
    body: 'Active gaming commission permits, corporate registry, and verified ownership.',
  },
  {
    title: 'Terms fairness',
    body: 'Hidden max-cashout rules, predatory bonus rollover multipliers, and KYC stall tactics.',
  },
];

export const TOOL_REGISTRY = [
  {
    href: '/gate/',
    label: 'TIMECHECK',
    title: 'TimeCheck',
    description: 'Session timer and stop-loss for your phone. Add it to your home screen, no app store.',
    status: 'live',
  },
  {
    href: '/cooldown/',
    label: 'REALITYCHECK',
    title: 'RealityCheck',
    description: 'Lock your cashier and spin buttons for 24 hours, 3, 7 or 30 days. Go touch grass.',
    status: 'live',
  },
  {
    href: '/verify/',
    label: 'FAIRNESS VERIFIER',
    title: 'Fairness Verifier',
    description: 'Verify HMAC seeds and nonces to prove your roll was mathematically fair.',
    status: 'live',
  },
  {
    href: '/rtp-scanner/',
    label: 'RTP SCANNER',
    title: 'RTP Scanner',
    description: 'Catch casinos secretly running lower RTP payout configurations.',
    status: 'live',
  },
  {
    href: '/house-edge-scanner/',
    label: 'HOUSE EDGE SCANNER',
    title: 'House Edge Scanner',
    description: 'Calculate what chasing VIP tier bonuses actually costs in expected loss.',
    status: 'live',
  },
  {
    href: '/casinos/',
    label: 'TRUSTCHECK',
    title: 'TrustCheck',
    description: 'Audit casino payout speeds, license legitimacy, and player complaint receipts.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'CLICKCHECK',
    title: 'ClickCheck',
    description: 'Mandatory 2-second pause after every spin to prevent turbo-mashing.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'NOPE LIST',
    title: 'Nope List',
    description: 'Game blocker that disables clicks on the exact titles that rinse your bankroll.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'SNEAKY BET ALERT',
    title: 'Sneaky Bet Alert',
    description: 'Default bet breaker catching $1–$2 opening stakes on game launch.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'KEEP THE WIN',
    title: 'Keep the Win',
    description: 'Kills the cancel button on pending withdrawals so cashouts hit your pocket.',
    status: 'live',
  },
  {
    href: '/wincheck/',
    label: 'WIN SKIM',
    title: 'Win Skim',
    description: 'Auto-skims a cut of heater wins straight into your casino vault.',
    status: 'live',
  },
  {
    href: '/tip/',
    label: 'TIP JAR',
    title: 'Tip Jar',
    description: 'Keep TiltCheck 100% free with an optional SOL tip.',
    status: 'live',
  },
];
