/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15 */
import "@/styles/stepper.css";

export default function ExtensionPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#17c3b2]/20 py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="brand-eyebrow">Extension / Audit Layer</div>
          <h1 className="brand-page-title">
            <span className="text-[#17c3b2]">The casino audit engine.</span>
            <br />
            Loaded in your tab.
          </h1>
          <p className="brand-lead mx-auto mt-8">
            TiltCheck runs as a non-custodial, read-only browser extension. It watches live session telemetry,
            checks RTP drift and fairness signals, and enforces the guardrails you set. No keys. No custody. Just the math.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 text-left">
            <a
              href="/downloads/tiltcheck-extension.zip"
              download
              className="border border-[#17c3b2]/40 bg-[#17c3b2]/10 p-6 transition-colors hover:bg-[#17c3b2]/15"
            >
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#17c3b2] mb-3">
                Download beta package
              </p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
                Get the current sideload zip
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Download the real beta artifact, unzip it locally, then load the bundled extension in Chrome or Brave.
              </p>
            </a>

            <a
              href="/beta-tester"
              className="border border-[#283347] bg-black/20 p-6 transition-colors hover:border-[#17c3b2]/40 hover:bg-white/5"
            >
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#17c3b2] mb-3">
                Need approval first
              </p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
                Apply for beta access
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Use this if you want extension access, dashboard access, and test coverage updates instead of a cold sideload.
              </p>
            </a>
          </div>

          <p className="text-gray-600 font-mono text-xs mt-6">
            Current package: <code className="bg-white/5 px-2 py-1">tiltcheck-extension.zip</code>. Chrome Web Store listing is not live yet.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Read-only by design',
              body: 'The extension inspects casino responses and session state. It does not ask for seed phrases and it does not custody funds.',
            },
            {
              title: 'Built for live sessions',
              body: 'It stays inside the tab, tracks drift, and surfaces tilt signals without forcing you to swap windows mid-session.',
            },
            {
              title: 'Own your exits',
              body: 'Profit targets, cooldowns, and vault workflows are yours to set. TiltCheck just enforces the line when your brain refuses to.',
            },
          ].map(({ title, body }) => (
            <div key={title} className="border border-[#283347] bg-black/20 p-6">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#17c3b2] mb-3">
                Core signal
              </p>
              <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">{title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#283347] bg-black/20 py-16 px-4">
        <div className="stepper-vertical max-w-4xl mx-auto text-left space-y-12">
          <div className="stepper-item active relative pl-12 border-l border-[#283347]" aria-current="step">
            <div className="absolute -left-4 top-0 w-8 h-8 rounded-none bg-black border border-[#17c3b2] flex items-center justify-center text-[#17c3b2] font-mono text-xs font-black">01</div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Download and unpack</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Grab the beta zip, extract it locally, and keep the bundled extension folder intact. Do not point Chrome at the zip itself.
            </p>
          </div>

          <div className="stepper-item relative pl-12 border-l border-[#283347]">
            <div className="absolute -left-4 top-0 w-8 h-8 rounded-none bg-black border border-[#283347] flex items-center justify-center text-gray-500 font-mono text-xs">02</div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Load it in Chrome or Brave</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Open <span className="text-[#17c3b2] font-bold">chrome://extensions</span>, enable Developer mode, click
              <span className="text-[#17c3b2] font-bold"> Load unpacked</span>, and select the extracted extension folder.
            </p>
          </div>

          <div className="stepper-item relative pl-12 border-l border-[#283347]">
            <div className="absolute -left-4 top-0 w-8 h-8 rounded-none bg-black border border-[#17c3b2] flex items-center justify-center text-[#17c3b2] font-mono text-xs font-black">03</div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#17c3b2] mb-2">Arm the audit layer</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Open a supported casino tab and let TiltCheck watch the math. It tracks session telemetry, fairness inputs, and the guardrails you already configured.
            </p>
            <div className="mt-4 p-3 bg-[#17c3b2]/5 border border-[#17c3b2]/20 inline-block text-[10px] font-mono text-[#17c3b2] uppercase tracking-widest">
              Protocol: lockdown_engaged
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
          <div className="border border-[#283347] bg-black/20 p-6">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#17c3b2] mb-3">What it covers</p>
            <ul className="space-y-3 text-sm text-gray-400 leading-relaxed">
              <li>Real-time session telemetry and tilt detection.</li>
              <li>RTP drift and fairness checks against certified numbers.</li>
              <li>Vault prompts, cooldown signals, and intervention flows.</li>
              <li>Sidebar-driven workflow for supported casino tabs.</li>
            </ul>
          </div>

          <div className="border border-[#ef4444]/30 bg-[#ef4444]/5 p-6">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#ef4444] mb-3">Known beta gap</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              The extension is currently sidebar-first. The toolbar popup entry point is not fully implemented yet, so the beta path is honest:
              sideload the package, use the sidebar flow, and treat the store listing as not live.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#283347] py-8 px-4 text-center">
        <p className="text-xs text-gray-600 font-mono">Made for Degens. By Degens.</p>
      </footer>
    </main>
  );
}
