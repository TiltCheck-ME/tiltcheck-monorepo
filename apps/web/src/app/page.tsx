import ToolCard from "@/components/ToolCard";
import LiveAuditLog from "@/components/LiveAuditLog";
import { features } from "@/config/features";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      {/* Hero Section */}
      <section className="hero-surface">
        <div className="hero-content">
          <h1 className="neon neon-main neon-hero-top" data-text="THE HOUSE ALWAYS WINS?">
            THE HOUSE ALWAYS WINS?
          </h1>
          <h1 className="neon neon-main neon-hero-bottom" data-text="FUCK THAT.">
            FUCK THAT.
          </h1>
          <p className="hero-body">
            THEY ONLY WIN BECAUSE THEY HAVE THE MATH AND YOU HAVE A DOPAMINE PROBLEM. BUT WE CAN COUNT TOO. TILTCHECK IS THE AUDIT LAYER BUILT TO TILT THE FAIRNESS SCALE BACK IN YOUR FAVOR. LEVEL THE PLAYING FIELD. CUZ MATH MATHS.
          </p>
          <div className="hero-actions">
            <a href="#tools" className="btn btn-primary" data-text="SECURE YOUR WIN">
              SECURE YOUR WIN
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
          The Profit Guard Audit Layer
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
