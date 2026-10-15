/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14 */
/**
 * Static product catalog for GitHub Pages twin (no API).
 * Keep hero/install copy in lockstep with apps/web/src/lib/home-launch-copy.ts.
 */

export const SITE_URL = 'https://tiltcheck.me';
export const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';
export const KOFI_URL = 'https://ko-fi.com/jmenichole0';
export const EXTENSION_ZIP_URL = `${SITE_URL}/downloads/tiltcheck-extension.zip`;

export const SITE_H1_LINES = ['House always wins?', 'FUCK THAT.'];
export const SITE_HERO_HEADLINE = 'House always wins? FUCK THAT.';
export const SITE_KICKER = [
  'The house banks on your tilt.',
  'Non-custodial brakes for casino sessions. Made for degens, by degens — not a lecture from your mom.',
  'You sign a Cooldown lock this wallet cannot cancel. Our tools honor it. Casino tabs do not. Wen zip + mainnet? soon.',
];
export const SITE_ONE_LINER =
  'Non-custodial brakes for degens: on-chain Cooldown locks, Chrome session monitoring, casino trust scores, and tilt-aware tooling.';
export const SITE_META_DESCRIPTION = SITE_ONE_LINER;
export const SITE_PRIVACY = 'No wallet keys. No casino passwords.';
export const CTA_READY = false;
export const CTA_LABEL = 'DOWNLOAD THE ZIP';
export const CTA_GATED_LABEL = 'ZIP DROPS SOON™';
export const CTA_GATED_HINT = 'Phase 2. Zip is not public. Cooldown is the live lock.';
export const SECONDARY_CTAS = [
  { label: 'SET A COOLDOWN LOCK', href: '/cooldown', primary: true },
  { label: 'EXTENSION DETAILS', href: '/extension', primary: false },
];
export const INSTALL_STEPS = [
  'Zip is not public. soon™. Do not hunt a sideload.',
  'When it drops: Load unpacked in chrome://extensions.',
  'Core is a 2s spin lock. Touch Grass is Pro.',
];
export const INSTALL_NOTE =
  'Core will run guest when the zip drops. Cooldown is the lock that ships today. Discord later for dashboard vault rules, buddies, and sync.';
export const LAUNCH_CARDS = [
  { step: 'Now', title: 'Cooldown', body: 'Sign a lock. No cancel in v1. Tips and our check API honor it. Devnet. Not a casino-tab lock.' },
  { step: 'Next', title: 'Chrome Core', body: '2s spin lock on supported tabs when the zip drops. Touch Grass is Pro.' },
  { step: 'Also', title: 'Trust receipts', body: 'Public RTP, filings, payout evidence. Not a casino-sponsored grade.' },
];
export const LAUNCH_HONESTY = [
  'Devnet lock: you sign, no cancel. Tips and our API honor it. It does not lock Stake or Roobet. Wen mainnet? soon.',
  'Zip is Phase 2. Not public. Core is 2s. Touch Grass is Pro. No Chrome Web Store.',
  'Trust scores use live feeds when the API is up. Curated baselines when it is not.',
];
export const COOLDOWN_PAGE = {
  eyebrow: 'Cooldown',
  title: 'On-chain lock. You sign. We never hold keys.',
  lede: 'You sign a lock this wallet cannot cancel. Our tips and check API honor it. It does not lock casino tabs. That is the zip. Devnet. Wen mainnet? soon.',
  today: 'A signed lock is an on-chain receipt. v1 has no cancel. Tips and /cooldown/check honor it. Stake, Roobet, and the rest do not freeze. This page is the explainer — not a signing form.',
  canLock: 'Lock everything, a category, or one game. Stronger only.',
  notThis: [
    'Not a form on this page.',
    'Not custody. We never hold keys.',
    'Not a casino RG checkbox.',
  ],
};
export const EXTENSION_PAGE = {
  eyebrow: 'Browser extension // Core',
  title: 'Session intel in the tab. Two-second spin lock.',
  beats: [
    { title: 'Watches the tab', body: 'Read-only signals on supported casino tabs. Click pacing, not wallet keys.' },
    { title: '2s spin lock', body: 'Core locks the spin button for two seconds. A click during the lock does not spin.' },
    { title: 'Not the Pro HUD', body: 'Fullscreen Touch Grass is Pro. This zip does not turn that on.' },
  ],
  honesty: [
    'Not on the Chrome Web Store.',
    'Zip is not public yet — soon™.',
    'No wallet keys. No casino passwords.',
  ],
};

