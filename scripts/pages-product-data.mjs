/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09 */
/**
 * Static product catalog for GitHub Pages twin (no API).
 * Keep hero/install copy in lockstep with apps/web/src/lib/home-launch-copy.ts.
 *
 * Voice: TiltCheck talks shit and adds friction. It does not save, shield, or guard anyone.
 * The player does the work. No store-review status, roadmap, or dev notes in public copy.
 */

export const SITE_URL = 'https://tiltcheck.me';
export const API_URL = 'https://api.tiltcheck.me';
export const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';
export const KOFI_URL = 'https://ko-fi.com/jmenichole7';
export const EXTENSION_ZIP_URL = `${SITE_URL}/downloads/tiltcheck-extension.zip`;
export const SOLANA_TIP_WALLET = 'DgeYJvpRQGmYgyXQNqm2nGxwoxABa43dvQY5HJU57ET1';
export const SOLSCAN_TIP_URL = `https://solscan.io/account/${SOLANA_TIP_WALLET}`;

export const SITE_H1_LINES = ['House always wins?', 'FUCK THAT.'];
export const SITE_HERO_HEADLINE = 'House always wins? FUCK THAT.';
export const SITE_DOPAMINE = "The math isn't rigged. Your dopamine is.";
export const SITE_KICKER =
  'Chasing the loss, chasing the win, thinking you are due. That is feeding the house.';
export const SITE_LEDE =
  'Degen-built tools that talk shit and add friction. Two seconds between spins. Games you swore off stop clicking. A Touch Grass lock you sign yourself so 3am-you has to wait it out. A sus check before you deposit. You still drive. We just heckle from the passenger seat. No keys. No bets.';
export const SITE_ONE_LINER =
  'Degen-built tools that heckle you mid-session: a pause between spins, a block list for the games that rinse you, a Touch Grass lock you sign yourself, and a sus check on the casino. We never hold your keys.';
export const SITE_META_DESCRIPTION = SITE_ONE_LINER;
export const SITE_PRIVACY =
  'We never ask for your casino password or wallet seed. You sign your own Touch Grass lock. The extension runs in your browser, not on our servers.';
export const CTA_READY = false;
export const CTA_LABEL = 'ADD TO CHROME';
export const CTA_GATED_LABEL = 'EXTENSION: NOT PUBLIC YET';
export const CTA_GATED_HINT = 'Hop in the Discord to hear when it drops.';
export const SECONDARY_CTAS = [
  { label: "DON'T FEED THE HOUSE", href: 'cooldown/', primary: true },
  { label: 'IS THIS CASINO SUS?', href: 'casinos/', primary: false },
];
export const TERTIARY_LINK = {
  label: 'What the extension does',
  href: 'extension.html',
};
export const INSTALL_EYEBROW = 'How it works';
export const INSTALL_TITLE = 'Three moves. All yours.';
export const INSTALL_MOVES = [
  {
    title: 'Look up the house',
    body: 'Receipts, not vibes: payout stories, licenses, scam reports. Check the casino before it checks your balance.',
  },
  {
    title: "Don't feed it",
    body: "Sign a Touch Grass lock. The win stays off the table until the timer runs out. You sign it. You honor it. Casinos don't have to. We never hold keys.",
  },
  {
    title: 'Slow the next click',
    body: 'The extension sits on the casino tab and gets in your way: two seconds between spins, your blocked games stop clicking, losses shown in hours of your actual job. Annoying on purpose.',
  },
];
export const INSTALL_NOTE =
  'Live on this site right now, no extension needed: Touch Grass locks, the RTP scanner, the bet verifier, and casino trust lookups.';
export const VAULT = {
  title: 'AutoVault — skim the win on the sites we actually support.',
  body: 'Stake.us and supported rooms. AutoVault moves your cut into your own casino vault so the hit is not sitting in playable balance.',
  ctaLabel: 'AUTOVAULT',
  href: 'autovault/',
};
export const AUTOVAULT_PAGE = {
  eyebrow: 'Skim the win',
  title: 'Skim the hit.',
  punch:
    'Stake.us, Stake.com, and supported rooms. Hit a heater? AutoVault moves your cut into the casino vault before you talk yourself into one more spin.',
  steps: [
    'Grab the TiltCheck extension when it goes public. Ask in the Discord.',
    'Open the extension on your casino tab and set your skim percentage (e.g. 10%) and big-win threshold.',
    'Play normally. When a win hits, AutoVault moves that slice into your vault. No logins, no servers, all in your browser.',
  ],
  fine: 'Vaults on Stake.us and Stake.com with your own signed-in session. Vault nudges on supported rooms. TiltCheck never sees passwords or holds funds.',
};
export const RTP_SCANNER_PAGE = {
  eyebrow: "RTP Forensics & Downgrade Scanner",
  title: "Live Slot RTP Downgrade Scanner",
  punch: "Providers ship games with up to 5 certified return-to-player tiers (e.g. 96.5% down to 88.0%). Shady casinos quietly pick the lowest tier without telling the player.",
  fine: "Certified tiers sourced from GLI, eCOGRA, and BMM lab test reports. Compare your casino deployment against manufacturer baselines.",
};

