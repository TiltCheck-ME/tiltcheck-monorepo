// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
import ToolCard from "@/components/ToolCard";
import LiveAuditLog from "@/components/LiveAuditLog";
import { features } from "@/config/features";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      {/* Hero Section */}
      <section className="hero-surface border-b border-[#283347] mb-12">
        <div className="hero-content py-20">
          <h1 className="neon neon-main neon-hero-top mb-1" data-text="HOUSE ALWAYS WINS?">
            HOUSE ALWAYS WINS?
          </h1>
          <h2 className="neon neon-main neon-hero-bottom text-red-500 mb-8" data-text="FUCK THAT.">
            FUCK THAT.
          </h2>

          <div className="border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-6 mb-10 max-w-3xl border-l-4 border-l-[#17c3b2] animate-in slide-in-from-left-4 duration-700">
            <p className="text-sm font-mono text-[#17c3b2]/80 uppercase tracking-widest mb-2 font-black">
              [AUDIT LAYER]: ACTIVE
            </p>
            <p className="text-gray-400 text-xs leading-relaxed font-mono italic">
              The house only wins because they control the math. We just took the keys. Stop playing against shadow-nerfed slots and 88% RTP traps. Deploy the Audit Layer to sniff out RNG drift and see the real math before you spin.
            </p>
          </div>

          <div className="hero-actions flex-wrap gap-4">
            <a href="/beta-tester" className="btn btn-primary" data-text="DEPLOY THE AUDIT LAYER">
              DEPLOY THE AUDIT LAYER
            </a>
            <a href="#tools" className="btn btn-secondary border-[#283347] text-gray-500" data-text="VIEW TOOLS">
              VIEW TOOLS
            </a>
          </div>
        </div>
      </section>

      <div className="w-full max-w-7xl mx-auto px-4 mb-20 text-center">
        <p className="hero-body max-w-4xl mx-auto border border-[#283347] p-8 bg-black/40 text-[#ffffff]">
          The house wins because they control the math and you have a dopamine problem. <span className="text-[#17c3b2] font-black">We just took the keys.</span> TiltCheck is the forensic audit layer that cross-references your live session against GLI-certified manufacturer RTP tiers. We catch the Greed Premium. We generate the evidence. We lock your bag before the tilt-tax takes the rest.
        </p>
      </div>

      {/* Tools Section */}
      <section id="tools" className="w-full max-w-7xl mx-auto px-4">
        <h2 className="text-center text-3xl font-bold uppercase tracking-widest neon neon-header" data-text="THE HOUSE EDGE NEUTRALIZER">
          THE HOUSE EDGE NEUTRALIZER
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
