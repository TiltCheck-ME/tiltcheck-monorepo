/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
export default function TermsPage() {
  return (
    <div className="min-h-screen pt-32 pb-12 px-4 flex items-center justify-center bg-black relative">
      <div className="max-w-3xl w-full text-center flex flex-col gap-8 animate-in fade-in duration-500">
        <header className="border-b border-[#283347] pb-6">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#17c3b2]">
            THE DEGEN LAWS
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-gray-500">
            VERSION 2.0 — LAST UPDATED 2026-04-09
          </p>
        </header>

        <section className="terminal-box border-[#283347] p-8 bg-black/60 text-left">
          <p className="font-mono text-sm text-gray-400 mb-6 italic leading-relaxed">
            &quot;Casinos don&apos;t win because they&apos;re lucky. They win because they have the math and you have a dopamine problem. We can count too.&quot;
          </p>

          <div className="space-y-4">
             <div className="p-4 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
               <h3 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-1">01. NON-CUSTODIAL</h3>
               <p className="text-xs text-gray-500">We do not hold your funds. You are the only architect of your vault.</p>
             </div>
             <div className="p-4 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
               <h3 className="text-[#17c3b2] font-mono text-xs font-black uppercase mb-1">02. AUDIT ONLY</h3>
               <p className="text-xs text-gray-500">TiltCheck is a read-only surveillance layer for your own session telemetry.</p>
             </div>
             <div className="p-4 border border-yellow-500/20 bg-yellow-500/5">
               <h3 className="text-yellow-500 font-mono text-xs font-black uppercase mb-1">03. ZERO ADVICE</h3>
               <p className="text-xs text-gray-500">We provide the math. What you do with your variance is your own burden.</p>
             </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-[#283347]">
            <p className="text-[10px] text-gray-600 font-mono uppercase leading-relaxed">
              TiltCheck is an audit and transparency tool, not a gambling operator. Nothing here constitutes financial or gambling advice. You are responsible for your own decisions. Full terms are reviewed annually and updated here.
            </p>
          </div>
        </section>

        <a href="/" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-[0.3em] transition-colors">
          &lt; RETURN_TO_TERMINAL
        </a>
      </div>
    </div>
  );
}