export const VERIFY_PAGE = {
  eyebrow: "Provably Fair Cryptographic Audit",
  title: "Provably Fair HMAC-SHA256 Seed Verifier",
  punch: "Paste server seed, client seed, and nonce to mathematically recompute and audit casino outcomes (Dice, Limbo, Crash, Roulette, Plinko, Mines) client-side. Independent of casino servers.",
  fine: "Single-bet cryptographic verification confirms round mathematics. Always verify pre-commitment hashes before trusting seeds.",
};

export const HOUSE_EDGE_PAGE = {
  eyebrow: "RTP Forensics & Loyalty Economics",
  title: "House Edge & Comp Point Scanner",
  punch: "Calculate VIP milestone true cost, expected losses, and comp reward return ratios. See exactly how much the house pockets while you chase loyalty tiers.",
  fine: "Loyalty mathematical models based on public casino VIP terms. Expected loss = Effective Wager * House Edge.",
};

export const LAUNCH_HONESTY = [
  'Live now: casino lookup, the extension tricks, and Touch Grass locks on Solana’s test network (devnet). Mainnet is later.',
  'None of this works unless you let it. Turn the extension off and play continues. That part is on you.',
  'Your game list lives in your browser. It is not a casino account ban.',
  'AutoVault is two casinos. We do not fake a vault button everywhere.',
];

