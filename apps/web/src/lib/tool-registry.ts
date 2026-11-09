/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09 */

/** Honest public tool status — install = DM-ready mobile setup pages. */
export type ToolStatus = 'install' | 'live' | 'beta' | 'soon';

export type InstallSurface = {
  href: string;
  label: string;
  title: string;
  description: string;
};

export type ToolEntry = {
  href: string;
  label: string;
  title: string;
  description: string;
  status: ToolStatus;
};

export type ReportEntry = {
  href: string;
  label: string;
  title: string;
  description: string;
  cadence: string;
};

export type PartnerLink = {
  href: string;
  label: string;
  title: string;
  description: string;
};

/** DM / mobile install links — same Share Edition script, casino-specific steps. */
export const INSTALL_SURFACES: InstallSurface[] = [
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

export const TOOL_REGISTRY: ToolEntry[] = [
  {
    href: '/cooldown',
    label: 'TOUCH GRASS',
    title: 'Touch Grass lock',
    description: 'Lock your wallet out of a game, a category, or everything for a while. You sign it. Devnet. Casinos do not have to honor it. You do.',
    status: 'live',
  },
  {
    href: '/tools/rtp-scanner',
    label: 'SLOT RTP SCANNER',
    title: 'Slot RTP Downgrade Scanner',
    description: 'Same slot, worse odds: see which payout setting a casino picked (96.5% vs 94.2% vs 88.5%) and the hidden Greed Tax it costs you.',
    status: 'live',
  },
  {
    href: '/tools/verify',
    label: 'THE RECEIPT',
    title: 'Manual Bet Verifier',
    description: 'Paste the seeds and check one bet yourself. No trusting the casino.',
    status: 'live',
  },
  {
    href: '/tools/domain-verifier',
    label: 'SCAM LINK CHECK',
    title: 'Domain + Email Verifier',
    description: 'Scan domains and emails for scam signals before you click.',
    status: 'live',
  },
  {
    href: '/tools/house-edge-scanner',
    label: 'VIP MATH',
    title: 'House Edge & Comp Point Scanner',
    description: 'What that VIP tier really costs you, and how little comes back.',
    status: 'live',
  },
  {
    href: '/tools/geo-laws',
    label: 'GEO LAWS',
    title: 'Regulation by Region',
    description: 'Legal status, regulators, and responsible gambling resources by country.',
    status: 'live',
  },
  {
    href: '/tools/tarot-flip-comparison',
    label: 'TAROT FLIP DIFF',
    title: 'Tarot Flip Comparison',
    description: 'Compare stored flip snapshot vs live play.',
    status: 'beta',
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
  {
    href: '/touch-grass/trivia',
    label: 'DEGENS ARENA',
    title: 'Trivia Drop Arena',
    description: 'Skill-only trivia on the Touch Grass hub.',
    status: 'beta',
  },
];

/** Automated intel feeds and public report surfaces — not interactive tools. */
export const REPORT_REGISTRY: ReportEntry[] = [
  {
    href: '/casinos',
    label: 'TRUST DIRECTORY',
    title: 'Casino Trust Scores',
    description: 'Public proof pages and license checks for each casino.',
    cadence: 'Live',
  },
  {
    href: '/intel/rtp',
    label: 'RTP DRIFT',
    title: 'RTP Intel Feed',
    description: 'Community-reported payout drift and certified tier spreads.',
    cadence: 'Daily',
  },
  {
    href: '/intel/scams',
    label: 'SCAM REGISTRY',
    title: 'Blacklist + Phishing Log',
    description: 'Domains and promos flagged before you deposit.',
    cadence: 'Daily',
  },
  {
    href: '/intel/scanner',
    label: 'BONUS SCANNER',
    title: 'Bonus Drop Scanner',
    description: 'Bonus codes and promos, checked on a schedule.',
    cadence: 'Weekly',
  },
  {
    href: '/bonuses',
    label: 'DAILY DROPS',
    title: 'Bonus Tracker',
    description: 'Cooldown timers and claim windows across tracked casinos.',
    cadence: 'Daily',
  },
  {
    href: '/blog',
    label: 'INTEL FEED',
    title: 'Degen Intel Blog',
    description: 'Variance and RTP weirdness, written up so you do not have to.',
    cadence: '72h',
  },
];

/** B2B / operator surfaces — clearly separated from player tools on the dash. */
export const PARTNER_LINKS: PartnerLink[] = [
  {
    href: '/operators/instant-redeem',
    label: 'INSTANT REDEEM',
    title: 'Partner Cashier API',
    description: 'Sandbox quote/settle orchestration. Processor holds float — TiltCheck does not cash players out.',
  },
  {
    href: '/operators',
    label: 'SANDBOX',
    title: 'Operator Keys + RGaaS',
    description: 'Request sandbox credentials and readiness checklist.',
  },
  {
    href: '/operators/pricing',
    label: 'PRICING',
    title: 'RGaaS + Instant Redeem Tiers',
    description: 'Commercial tiers for processors and casino groups.',
  },
];

/** Internal / power-user pages — not listed on /tools index. */
export const GATED_TOOL_PATHS: Record<string, ToolStatus> = {
  '/tools/session-wager': 'beta',
  '/tools/auto-vault/share': 'beta',
  '/tools/auto-vault/android': 'beta',
};

export function getToolStatus(pathname: string): ToolStatus | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (GATED_TOOL_PATHS[normalized]) return GATED_TOOL_PATHS[normalized];
  const entry = TOOL_REGISTRY.find((t) => t.href === normalized);
  return entry?.status ?? null;
}

export function isToolListedOnIndex(href: string): boolean {
  return TOOL_REGISTRY.some((t) => t.href === href);
}
