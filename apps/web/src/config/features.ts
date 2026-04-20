/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20 */
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
    description: "Lock in a win before impulse gives it back. TiltCheck helps route profit toward your vault flow while the player stays in control.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/verify",
    icon: "/assets/canva/shield-checkmark.jpg",
    category: "RECEIPTS",
    title: "Manual Bet Verifier",
    description: "Paste the seed inputs and nonce. TiltCheck reruns the fairness math for one bet so you can verify the receipt yourself.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/domain-verifier",
    icon: "/assets/canva/padlock-v2.jpg",
    category: "PHISHING SHIELD",
    title: "Phishing Shield",
    description: "Check a casino link before you click. TiltCheck flags risky domains, suspicious certificates, and known scam surfaces.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/session-stats",
    icon: "/assets/canva/lightning-bolt.jpg",
    category: "TILT TELEMETRY",
    title: "RTP Drift Monitor",
    description: "See which platforms appear to be running weaker RTP tiers than players expect. Track drift, estimated cost, and cash-out pressure in one place.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/justthetip",
    icon: "/assets/canva/wallet-solana.jpg",
    category: "JUSTTHETIP",
    title: "JustTheTip (P2P Gossip)",
    description: "Pass tips and intel to other players without a middleman. Built for direct community sharing, not platform tax.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/tools/degens-arena",
    icon: "/assets/canva/crossed-swords.jpg",
    category: "DEGENS AGAINST DECENCY",
    title: "Degen Trivia",
    description: "Live trivia already runs through Discord. This page explains the format, round flow, and access path without pretending the web page is the whole product.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/beta-tester",
    icon: "/assets/canva/brain-circuit.jpg",
    category: "THE BLACKLIST",
    title: "Casino Blacklist",
    description: "Track casinos that cap winners, delay withdrawals, or quietly punish profitable players. If the pattern is real, it belongs on the list.",
    status: "coming-soon",
    gridClasses: "",
  },
  {
    href: "/tools/house-edge-scanner",
    icon: "/assets/canva/balance-scale.jpg",
    category: "RTP FORENSICS",
    title: "House Edge Scanner",
    description: "Compare claimed RTP to live observed behavior and see how expensive the gap may be per $100 wagered.",
    status: "live",
    gridClasses: "",
  },
  {
    href: "/bonuses",
    icon: "/assets/canva/puzzle-piece.jpg",
    category: "BONUS INTEL",
    title: "Daily Bonus Tracker",
    description: "Track public bonuses worth claiming without digging through casino clutter. Refreshed often and filtered for actual value.",
    status: "live",
    gridClasses: "",
  },
];
