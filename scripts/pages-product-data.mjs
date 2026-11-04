/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
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
  'We never ask for your casino password or wallet seed. You sign a Cooldown. Download the extension zip directly or build from source.';
export const CTA_READY = true;
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
    body: 'Chrome on the casino tab. Two seconds between spins, game filters, reality wage HUD, deposit barrier, reverse-withdrawal shield, profit-lock ratchet, bonus tracker, velocity radar, one-click cashout router, and streak volatility spotter. Sideload zip is live.',
  },
];
export const INSTALL_STEPS = [
  'Download the extension zip directly from this site and extract the folder.',
  'In Chrome, Brave, or Edge, navigate to chrome://extensions and switch on Developer mode (top right).',
  'Click "Load unpacked" and select the extracted folder. Pin the extension to your toolbar and spin with brakes.',
];
export const INSTALL_NOTE =
  'Wallet lock, casino trust lookup, and direct browser extension zip download are live. Sideload via chrome://extensions Developer mode. Store listing coming later.';
export const HUD = {
  spin: 'SPIN',
  countdown: '2s',
  chip: 'On your list',
  lock: 'Cooldown signed',
  lockMeta: 'devnet',
};
export const VAULT = {
  title: 'AutoVault — skim the win on the sites we actually support.',
  body: 'Stake.us and supported rooms. AutoVault moves your profit into your vault so the hit is not sitting in playable balance.',
  ctaLabel: 'AUTOVAULT',
  href: 'autovault/',
};
export const AUTOVAULT_PAGE = {
  eyebrow: 'In-Session Win Protection',
  title: 'Skim the hit.',
  punch:
    'Stake.us, Stake.com, and supported rooms. Hit a heater? AutoVault moves your cut straight into the casino vault so you don’t rinse it back.',
  steps: [
    'Install the TiltCheck browser extension from the direct download on this site.',
    'Open the extension on your casino tab and set your skim percentage (e.g. 10%) and big-win threshold.',
    'Play normally. When a win hits, AutoVault moves that slice straight into your vault. Zero logins, zero servers, 100% in your browser.',
  ],
  fine: 'Direct API vaulting on Stake.us and Stake.com via session cookie. Vault nudge dialogs on supported rooms. TiltCheck never sees passwords or holds funds.',
};
export const LAUNCH_HONESTY = [
  'This is live: casino lookup, browser brakes, and Cooldown on Solana’s test network (devnet). Mainnet is later.',
  'The Chrome extension is a direct zip download on this site (sideload via Developer mode; Web Store listing later). Includes two seconds spin brake, game filters, reality wage HUD, deposit barrier, reverse-withdrawal shield, profit-lock ratchet, bonus tracker, velocity radar, one-click cashout router, and streak volatility spotter.',
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
    body: 'Download the extension zip directly, unpack it, and load unpacked in chrome://extensions. Set a Cooldown lock and check Trust intel. No private keys.',
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
  {
    title: '2s Spin Pace Lock',
    body: 'Machine zone friction. After every spin, the bet button deadens for two seconds. No turbo mashing into dead rolls.',
  },
  {
    title: 'Strategic Game Filters',
    body: 'Arm your personal blacklist. Chicken, Mines, Plinko, or high-bleed slots stop clicking the second you put them on your list.',
  },
  {
    title: 'Reality Wage HUD',
    body: 'Translates session drawdown into hours of real-world labor torched ($25/hr baseline). A blunt terminal reminder before you blow a full shift.',
  },
  {
    title: 'DOM Deposit Barrier',
    body: 'Catches you reaching for the wallet. Cashier and reload clicks are intercepted and blocked during Touch Grass timeouts and active Cooldowns.',
  },
  {
    title: 'Reverse-Withdrawal Shield',
    body: 'Cashier protection. Disarms cancel payout and reverse redemption buttons on pending transactions so you cannot undo cashouts during late-night tilt.',
  },
  {
    title: 'Profit-Lock & Reality Goals',
    body: 'Locks a trailing profit floor (50% default) when ahead, backing it with an escalating 60-second brake and real-world utility toasts (bills, rent, gas).',
  },
  {
    title: 'Bonus Tracker & Max-Bet Alarm',
    body: 'Tracks promotional rollover wagering with an in-page progress HUD and intercepts over-limit stakes before bonus winnings are voided by the operator.',
  },
  {
    title: 'Session Velocity Radar',
    body: 'Real-time rolling loss velocity ($/min) with vector sparkline momentum and alert bands (Steady, Drain, Bleed, Cliff-Dive) right in the extension popup.',
  },
  {
    title: 'One-Click Cashout Router',
    body: 'Deep-links straight to the native cashier and redemption portals across 21+ crypto and sweeps operators, plus visual progress bars towards real-world bills.',
  },
  {
    title: 'In-Session Auto-Vaulting',
    body: 'Non-custodial safe deposits (e.g. Stake Vault) triggered automatically or via one click when cashout goals and ratchet floors are hit.',
  },
  {
    title: 'Win-Streak & Volatility Spotter',
    body: 'Live dead-spin runs, personal hit rates, and heater streaks. Intercepts Gambler\'s Fallacy ("I\'m Due") stake escalations with immediate Cashier exit ramps before tilt kicks in.',
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
    href: 'https://github.com/TiltCheck-ME/tiltcheck-monorepo/tree/main/packages/cli',
    label: 'OFFLINE CLI',
    title: 'Offline-First CLI Suite',
    description: 'Provably fair HMAC-SHA256 verifier, slot RTP downgrade calculator, operator trust audit, and Ed25519 voluntary cooldown tokens.',
    status: 'live',
  },
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
    label: 'AUTOVAULT',
    title: 'Auto Profit Lock',
    description: 'Skim a percentage of heater wins straight to your vault before you rinse it.',
    status: 'live',
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
    'Practice prompts and offline cards. Reset your headspace before touching a casino tab again.',
  triviaNote: 'Offline questions from the bank. Pick one. Reveal. Next. Instant in-browser grounding.',
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

export const CORE_BRAKES = [
  {
    num: "01",
    title: "2s Spin Brake",
    body: "Locks the bet button for two seconds after every single spin. You cannot spam auto-spin into a blackout. Your balance actually catches up before you fire again.",
    status: "Enforced by default",
  },
  {
    num: "02",
    title: "Strategic Game Filters",
    body: "Puts blunt warning badges right on Mines, Chicken, Plinko, and high-house-edge slots. Shows you the mathematical trap before you drop your stack.",
    status: "Live game scan",
  },
  {
    num: "03",
    title: "Reality Wage Clock",
    body: "Translates casino chips into your actual hourly day-job wage ($25/hr default). Seeing 12 hours of labor torched hits different than numbers on a screen.",
    status: "Configurable wage",
  },
  {
    num: "04",
    title: "DOM Deposit Barrier",
    body: "Freezes cashier and deposit triggers across Stake, Roobet, and sweepstakes frontends when you are tilted or on a Cooldown. Stops you from digging the hole deeper.",
    status: "Hard stop on reload",
  },
  {
    num: "05",
    title: "Reverse-Withdrawal Shield",
    body: "Neutralizes cancel cashout and reverse payout triggers while withdrawals are pending. Locks your hit in place so you cannot feed settled wins back to the house.",
    status: "Active cashier guard",
  },
  {
    num: "06",
    title: "Profit-Lock & Reality Goals",
    body: "Trailing profit floor with 2-stage intervention (soft warning escalating to 60s hard brake) plus real-world goal toasts (power bills, groceries, gas) to remind you what credits are worth.",
    status: "Trailing floor + goal alerts",
  },
  {
    num: "07",
    title: "Bonus Playthrough & Max-Bet Traps",
    body: "Tracks promotional rollover wagering in real time with an in-page HUD and triggers alarms or bet-interception if a single stake violates operator max-bet limits (e.g. $5.00 limit).",
    status: "Live HUD + trap interceptor",
  },
  {
    num: "08",
    title: "Session Velocity Radar & Sparkline",
    body: "Calculates rolling loss velocity ($/min) with status bands (Steady, Drain, Bleed, Cliff-Dive) and displays vector momentum sparklines directly in the popup.",
    status: "Rolling velocity telemetry",
  },
  {
    num: "09",
    title: "One-Click Cashout Router & Goal Bars",
    body: "Deep-links straight to native cashier and redemption portals across 21+ crypto and sweeps casinos, backed by visual progress bars towards tangible bills and life goals.",
    status: "21+ operator deep links",
  },
  {
    num: "10",
    title: "In-Session Auto-Vaulting",
    body: "Executes non-custodial in-casino safe deposits (e.g. Stake Vault) directly from your browser session when cashout goals and profit ratchets are unlocked.",
    status: "Non-custodial safe deposits",
  },
  {
    num: "11",
    title: "Session Win-Streak & Volatility Spotter",
    body: "Monitors dead-spin runs, personal hit rates, and consecutive heater streaks in real time. Flags Gambler's Fallacy ('I'm Due') stake escalations with immediate Cashier exit ramps before tilt sets in.",
    status: "Live streak & fallacy telemetry",
  },
];
