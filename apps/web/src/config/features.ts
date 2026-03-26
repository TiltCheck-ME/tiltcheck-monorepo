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
    category: "AUTO-VAULT",
    title: "Non-Custodial Auto-Vault",
    description: "Move winnings to cold storage automatically via local GraphQL polling. We never hold your keys—your funds, your vault.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/verify",
    icon: "rng-audit.svg",
    category: "CHECK YOURSELF",
    title: "Check My Bet (Fairness)",
    description: "API-level drift detection. We cryptographically verify the house's HMAC-SHA256 signatures to ensure the math isn't shadow-nerfed.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/domain-verifier",
    icon: "domain-verifier.svg",
    category: "LINKGUARD",
    title: "LinkGuard (DNS Verifier)",
    description: "Stops drainer phishing clones by validating exact SSL certs and contract addresses before you connect your wallet.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/session-stats",
    icon: "session-stats.svg",
    category: "TILT ANALYTICS",
    title: "Tilt & Session Analytics",
    description: "No corporate fluff. Pure session PnL, erratic betting flags, and behavioral intervention analytics.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/justthetip",
    icon: "justthetip.svg",
    category: "JUSTTHETIP",
    title: "JustTheTip Protocol",
    description: "Peer-to-peer, non-custodial tipping layer for the community. Zero intermediaries, instant on-chain settlement.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/degens-arena",
    icon: "degens-arena.svg",
    category: "DEGENS AGAINST DECENCY",
    title: "Tilt Live Trivia",
    description: "Massive synchronized 10k-player WebSocket arena. Decompress and earn purely via decentralized trivia drops.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/scan-scams",
    icon: "scan-scams.svg",
    category: "TRUST ENGINE",
    title: "Trust Engine Aggregator",
    description: "Consensus-driven public API tracking casino shadow-bans, withdrawal delays, and regulatory drift.",
    status: "live",
    gridClasses: "md:row-span-2",
  },
  {
    href: "/tools/house-edge-scanner",
    icon: "house-edge-scanner.svg",
    category: "HOUSE SCANNER",
    title: "HOUSE-EDGE SCANNER",
    description: "We do the math on the house's latest 'reload bonus' to show you exactly how badly they are shadow-nerfing the odds.",
    status: "coming-soon",
    gridClasses: "",
  },
];
