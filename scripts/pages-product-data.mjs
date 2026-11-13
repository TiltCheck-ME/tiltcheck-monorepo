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
  'Simple tools to keep you in control: ClickCheck for 2-second spin pauses, Nope List to block the games that rinse you, and RealityCheck when you need to walk away and touch grass.';
export const SITE_ONE_LINER =
  'Free tools for casino players: TrustCheck, TimeCheck, ClickCheck, and RealityCheck.';
export const SITE_META_DESCRIPTION = SITE_ONE_LINER;
export const SITE_PRIVACY =
  'We never ask for passwords or private keys. The extension and web tools run client-side in your own browser.';

export const CTA_READY = true;
export const CTA_LABEL = 'DOWNLOAD EXTENSION (ZIP)';
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

export const INSTALL_EYEBROW = 'How it works';
export const INSTALL_TITLE = 'Three simple habits.';
export const INSTALL_MOVES = [
  {
    title: 'Check the house first',
    body: 'Use TrustCheck to review payout complaints, license status, and scam flags before depositing.',
  },
  {
    title: 'Set your limits',
    body: 'Use TimeCheck to lock in your session time and stop-loss before you spin.',
  },
  {
    title: 'Slow your rolls',
    body: 'Use ClickCheck in the extension for a forced 2-second pause so you cannot turbo-mash away your balance.',
  },
];

export const INSTALL_NOTE =
  'Free web tools live right now: TimeCheck, RealityCheck, Fairness Verifier, RTP Scanner, House Edge Scanner, and TrustCheck.';

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

export const LAUNCH_HONESTY = [
  'Zero keys, zero deposits: we never take custody of player funds.',
  'Client-side harm reduction: all limits and delays run in your browser.',
  'Non-custodial cooldowns: 24-hour locks are voluntary and self-enforced.',
];

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
    body: 'Locks cashier and spin buttons for 24 hours straight when you need a hard reset.',
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
    description: 'Pre-session limit setter and countdown timer for your phone.',
    status: 'live',
  },
  {
    href: '/cooldown/',
    label: 'REALITYCHECK',
    title: 'RealityCheck',
    description: 'Lock your cashier and spin buttons for 24 hours to touch grass.',
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

export const INSTALL_SURFACES = [
  {
    href: '/extension',
    label: 'DESKTOP EXTENSION',
    title: 'TiltCheck Desktop Extension',
    description: 'Direct ZIP download. Sideload in Developer Mode in 30 seconds.',
  },
  {
    href: '/gate/',
    label: 'MOBILE PWA',
    title: 'TimeCheck for iOS & Android',
    description: 'Install directly to your home screen from your browser menu. Zero downloads.',
  },
];

export const CORE_BRAKES = [
  {
    num: '01',
    title: 'ClickCheck',
    body: 'A mandatory 2-second pause between spins to kill the auto-spin daze.',
    status: 'On by default',
  },
  {
    num: '02',
    title: 'Nope List',
    body: 'Add the slots and games that rinse you to your list and they stop clicking.',
    status: 'Custom list',
  },
  {
    num: '03',
    title: 'Sneaky Bet Alert',
    body: 'Spots slots that sneakily open at $1.00–$2.00 instead of $0.10 before spin one.',
    status: 'Active on game open',
  },
  {
    num: '04',
    title: 'Keep the Win',
    body: 'Hides cancel-withdrawal buttons while payouts are pending so you keep your win.',
    status: 'Active on pending payouts',
  },
  {
    num: '05',
    title: 'RealityCheck',
    body: 'Cashier and spin buttons stay dead while your 24-hour Touch Grass lock is active.',
    status: '24-hour timelock',
  },
  {
    num: '06',
    title: 'Win Skim',
    body: "Auto-skims a cut of big wins into your casino's own vault before you give it back.",
    status: 'Configurable %',
  },
];
