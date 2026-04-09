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
              [AUDIT LAYER]: ONLINE AND PISSED
            </p>
            <p className="text-gray-400 text-xs leading-relaxed font-mono italic">
              The casino's RNG is more rigged than your last relationship. We're not here to judge—we're here to show you the math before you hemorrhage your rent money. Sniff out the shadow nerfs, catch the RTP drifts, and know when to fucking fold.
            </p>
          </div>

          <div className="hero-actions flex-wrap gap-4 justify-center">
            <a href="/beta-tester" className="btn btn-primary shadow-lg hover:shadow-[0_0_20px_rgba(23,195,178,0.6)]" data-text="DEPLOY THE AUDIT LAYER">
              DEPLOY THE AUDIT LAYER
            </a>
            <a href="#tools" className="btn btn-secondary border-[#17c3b2] text-[#17c3b2] hover:border-[#17c3b2] hover:bg-[#17c3b2]/10" data-text="BROWSE THE ARSENAL">
              BROWSE THE ARSENAL
            </a>
          </div>
        </div>
      </section>

      <div className="w-full max-w-7xl mx-auto px-4 mb-20 text-center">
        <p className="hero-body max-w-4xl mx-auto border border-[#283347] p-8 bg-black/40 text-[#ffffff]">
          The house has the math. You have hope and a problem. <span className="text-[#17c3b2] font-black">We have receipts.</span> TiltCheck is the forensic audit layer that catches every shadow nerf, RTP drift, and rigged bullshit before your next spin. We don't judge. We just show you the numbers so you can make a real choice instead of a degen choice.
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
