/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11 */
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
    title: "The Vault",
    description: "Because you can't be trusted with your own profit. Wins auto-lock to cold storage before your brain gives them back. Your keys. Our guardrails. Zero custodial risk.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/verify",
    icon: "/assets/canva/shield-checkmark.jpg",
    category: "RECEIPTS",
    title: "Forensic Seed Audit",
    description: "Provably fair is a lie until we audit the seed. Paste the HMAC-SHA256 seeds. We run the math. If they lied, we'll find it. Works with TiltCheck 4-Key mode and every legacy casino format.",
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
    href: "/beta-tester",
    icon: "/assets/canva/crossed-swords.jpg",
    category: "DEGENS AGAINST DECENCY",
    title: "Degen Trivia",
    description: "The web trivia arena — battle degens for SOL drops while you cool down. Live drops available now in Discord via /triviadrop. Web version launching soon.",
    status: "coming-soon",
    gridClasses: "",
  },
  {
    href: "/beta-tester",
    icon: "/assets/canva/brain-circuit.jpg",
    category: "THE BLACKLIST",
    title: "Casino Blacklist",
    description: "Casinos that cap winners, delay withdrawals, and shadow-ban profit. Account restrictions, silent bet limits, and KYC stalls — all surfaced. If they've flagged a degen for winning, it's on the list.",
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
