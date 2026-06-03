/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */

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
    description:
      'Plain 4-step setup for Android. Auto-vault + session wager. Send this link in DMs — not nuts chat.',
  },
  {
    href: '/stake',
    label: 'STAKE AUTOVAULT',
    title: 'Auto-lock wins on Stake.us',
    description:
      'Same Share Edition script, Stake.us steps. SC/GC vault skim + session stats. DM link only.',
  },
];

export const TOOL_REGISTRY: ToolEntry[] = [
  {
    href: '/tools/verify',
    label: 'THE RECEIPT',
    title: 'Manual Bet Verifier',
    description:
      'Verify a single bet with simple math instead of trusting the casino. Paste seeds / outcomes and recompute.',
    status: 'live',
  },
  {
    href: '/tools/domain-verifier',
    label: 'PHISHING SHIELD',
    title: 'Domain + Email Verifier',
    description:
      'Scan casino domains and suspicious emails for scam signals before you deposit or click.',
    status: 'live',
  },
  {
    href: '/tools/house-edge-scanner',
    label: 'THE DELTA ENGINE',
    title: 'House Edge Calculator',
    description:
      'Compare claimed payout vs what you actually got. Confidence score on whether the session looks rigged.',
    status: 'live',
  },
  {
    href: '/tools/geo-laws',
    label: 'GEO LAWS',
    title: 'Regulation by Region',
    description:
      'Gambling law snapshot by country — legal status, regulators, self-exclusion links.',
    status: 'live',
  },
  {
    href: '/tools/justthetip',
    label: 'JUST THE TIP',
    title: 'SOL Peer Tipping',
    description:
      'Send SOL tips by Discord username from the web. Non-custodial — keys stay in your wallet.',
    status: 'live',
  },
  {
    href: '/tools/tarot-flip-comparison',
    label: 'TAROT FLIP DIFF',
    title: 'Tarot Flip Comparison',
    description:
      'Compare a stored Tarot flip snapshot against live play. Recalculates odds from actual flips.',
    status: 'beta',
  },
  {
    href: '/tools/session-stats',
    label: 'PAYOUT DRIFT MONITOR',
    title: 'Slot Math Index',
    description:
      'Certified payout tier spreads across slot titles — max vs min RTP gap per casino.',
    status: 'beta',
  },
  {
    href: '/tools/scan-scams',
    label: 'SHADOW-BAN TRACKER',
    title: 'Casino Restriction Log',
    description:
      'Community-reported withdrawal delays and account restrictions from Discord + Trust Engine.',
    status: 'beta',
  },
  {
    href: '/tools/collectclock',
    label: 'COLLECTCLOCK',
    title: 'BonusCheck 2.0',
    description:
      'Bonus cooldown timers and formula lab. Useful, but not the primary mobile install path.',
    status: 'beta',
  },
  {
    href: '/tools/auto-vault',
    label: 'LOCKVAULT',
    title: 'Auto Profit Lock (dashboard)',
    description:
      'Durable vault rules live in the dashboard. For in-tab skim-while-you-play, use the install links above.',
    status: 'beta',
  },
  {
    href: '/tools/buddy-system',
    label: 'BUDDY SYSTEM',
    title: 'Accountability Partner',
    description:
      'Partner alerts when sessions go sideways. Settings live in the dashboard after login.',
    status: 'beta',
  },
  {
    href: '/tools/degens-arena',
    label: 'DEGENS ARENA',
    title: 'Trivia Drop Arena',
    description:
      'Discord-native trivia battles. Not a standalone mobile install — arena runs in community channels.',
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
