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
    icon: "/assets/canva/padlock.jpg",
    category: "TOUGH LOVE",
    title: "Non-Custodial LockVault",
    description: "Your wins auto-lock to cold storage before you can lose them back. Your keys. Your rules. We just stop you from being your own worst enemy.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/verify",
    icon: "/assets/canva/shield-checkmark.jpg",
    category: "CHECK THE MATH",
    title: "Forensic Seed Audit",
    description: "Paste the seeds. We'll tell you if they lied. HMAC-SHA256 provably fair verification that works with TiltCheck 4-Key mode and all the legacy casino formats.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/domain-verifier",
    icon: "/assets/canva/padlock-v2.jpg",
    category: "PHISHING SHIELD",
    title: "Phishing Shield",
    description: "Verify any casino link before you click. We check SSL certs, license status, and flag known scam domains. The house edge is bad enough without wallet drainers.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/session-stats",
    icon: "/assets/canva/lightning-bolt.jpg",
    category: "TILT TELEMETRY",
    title: "RTP Drift Monitor",
    description: "See which platforms are running greedy RTP tiers. Global heatmap of the Greed Premium — the gap between the max certified RTP and what the casino actually deploys. Pure PnL, platform drift flags, cash-out signals.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/justthetip",
    icon: "/assets/canva/wallet-solana.jpg",
    category: "JUSTTHETIP",
    title: "JustTheTip (P2P Gossip)",
    description: "Tip the community, skip the fees, no middleman. Peer-to-peer, non-custodial, and actually built for degens who care about degens.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/degens-arena",
    icon: "/assets/canva/crossed-swords.jpg",
    category: "DEGENS AGAINST DECENCY",
    title: "Degen Trivia",
    description: "The web trivia arena — battle degens for SOL drops while you cool down. Live drops available now in Discord via /triviadrop. Web version launching soon.",
    status: "coming-soon",
    gridClasses: "",
  },
  {
    href: "/tools/scan-scams",
    icon: "/assets/canva/brain-circuit.jpg",
    category: "TRUST ENGINE",
    title: "Casino Limit Flags",
    description: "Which casinos are known to limit or restrict winning players. Account capping, withdrawal delays, silent bet limits — surfaced on every casino card.",
    status: "coming-soon",
    gridClasses: "",
  },
  {
    href: "/tools/house-edge-scanner",
    icon: "/assets/canva/balance-scale.jpg",
    category: "RTP FORENSICS",
    title: "House Edge Scanner",
    description: "They claim 96.5%. You're running 88%. The House Edge Scanner catches live RTP drift against certified manufacturer specs and surfaces the Greed Premium per $100 wagered.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/bonuses",
    icon: "/assets/canva/puzzle-piece.jpg",
    category: "BONUS INTEL",
    title: "Daily Bonus Tracker",
    description: "Every sweepstakes and social casino bonus worth claiming, refreshed hourly. Community-verified. Use bonus funds to extend play without depositing real money. No bullshit bonuses included.",
    status: "live",
    gridClasses: "",
  },
];
