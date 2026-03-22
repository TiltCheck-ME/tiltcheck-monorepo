import ToolCard from "@/components/ToolCard";
import LiveAuditLog from "@/components/LiveAuditLog";

const tools = [
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
    gridClasses: "md:row-span-2", // Spans two rows on medium screens and up
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


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      {/* Hero Section */}
      <section className="text-center my-16 lg:my-24">
        <h1
          className="text-5xl lg:text-7xl font-bold uppercase tracking-tighter"
          data-slang="HOUSE ALWAYS WINS?"
        >
          HOUSE ALWAYS WINS?
        </h1>
        <p className="mt-4 text-lg text-gray-400" data-slang="your dopamine is cooked.">
          your dopamine is cooked.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="#tools" className="btn btn-primary" data-text="LOCK PROFITS" data-slang="LOCK PROFITS">
            LOCK PROFITS
          </a>
          <a href="#tools" className="btn btn-secondary" data-text="VERIFY THE DRIFT" data-slang="VERIFY THE DRIFT">
            VERIFY THE DRIFT
          </a>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="w-full max-w-7xl mx-auto px-4">
        <h2 className="text-center text-3xl font-bold uppercase tracking-wider">
          The Degen Audit Layer
        </h2>
        <div className="mt-8 tools-bento-grid">
          <LiveAuditLog />
          {tools.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>
      </section>
    </main>
  );
}
