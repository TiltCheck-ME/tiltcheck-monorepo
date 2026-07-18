/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
/**
 * Static product catalog for GitHub Pages twin (no API).
 */

export const SITE_URL = 'https://tiltcheck.me';
export const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';
export const KOFI_URL = 'https://ko-fi.com/jmenichole0';
export const EXTENSION_ZIP_URL = `${SITE_URL}/downloads/tiltcheck-extension.zip`;

export const SITE_HERO_HEADLINE = 'House always wins? FUCK THAT.';
export const SITE_ONE_LINER =
  'TiltCheck is a free, read-only browser extension for online casino sessions. It watches how fast you bet, flags tilt and pressure loops, and enforces the exit rules you set — before another deposit cooks you.';

export const SITE_META_DESCRIPTION =
  'TiltCheck: read-only browser guardrail for online casino play. Spot tilt, check casino trust grades, verify bets, and brake before you rug yourself.';

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
  {
    eyebrow: 'Operators',
    title: 'For platforms',
    description:
      'If you run a casino or RG product: RGaaS sandbox keys for trust signals — non-affiliated, non-custodial. Players skip this.',
    href: 'operators.html',
    cta: 'Operator access',
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

export const OPERATOR_BULLETS = [
  'Trust scoring as a service — non-affiliated, evidence-backed.',
  'RGaaS API for session guardrails without custodial flows.',
  'Sandbox access for operators who want tilt signals, not affiliate spam.',
];

export const OPERATOR_BENEFITS = [
  {
    title: 'Trust scoring API',
    body: 'Evidence-backed operator scores you can plug into onboarding or review queues.',
  },
  {
    title: 'RG signals',
    body: 'Session pacing and pressure-loop signals without custodial money movement.',
  },
  {
    title: 'Sandbox first',
    body: 'Free sandbox with mocked responses. Production keys by review — not vibes.',
  },
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
