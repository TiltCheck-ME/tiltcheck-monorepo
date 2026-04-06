// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
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
    title: "Forensic Seed Audit",
    description: "Real-time binomial z-tests on every hash. If the randomness is drifting, we flag the breach. Cryptographic HMAC-SHA256 validation to ensure those 'bad beats' aren't manufactured.",
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
    title: "The Nerf Radar",
    description: "A global heatmap of which platforms are running the 'Greedy' versions of your favorite slots. Zero fluff. Pure session PnL, platform RTP deviation flags, and the 'Tough Love' intervention engine telemetry.",
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
    category: "RTP FORENSICS",
    title: "The Delta Engine",
    description: "We catch the difference between what they say it pays and what the math actually does. Cross-references your live session against GLI-certified manufacturer tiers to surface the Greed Premium in real-time.",
    status: "coming-soon",
    gridClasses: "",
  },
];
