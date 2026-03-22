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
    title: "Auto-Vault",
    description: "Move winnings to cold storage automatically. You can't bet what isn't in the hot wallet.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/rng-audit",
    icon: "rng-audit.svg",
    category: "RNG AUDIT",
    title: "RNG Audit",
    description: "We verify the casino's hashes so you don't have to.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/domain-verifier",
    icon: "domain-verifier.svg",
    category: "DOMAIN VERIFIER",
    title: "Domain Verifier",
    description: "Stops phishing clones and other shady sites before they get your keys.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/session-stats",
    icon: "session-stats.svg",
    category: "SESSION STATS",
    title: "Session Stats",
    description: "No fluff. Just your PnL, tilt triggers, and session performance.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/justthetip",
    icon: "justthetip.svg",
    category: "JUSTTHETIP",
    title: "JustTheTip",
    description: "Anonymous, on-chain tipping protocol for the degen community.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/degens-arena",
    icon: "degens-arena.svg",
    category: "DEGENS AGAINST DECENCY",
    title: "Degens Arena",
    description: "Multiplayer insult arena. The only thing you can lose is your dignity.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/scan-scams",
    icon: "scan-scams.svg",
    category: "SCAN FOR SCAMS",
    title: "Scan for Scams",
    description: "Our community-powered trust engine for online casinos.",
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