/** Plain-English pitch for cold visitors — sits under the hero. */
export const WHAT_IT_IS = {
  eyebrow: 'What this is',
  title: 'Brakes for the session. Not another casino.',
  paragraphs: [
    'Online casinos are built to keep you spinning. TiltCheck sits in your browser tab as a read-only audit layer: it watches pacing and session behavior, pairs that with public trust signals, and pushes you to cash out or stop when your own rules say so.',
    'We never ask for wallet keys. We never hold your money. We are not a casino, not an affiliate ranking farm, and not therapy — we are the brakes you install before tilt writes the next chapter.',
  ],
  bullets: [
    'Browser extension that watches supported casino tabs in real time',
    'Public casino trust grades so you can look up an operator before you deposit',
    'Tools to verify bets, scan shady domains, and check house-edge claims',
    'Optional vault / profit-lock flows so wins are harder to spin back',
  ],
};

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Install',
    body: 'Sideload the read-only Chrome extension. No private keys. It lives in the casino tab you already use.',
    note: 'One install. Two minutes.',
  },
  {
    step: '02',
    title: 'Watch',
    body: 'Compares live click-speed, bet pacing, and session events to your guardrails and known pressure patterns.',
    note: 'Flags sus spirals while you are still in the session.',
  },
  {
    step: '03',
    title: 'Exit',
    body: 'When the line is crossed: warning, cash-out push, or hard stop — whatever you configured. Proof over emotion.',
    note: 'You set the rules. We enforce them.',
  },
];

export const CORE_JOBS = [
  {
    step: '01',
    title: 'Kill the Auto-Pilot',
    description:
      'Rapid clicking, loss chasing, Martingale ladders — the bot mode you slip into after three bad spins. We track pacing and wake you up.',
  },
  {
    step: '02',
    title: 'Read the Room',
    description:
      'Pressure loops, sus session dynamics, and “im due” energy in real time — while the tab is still open, not in a postmortem.',
  },
  {
    step: '03',
    title: 'Enforce the Exit',
    description:
      'Profit targets and loss limits you chose ahead of time. Not a polite toast. A real stop before you give the heater back.',
  },
];

export const PROBLEM_SIGNALS = [
  {
    title: 'Tilt detection',
    body: 'Know when you hit The Loop — Auto-Pilot patterns before the bankroll pays tuition.',
  },
  {
    title: 'Casino trust grades',
    body: 'Letter grades and risk labels for sweeps, crypto, regulated, and known scam names — community-curated, not casino-sponsored.',
  },
  {
    title: 'Receipts over vibes',
    body: 'Recompute a bet from seeds, check claimed RTP vs what you got, scan domains before you click a “support” link.',
  },
  {
    title: 'Lock the win',
    body: 'Vault / AutoVault flows make profit harder to spin back when the next bonus screen starts whispering.',
  },
];

export const FEATURE_CARDS = [
  {
    eyebrow: 'Extension',
    title: 'The actual product',
    description:
      'Chrome extension that watches your live casino session. Install this first if you want the brakes — everything else is support gear.',
    href: 'extension.html',
    cta: 'How to install',
  },
  {
    eyebrow: 'Casino trust',
    title: 'Who are you depositing with?',
    description:
      'Browse curated operator grades (A through F), risk, and category. Open a full proof page on tiltcheck.me when you need license and scam lanes.',
    href: 'casinos.html',
    cta: 'Browse casinos',
  },
  {
    eyebrow: 'Toolkit',
    title: 'Math and scam tools',
    description:
      'Bet verifier, house-edge calculator, geo-laws, phishing shield, shadow-ban log. Interactive runs live on tiltcheck.me — this page is the map.',
    href: 'tools.html',
    cta: 'See tools',
  },
];

export const FAQS = [
  {
    question: 'Do you see my wallet key or hold my money?',
    answer:
      'No. Never. The extension is read-only on casino tabs. No custodial wallets. If someone asks for your seed phrase “for TiltCheck,” that is a scam.',
  },
  {
    question: 'Is TiltCheck a casino or a tipster?',
    answer:
      'Neither. We do not take bets, sell picks, or rank casinos for affiliate kickbacks. We are an audit / guardrail layer for people who already play.',
  },
  {
    question: 'What problem does the extension solve?',
    answer:
      'You know the spiral: three losses, bet size climbs, “im due,” deposit again. TiltCheck watches pacing and enforces the exit you set when you were still sober about it.',
  },
  {
    question: 'What is a casino trust grade?',
    answer:
      'A curated letter grade plus risk label for an operator (sweeps, crypto, regulated, scam, etc.). It is a starting point — open the live proof page for license, domain, and issue lanes.',
  },
  {
    question: 'Why does this GitHub Pages site exist?',
    answer:
      'Shareable static twin when the main app host is down or you just need the pitch + directory. Interactive tools and dashboards still live on tiltcheck.me.',
  },
  {
    question: 'Crisis or addiction help?',
    answer:
      'TiltCheck is brakes, not therapy. Call 1-800-GAMBLER or visit ncpg.org.',
  },
];