export const EXTENSION_SIGNALS = [
  {
    title: '2-Second Spin Pause',
    body: 'After every spin the bet button naps for two seconds. No turbo-mashing into dead rolls.',
  },
  {
    title: 'Game Filters',
    body: 'Make your own block list. Chicken, Mines, Plinko, or the slots that rinse you stop clicking the second they are on it.',
  },
  {
    title: 'Reality Wage Clock',
    body: 'Turns your session losses into hours of real work torched ($25/hr default). A blunt reminder before you blow a whole shift.',
  },
  {
    title: 'Deposit Speed Bump',
    body: 'Reaching for the wallet during a Touch Grass lock? Cashier and reload buttons go dead until the timer runs out.',
  },
  {
    title: 'Cancel-Withdrawal Blocker',
    body: 'Hides "cancel withdrawal" while a cashout is pending, so late-night you has to work harder to undo it.',
  },
  {
    title: 'Profit Floor & Real Goals',
    body: 'Marks a profit floor when you are up (50% default). Slide toward it and you get a warning, then a 60-second pause, plus what the money is really for: rent, bills, gas.',
  },
  {
    title: 'Bonus Rollover & Max-Bet Alarm',
    body: 'Shows how much rollover is left and yells before one oversized bet gets your bonus voided.',
  },
  {
    title: 'Loss Speed Meter',
    body: 'How fast you are losing, in dollars per minute, with bands from Steady to Cliff-Dive, right in the popup.',
  },
  {
    title: 'One-Click Cashout Links',
    body: 'Jumps straight to the cashier on 21+ crypto and sweeps casinos, with progress bars toward real bills.',
  },
  {
    title: 'Mid-Session Auto-Vault',
    body: 'Moves a cut into the casino vault (like Stake Vault) when you hit your goal. Your account, your money.',
  },
  {
    title: 'Streak & "I\'m Due" Spotter',
    body: 'Counts dead spins and heater streaks. Raise your bet because you are "due" and it calls you out and points at the cashier.',
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
    href: '/extension',
    label: 'SPIN PAUSE',
    title: '2-Second Spin Pause',
    description: 'Two seconds between spins. Kills turbo-mashing and puts a little friction back.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'CASHOUT',
    title: 'Cancel-Withdrawal Blocker',
    description: 'Hides the cancel button on pending withdrawals so a settled win is harder to throw back.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'LOSS SPEED',
    title: 'Loss Speed Meter',
    description: 'Dollars lost per minute, with bands from Steady to Cliff-Dive. Ugly, honest, fast.',
    status: 'live',
  },
  {
    href: '/extension',
    label: "I'M DUE",
    title: 'Streak Spotter',
    description: 'Tracks dead spins and heater streaks, and calls you out when "I\'m due" starts sizing your bets.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'DEPOSITS',
    title: 'Deposit Speed Bump',
    description: 'Cashier and reload buttons go dead while your Touch Grass lock is running.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'BET SIZE',
    title: 'Default Bet Breaker',
    description: 'Spots slots that open at $1-$2 a spin instead of $0.10-$0.20 and warns you before spin one.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'SWEEPS',
    title: 'Sweeps Coin Reality Check',
    description: 'Session clock and net tracker that keeps Sweeps Coins (SC, real money) separate from Gold Coins (play money).',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'SOUND',
    title: 'Spin Sound Check',
    description: 'A quiet click when you are spinning too fast. A reality check, not an air horn.',
    status: 'live',
  },
  {
    href: '/rtp-scanner/',
    label: 'RTP',
    title: 'Slot RTP Downgrade Scanner',
    description: 'Same slot, worse odds: see which payout setting a casino picked (96.5% vs 94.2% vs 88.5%) and what that costs you.',
    status: 'live',
  },
  {
    href: '/house-edge-scanner/',
    label: 'VIP MATH',
    title: 'House Edge & Comp Calculator',
    description: 'What that VIP tier really costs you in expected losses. Receipts over marketing.',
    status: 'live',
  },
  {
    href: '/verify/',
    label: 'THE RECEIPT',
    title: 'Bet Verifier',
    description: 'Paste the seeds and check a Dice, Crash, Plinko, Limbo, or Mines result yourself.',
    status: 'live',
  },
  {
    href: '/autovault/',
    label: 'SKIM THE WIN',
    title: 'AutoVault',
    description: 'Moves a cut of a heater into your casino vault before you give it back.',
    status: 'live',
  },
  {
    href: '/cooldown/',
    label: 'TOUCH GRASS',
    title: 'Touch Grass Lock',
    description: 'Sign a timer with any Solana wallet. Cashier and spin buttons stay dead in the extension until it runs out. No SOL moves.',
    status: 'live',
  },
  {
    href: '/tip/',
    label: 'TIP JAR',
    title: 'Tip Jar',
    description: 'Hit a heater? Toss some SOL to keep TiltCheck free. Totally optional.',
    status: 'live',
  },
  {
    href: '/extension',
    label: 'BLOCK LIST',
    title: 'Game Blocker',
    description: 'Your own block list for the providers and game types that rinse you.',
    status: 'live',
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

export const CORE_BRAKES = [
  {
    num: '01',
    title: '2-Second Spin Pause',
    body: 'After every spin the bet button naps for two seconds. Auto-spinning into a blackout gets a lot harder, and you actually see what just happened.',
    status: 'On by default',
  },
  {
    num: '02',
    title: 'Game Filters',
    body: 'Warning badges on Mines, Chicken, Plinko, and the high-edge slots. Put the ones that rinse you on your list and they stop clicking.',
    status: 'Your list',
  },
  {
    num: '03',
    title: 'Reality Wage Clock',
    body: 'Shows your losses in hours of your real job ($25/hr default). Twelve shifts torched hits different than a number on a screen.',
    status: 'Set your wage',
  },
  {
    num: '04',
    title: 'Deposit Speed Bump',
    body: 'While your Touch Grass lock is running, the cashier and deposit buttons go dead. Digging deeper now takes extra steps and a long look in the mirror.',
    status: 'During a lock',
  },
  {
    num: '05',
    title: 'Cancel-Withdrawal Blocker',
    body: 'Hides the "cancel withdrawal" button while a cashout is pending, so 3am-you has to work harder to un-cash-out.',
    status: 'While cashouts clear',
  },
  {
    num: '06',
    title: 'Profit Floor & Real Goals',
    body: 'Up big? It marks a floor. Slide toward it and you get a warning, then a 60-second pause, plus a reminder of what that money is: power bill, groceries, gas.',
    status: 'Warning, then pause',
  },
  {
    num: '07',
    title: 'Bonus Rollover & Max-Bet Alarm',
    body: "Tracks how much rollover you have left and yells if one bet breaks the casino's max-bet rule (like $5) before they void your bonus.",
    status: 'Rollover tracker',
  },
  {
    num: '08',
    title: 'Loss Speed Meter',
    body: 'How fast you are losing, in dollars per minute: Steady, Drain, Bleed, Cliff-Dive. Right there in the popup, no math required.',
    status: '$ per minute',
  },
  {
    num: '09',
    title: 'One-Click Cashout Links',
    body: 'Jumps straight to the cashier on 21+ crypto and sweeps casinos, with progress bars toward the bills you actually have.',
    status: '21+ casinos',
  },
  {
    num: '10',
    title: 'Mid-Session Auto-Vault',
    body: "Hit your goal and it moves a cut into the casino's own vault (like Stake Vault). Your account, your money. We never touch it.",
    status: 'Your vault',
  },
  {
    num: '11',
    title: "Streak & \"I'm Due\" Spotter",
    body: "Counts dead spins and heater streaks. Start raising bets because you're \"due\" and it calls you out and points at the cashier.",
    status: 'Calls you out',
  },
];
