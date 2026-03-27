import ToolCard from "@/components/ToolCard";
import LiveAuditLog from "@/components/LiveAuditLog";
import { features } from "@/config/features";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      {/* Hero Section */}
      <section className="hero-surface">
        <div className="hero-content">
          <h1 className="neon neon-main neon-hero-top" data-text="LOSE TRACK OF TIME?">
            LOSE TRACK OF TIME?
          </h1>
          <h1 className="neon neon-main neon-hero-bottom" data-text="WE GOT YOU.">
            WE GOT YOU.
          </h1>
          <p className="hero-body">
            The house wins because they have the math and you have a human brain. We&apos;re the friend who helps you keep your winnings. TiltCheck is your browser-side co-pilot that keeps you honest and helps you walk away with the bag.
          </p>
          <div className="hero-actions">
            <a href="#tools" className="btn btn-primary" data-text="PROTECT THE BAG">
              PROTECT THE BAG
            </a>
            <a href="#tools" className="btn btn-secondary" data-text="LEARN MORE">
              LEARN MORE
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
