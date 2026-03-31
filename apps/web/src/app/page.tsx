import ToolCard from "@/components/ToolCard";
import LiveAuditLog from "@/components/LiveAuditLog";
import { features } from "@/config/features";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      {/* Hero Section */}
      <section className="hero-surface border-b border-[#283347] mb-12">
        <div className="hero-content py-20">
          <h1 className="neon neon-main neon-hero-top mb-1" data-text="THE HOUSE ALWAYS WINS?">
            THE HOUSE ALWAYS WINS?
          </h1>
          <h2 className="neon neon-main neon-hero-bottom text-red-500 mb-8" data-text="FUCK THAT.">
            FUCK THAT.
          </h2>
          
          <div className="border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-6 mb-10 max-w-3xl border-l-4 border-l-[#17c3b2] animate-in slide-in-from-left-4 duration-700">
             <p className="text-sm font-mono text-[#17c3b2]/80 uppercase tracking-widest mb-2 font-black">
                [ACCESS]: ENCRYPTED — In Progress
             </p>
             <p className="text-gray-400 text-xs leading-relaxed font-mono italic">
                The math is ready. We just need real degens to kick the tires before this goes public. Support the GCP bill fund to **Overclock the Sprint** and ship it faster.
             </p>
          </div>

          <div className="hero-actions flex-wrap gap-4">
            <a href="/beta-tester" className="btn btn-primary" data-text="APPLY FOR ACCESS">
              APPLY FOR ACCESS
            </a>
            <a href="#tools" className="btn btn-secondary border-[#283347] text-gray-500" data-text="VIEW TOOLS">
              VIEW TOOLS
            </a>
          </div>
        </div>
      </section>

      <div className="w-full max-w-7xl mx-auto px-4 mb-20 text-center">
        <p className="hero-body max-w-4xl mx-auto border border-[#283347] p-8 bg-black/40 text-[#ffffff]">
          The house wins because they have the math and you have a dopamine problem. <span className="text-[#17c3b2] font-black">We can count too.</span> TiltCheck is the audit layer built to tilt the fairness scale back in your favor. Level the playing field.
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
