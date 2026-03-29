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
    description: "Auto-move wins to cold storage. Because you're a absolute degen, but we're helping you be a wealthy one. Your keys, your rules.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/verify",
    icon: "rng-audit.svg",
    category: "CHECK THE MATH",
    title: "Nerf-Proof RNG Audit",
    description: "House signatures verified or we flag 'em. Cryptographic HMAC-SHA256 validation to ensure those 'bad beats' aren't shadow-buffed.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/domain-verifier",
    icon: "domain-verifier.svg",
    category: "LINKGUARD",
    title: "Anti-Drainer DNS Sentry",
    description: "Phishing clones identified before they drain you. We validate SSL certs and contract IDs. The house edge is bad enough without scammers.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/session-stats",
    icon: "session-stats.svg",
    category: "TILT TELEMETRY",
    title: "PnL & Behavioral Raw Data",
    description: "Zero fluff. Pure session PnL, erratic betting flags, and the 'Tough Love' intervention engine telemetry.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/justthetip",
    icon: "justthetip.svg",
    category: "JUSTTHETIP",
    title: "JustTheTip (P2P Gossip)",
    description: "Peer-to-peer, non-custodial tipping layer. Send a tip, skip the fee, and keep the community liquid without middleman bullshit.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/degens-arena",
    icon: "degens-arena.svg",
    category: "DEGENS AGAINST DECENCY",
    title: "Tilt-Free Trivia Arena",
    description: "WebSocket combat. Battle 10k players for degen-drops while you cool down between sessions. Neutralize the tilt.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/scan-scams",
    icon: "scan-scams.svg",
    category: "TRUST ENGINE",
    title: "Casino Shadow-Ban Tracker",
    description: "Public API monitoring withdrawal delays and regulatory drift. If they're slow-rolling you, the community hears about it first.",
    status: "live",
    gridClasses: "md:row-span-2",
  },
  {
    href: "/tools/house-edge-scanner",
    icon: "house-edge-scanner.svg",
    category: "RELOAD AUDIT",
    title: "Bonus Edge Calculator",
    description: "We audit the house's latest 'reload bonus' to show you the real RTP math hidden in their terms. Know the edge.",
    status: "coming-soon",
    gridClasses: "",
  },
];
