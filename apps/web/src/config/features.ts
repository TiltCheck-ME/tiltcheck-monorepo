/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
export type Tool = {
  href: string;
  icon: string;
  category: string;
  title: string;
  description: string;
  status: 'live' | 'coming-soon' | 'featured';
  gridClasses?: string;
};

export const features: Tool[] = [
  {
    href: "/tools/auto-vault",
    icon: "auto-vault.svg",
    category: "TOUGH LOVE",
    title: "Non-Custodial LockVault",
    description: "Your wins auto-lock to cold storage before you can yeet them back. You're a degen, but we're gonna help you be a rich degen. Your keys. Your rules. Your actual future.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/verify",
    icon: "rng-audit.svg",
    category: "CHECK THE MATH",
    title: "Forensic Seed Audit",
    description: "Paste the seeds. We'll tell you if they lied. HMAC-SHA256 provably fair verification that works with TiltCheck 4-Key mode and all the legacy casino formats.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/domain-verifier",
    icon: "domain-verifier.svg",
    category: "LINKGUARD",
    title: "Anti-Drainer DNS Sentry",
    description: "Phishing clones caught before they drain your wallet. We validate SSL certs and contract IDs. The house edge is bad enough without scammers.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/session-stats",
    icon: "session-stats.svg",
    category: "TILT TELEMETRY",
    title: "The Nerf Radar",
    description: "See which platforms are running greedy RTP versions. Global heatmap of which casinos are tilting the odds. Pure PnL, platform drift flags, and our AI telling you when to cash out before it gets ugly.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/justthetip",
    icon: "justthetip.svg",
    category: "JUSTTHETIP",
    title: "JustTheTip (P2P Gossip)",
    description: "Tip the community, skip the fees, no middleman. Peer-to-peer, non-custodial, and actually built for degens who care about degens.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/degens-arena",
    icon: "degens-arena.svg",
    category: "DEGENS AGAINST DECENCY",
    title: "Tilt-Free Trivia Arena",
    description: "Battle 10k other degens for degen-drops while you cool down. WebSocket combat, real PvP, actual winnings. Turn tilt into comp.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/scan-scams",
    icon: "scan-scams.svg",
    category: "TRUST ENGINE",
    title: "Casino Shadow-Ban Tracker",
    description: "We see withdrawal delays and regulatory issues. If a casino's slow-rolling you, the community sees it first. Real-time alerts from real players.",
    status: "live",
    gridClasses: "md:row-span-2",
  },
  {
    href: "/tools/house-edge-scanner",
    icon: "house-edge-scanner.svg",
    category: "RTP FORENSICS",
    title: "The Delta Engine",
    description: "We catch what they claim vs. what actually happens. Live RTP drift detection against GLI-certified manufacturer specs. See the Greed Premium before it hits your balance.",
    status: "live",
    gridClasses: "",
  },
];
