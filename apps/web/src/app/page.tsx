import ToolCard from "@/components/ToolCard";
import LiveAuditLog from "@/components/LiveAuditLog";
import { features } from "@/config/features";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      {/* Hero Section */}
      <section className="hero-surface">
        <div className="hero-content">
          <h1 className="neon neon-main neon-hero-top" data-text="HOUSE ALWAYS WINS?">
            HOUSE ALWAYS WINS?
          </h1>
          <h1 className="neon neon-main neon-hero-bottom" data-text="FUCK THAT.">
            FUCK THAT.
          </h1>
          <p className="hero-body">
            THE HOUSE WINS BECAUSE THEY OWN THE MATH AND YOU HAVE A DOPAMINE PROBLEM. TiltCheck is your browser-side audit layer and digital emergency brake. We don&apos;t guarantee you&apos;ll win; we just make sure you don&apos;t get cheated or liquidated by a bad session.
          </p>
          <div className="hero-actions">
            <a href="#tools" className="btn btn-primary" data-text="SECURE THE BAG">
              SECURE THE BAG
            </a>
            <a href="#tools" className="btn btn-secondary" data-text="CHECK THE MATH">
              CHECK THE MATH
            </a>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="w-full max-w-7xl mx-auto px-4">
        <h2 className="text-center text-3xl font-bold uppercase tracking-wider">
          The Degen Audit Layer
        </h2>
        <div className="mt-8 tools-bento-grid">
          <LiveAuditLog />
          {features.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>
      </section>
    </main>
  );
}
