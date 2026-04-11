/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11 */
export default function LegalPage() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-4 bg-black relative">
      <div className="max-w-2xl mx-auto flex flex-col gap-10 animate-in fade-in duration-500">

        <header className="border-b border-[#283347] pb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">Legal</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#17c3b2]">Legal Documents</h1>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">
            Everything you need to understand what TiltCheck is, what it does with your data,
            and what you are agreeing to when you use it.
          </p>
        </header>

        <div className="space-y-4">

          <a href="/terms" className="group flex items-start gap-5 p-6 border border-[#283347] hover:border-[#17c3b2] transition-all duration-200 bg-black/40 hover:bg-[#17c3b2]/5">
            <div className="w-2 h-full min-h-[2rem] bg-[#17c3b2] shrink-0 mt-1"></div>
            <div className="flex-1">
              <h2 className="text-sm font-black uppercase tracking-tighter text-white group-hover:text-[#17c3b2] transition-colors">Terms of Service</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Age requirements, what TiltCheck is and isn&apos;t, non-custodial clause, payment policy, prohibited uses, and liability limits.
              </p>
            </div>
            <span className="text-xs text-gray-600 group-hover:text-[#17c3b2] transition-colors shrink-0 self-center">v2.1 →</span>
          </a>

          <a href="/privacy" className="group flex items-start gap-5 p-6 border border-[#283347] hover:border-[#17c3b2] transition-all duration-200 bg-black/40 hover:bg-[#17c3b2]/5">
            <div className="w-2 h-full min-h-[2rem] bg-[#17c3b2] shrink-0 mt-1"></div>
            <div className="flex-1">
              <h2 className="text-sm font-black uppercase tracking-tighter text-white group-hover:text-[#17c3b2] transition-colors">Privacy Policy</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                What data we collect (Discord ID, wallet address, session events), what we never collect (private keys), retention windows, and your deletion rights.
              </p>
            </div>
            <span className="text-xs text-gray-600 group-hover:text-[#17c3b2] transition-colors shrink-0 self-center">v1.1 →</span>
          </a>

          <a href="/legal/limit" className="group flex items-start gap-5 p-6 border border-[#283347] hover:border-amber-500 transition-all duration-200 bg-black/40 hover:bg-amber-500/5">
            <div className="w-2 h-full min-h-[2rem] bg-amber-500 shrink-0 mt-1"></div>
            <div className="flex-1">
              <h2 className="text-sm font-black uppercase tracking-tighter text-white group-hover:text-amber-500 transition-colors">Risk Limits</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Set your own daily deposit cap, session time limit, and loss threshold. Stored locally. No account required.
              </p>
            </div>
            <span className="text-xs text-gray-600 group-hover:text-amber-500 transition-colors shrink-0 self-center">Configure →</span>
          </a>

        </div>

        <div className="p-5 border border-[#283347] bg-black/40">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">Questions or Requests</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400">
            <div>
              <p className="text-gray-600 uppercase tracking-widest text-[9px] mb-1">Legal</p>
              <a href="mailto:legal@tiltcheck.me" className="text-[#17c3b2] hover:underline">legal@tiltcheck.me</a>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-widest text-[9px] mb-1">Privacy / Data Requests</p>
              <a href="mailto:privacy@tiltcheck.me" className="text-[#17c3b2] hover:underline">privacy@tiltcheck.me</a>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-widest text-[9px] mb-1">Billing</p>
              <a href="mailto:support@tiltcheck.me" className="text-[#17c3b2] hover:underline">support@tiltcheck.me</a>
            </div>
          </div>
        </div>

        <a href="/" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-widest transition-colors">Return to Terminal</a>

        <p className="text-center text-[10px] font-mono text-gray-600 uppercase tracking-widest">Made for Degens. By Degens.</p>
      </div>
    </div>
  );
}
