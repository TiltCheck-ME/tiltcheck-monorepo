/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
export default function LimitPage() {
  return (
    <div className="min-h-screen pt-32 pb-12 px-4 flex items-center justify-center bg-black">
      <div className="max-w-2xl w-full text-center flex flex-col gap-6">
        <header className="border-b border-[#283347] pb-6">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#17c3b2]">
            Asset Risk Limits
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-gray-500">
            Self-exclusion and deposit limit tools — coming soon
          </p>
        </header>
        <div className="p-8 border border-[#283347] bg-black/60 text-left space-y-4">
          <p className="text-xs font-mono text-gray-400 leading-relaxed">
            This section will let you configure hard limits on session length, deposit amounts, and loss thresholds. The vault locks your wins — this locks your future inputs. Both matter.
          </p>
          <p className="text-xs font-mono text-gray-500 leading-relaxed">
            For immediate responsible gaming support, use the <a href="/touch-grass" className="text-[#17c3b2] hover:underline">Touch Grass Protocol</a> or call <a href="tel:1-800-426-2537" className="text-[#17c3b2] hover:underline">1-800-GAMBLER</a>.
          </p>
        </div>
        <a href="/" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-[0.3em] transition-colors">
          &lt; RETURN_TO_TERMINAL
        </a>
      </div>
    </div>
  );
}
