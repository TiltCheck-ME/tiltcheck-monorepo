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
  'Read-only browser guardrail. Watches pacing and tilt in real time — pulls you out before you rug yourself.';

export const CORE_JOBS = [
  {
    step: '01',
    title: 'Kill the Auto-Pilot',
    description: 'Tracks click-speed and bet pacing. Wakes you up when you play like a bot.',
  },
  {
    step: '02',
    title: 'Read the Room',
    description: 'Flags sus pacing and pressure loops while you are still in the session.',
  },
  {
    step: '03',
    title: 'Enforce the Exit',
    description: 'Set your line. We enforce it — not passive warnings.',
  },
];

export const FEATURE_CARDS = [
  {
    eyebrow: 'Extension',
    title: 'Lives in the casino tab',
    description: 'Read-only session guardrail. Sideload the zip — store listing later.',
    href: 'extension.html',
    cta: 'Install extension',
  },
  {
    eyebrow: 'Casino trust',
    title: 'Look up the operator',
    description: 'Curated grades, risk, and category on every card. Proof lanes stay on live.',
    href: 'casinos.html',
    cta: 'Browse casinos',
  },
  {
    eyebrow: 'Toolkit',
    title: 'Install first. Tools second.',
    description: 'Verifier, delta engine, geo laws, phishing shield — open live for interactive runs.',
    href: 'tools.html',
    cta: 'See tools',
  },
  {
    eyebrow: 'Operators',
    title: 'RGaaS sandbox',
    description: 'Trust scoring as a service. Non-affiliated. Request keys on the live site.',
    href: 'operators.html',
    cta: 'Operator access',
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
