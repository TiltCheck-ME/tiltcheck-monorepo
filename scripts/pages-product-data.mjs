/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30 */
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
export const SITE_DOPAMINE = "The math isn't rigged. Your dopamine is.";
export const SITE_KICKER =
  'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.';
export const SITE_LEDE =
  'Brakes for degens who still play. Slow the next spin. Block the game that rinses you. Sign a Cooldown so 3am-you cannot put the stack back on the table until the timer ends. Look up sus casinos before you deposit. We never hold your keys or take bets.';
export const SITE_ONE_LINER =
  'Brakes for people who already gamble: slow the next spin, block the game that rinses you, lock the wallet you signed, and check if the casino is sus. We never hold your keys.';
export const SITE_META_DESCRIPTION = SITE_ONE_LINER;
export const SITE_PRIVACY =
  'We never ask for your casino password or wallet seed. You sign a Cooldown. Zip is not on this site.';
export const CTA_READY = false;
export const CTA_LABEL = 'DOWNLOAD THE ZIP';
export const CTA_GATED_LABEL = 'CHROME ZIP NOT ON THIS SITE';
export const CTA_GATED_HINT =
  'The public zip is not up yet. Wallet lock and casino lookup work now. If you are building the extension, load unpacked dist from the repo.';
export const SECONDARY_CTAS = [
  { label: "DON'T FEED THE HOUSE", href: 'cooldown/', primary: true },
  { label: 'IS THIS CASINO SUS?', href: 'casinos/', primary: false },
];
export const TERTIARY_LINK = {
  label: 'How the Chrome brakes work',
  href: 'extension.html',
};
export const INSTALL_EYEBROW = 'How it works';
export const INSTALL_TITLE = 'Three moves. None of them are a lecture.';
export const INSTALL_MOVES = [
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
];
export const INSTALL_STEPS = INSTALL_MOVES.map((move) => `${move.title}. ${move.body}`);
export const INSTALL_NOTE =
  'Wallet lock and casino lookup work in this browser right now. The Chrome zip is not a public download yet. Devs load unpacked dist. That is a packaging gap, not a fake product.';
export const HUD = {
  spin: 'SPIN',
  countdown: '2s',
  chip: 'On your list',
  lock: 'Cooldown signed',
  lockMeta: 'devnet',
};
export const VAULT = {
  title: 'AutoVault — skim the win on the sites we actually support.',
  body: 'Stake.us and nuts.gg only. Dashboard owns the rule. The tab presses the vault button so the hit is not sitting in playable balance. Not every casino.',
  ctaLabel: 'AUTOVAULT SETUP',
  href: `${SITE_URL}/tools/auto-vault`,
};
export const LAUNCH_HONESTY = [
  'This is live: casino lookup, Discord tools, and Cooldown on Solana’s test network (devnet). Mainnet is later.',
  'The Chrome zip is not on this site and not in the Chrome Web Store. The two-second spin lock and game list exist in the repo as an unpacked install.',
  'Browser filters are your list. They are not an operator account close. Turn the extension off and play continues.',
  'AutoVault is two casinos. We do not fake a vault button everywhere.',
];

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
    body: 'Set a Cooldown lock and check Trust intel. Chrome Core is an unpacked sideload until the zip is public. No private keys.',
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

export const TOUCH_GRASS = {
  title: 'Touch Grass',
  lede: 'Casino tab is cooked. Sit at a table that is not a spin.',
  idleSoon: 'No drop running. Play a practice table or wait. soon™',
  triviaPane: 'Live Trivia',
  dadPane: 'Degens Against Decency',
  dadDiscordOnly:
    'Live DA&D still lives in Discord. Practice prompts are here. Open Discord when you want a real table.',
  triviaNote: 'Offline questions from the bank. Pick one. Reveal. Next. Live answering still lives in Discord.',
};

export const TOUCH_GRASS_TRIVIA = [
  {
    id: 'tg-due',
    question: 'You just lost four in a row and said you are due. What actually happened?',
    choices: [
      { key: 'A', text: 'The universe owes you a heater' },
      { key: 'B', text: 'Gambler’s fallacy. The next spin does not remember you' },
      { key: 'C', text: 'Variance is illegal in your state' },
      { key: 'D', text: 'The house paused to let you catch up' },
    ],
    answer: 'B',
    explanation: 'Independence. The slot is not keeping a tab. You are.',
  },
  {
    id: 'tg-house',
    question: 'Chasing the loss, chasing the win, thinking you are due. That is…',
    choices: [
      { key: 'A', text: 'Bankroll science' },
      { key: 'B', text: 'A skill edge' },
      { key: 'C', text: 'Feeding the house' },
      { key: 'D', text: 'Risk-free because you almost had it' },
    ],
    answer: 'C',
    explanation: 'That loop is the product. Lock or walk. Do not send the stack back.',
  },
  {
    id: 'tg-cooldown',
    question: 'A TiltCheck Cooldown is which of these?',
    choices: [
      { key: 'A', text: 'A deposit we hold for you' },
      { key: 'B', text: 'A signed Solana lock. No keys. No SOL moved' },
      { key: 'C', text: 'Self-exclusion at the casino' },
      { key: 'D', text: 'A Phantom-only feature' },
    ],
    answer: 'B',
    explanation: 'You sign. We never hold keys. Casinos do not have to honor it. You do.',
  },
  {
    id: 'tg-zip',
    question: 'The Chrome zip on tiltcheck.me is…',
    choices: [
      { key: 'A', text: 'A public download in the hero' },
      { key: 'B', text: 'In the Chrome Web Store' },
      { key: 'C', text: 'Not on this site. Devs load unpacked dist' },
      { key: 'D', text: 'Required before casino lookup works' },
    ],
    answer: 'C',
    explanation: 'Gated on purpose. Wallet lock and casino lookup work without the zip.',
  },
];

export const TOUCH_GRASS_DAD_PROMPTS = [
  "I'm not tilted, I'm just _____.",
  "The last time I said I'm due, I actually _____.",
  'Bankroll management, according to me, is _____.',
  'I cashed out once. Then I _____.',
  'The house is not the problem. The problem is _____.',
];

export const TOUCH_GRASS_DAD_CARDS = [
  'one more spin, no cap',
  'a heater that was actually variance',
  'rinsing what was left of rent',
  'wen win, except never',
  "the gambler's fallacy with extra steps",
  'locking in after already being cooked',
  'soon™, said the bonus terms',
  'blaming the slot, never the session',
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