export const EXTENSION_SIGNALS = [
  { title: 'Read-only', body: 'Watches supported casino tabs. No private keys.' },
  { title: 'In-tab', body: 'Warnings and exit controls stay on your active screen.' },
  { title: 'Your rules', body: 'Profit targets and vault limits — we enforce what you set.' },
];

export const GRADING_STEPS = [
  {
    title: 'Curated baseline grade',
    body: 'Each operator starts from a researched letter grade in our casino directory. That maps to a numeric score — not vibes, not affiliate rank.',
  },
  {
    title: 'Category split',
    body: 'Regulated, Sweeps, Crypto, Offshore, Grey Market, Skill Game, Scam — same grade can mean different risk shapes.',
  },
  {
    title: 'Documented issues',
    body: 'Known violations and license basis show on live proof pages. Empty here is not a clean bill — it means this static mirror lists baseline cards only.',
  },
  {
    title: 'Live feed overlay',
    body: 'On tiltcheck.me, RGaaS can overlay a live score. This Pages twin ships curated baselines only — we do not invent live data.',
  },
];

export const TOOL_REGISTRY = [
  {
    href: '/tools/verify',
    label: 'THE RECEIPT',
    title: 'Manual Bet Verifier',
    description: 'Recompute one bet from seeds/outcomes — no trusting the casino.',
    status: 'live',
  },
  {
    href: '/tools/domain-verifier',
    label: 'PHISHING SHIELD',
    title: 'Domain + Email Verifier',
    description: 'Scan domains and emails for scam signals before you click.',
    status: 'live',
  },
  {
    href: '/tools/house-edge-scanner',
    label: 'THE DELTA ENGINE',
    title: 'House Edge Calculator',
    description: 'Claimed payout vs what you got — rigged-session confidence score.',
    status: 'live',
  },
  {
    href: '/tools/geo-laws',
    label: 'GEO LAWS',
    title: 'Regulation by Region',
    description: 'Legal status, regulators, and self-exclusion links by country.',
    status: 'live',
  },
  {
    href: '/tools/justthetip',
    label: 'JUST THE TIP',
    title: 'SOL Peer Tipping',
    description: 'Tip SOL by Discord username. Non-custodial.',
    status: 'live',
  },
  {
    href: '/tools/session-stats',
    label: 'PAYOUT DRIFT MONITOR',
    title: 'Slot Math Index',
    description: 'Certified RTP tier spreads per casino.',
    status: 'beta',
  },
  {
    href: '/tools/scan-scams',
    label: 'SHADOW-BAN TRACKER',
    title: 'Casino Restriction Log',
    description: 'Community withdrawal delays and account restrictions.',
    status: 'beta',
  },
  {
    href: '/tools/collectclock',
    label: 'COLLECTCLOCK',
    title: 'BonusCheck 2.0',
    description: 'Bonus cooldown timers and formula lab.',
    status: 'beta',
  },
  {
    href: '/tools/auto-vault',
    label: 'LOCKVAULT',
    title: 'Auto Profit Lock',
    description: 'Durable vault rules in dashboard. In-tab skim via install links.',
    status: 'beta',
  },
  {
    href: '/tools/buddy-system',
    label: 'BUDDY SYSTEM',
    title: 'Accountability Partner',
    description: 'Partner alerts when sessions go sideways.',
    status: 'beta',
  },
];

export const INSTALL_SURFACES = [
  {
    href: '/nuts',
    label: 'NUTS AUTOVAULT',
    title: 'Auto-lock wins on nuts.gg',
    description: '4-step Android setup. DM link only — not nuts chat.',
  },
  {
    href: '/stake',
    label: 'STAKE AUTOVAULT',
    title: 'Auto-lock wins on Stake.us',
    description: 'Same script, Stake.us steps. SC/GC vault + session stats.',
  },
];
