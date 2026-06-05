/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

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
    label: 'LOCKVAULT',
    title: 'Auto Profit Lock (dashboard)',
    description: 'Durable vault rules in dashboard. In-tab skim: use install links.',
    status: 'beta',
  },
  {
    href: '/tools/buddy-system',
    label: 'BUDDY SYSTEM',
    title: 'Accountability Partner',
    description: 'Partner alerts when sessions go sideways.',
    status: 'beta',
  },
  {
    href: '/tools/degens-arena',
    label: 'DEGENS ARENA',
    title: 'Trivia Drop Arena',
    description: 'Discord-native trivia — not a mobile install.',
    status: 'beta',
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
