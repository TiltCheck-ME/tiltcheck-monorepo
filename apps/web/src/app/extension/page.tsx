/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
import "@/styles/stepper.css";

export default function ExtensionPage() {
  return (
    <div className="container mx-auto px-4 py-24 text-center max-w-5xl">
        <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="THE SURVEILLANCE LAYER">
          THE SURVEILLANCE LAYER
        </h1>
        <div className="border-l-4 border-[#17c3b2] bg-[#17c3b2]/5 p-6 mb-16 mx-auto max-w-2xl text-left">
          <p className="font-mono text-sm uppercase tracking-widest text-[#17c3b2] mb-2 font-black">
            SIGNAL OVER NOISE.
          </p>
          <p className="text-gray-400 font-mono text-xs italic leading-relaxed">
            The TiltCheck extension is a non-custodial, read-only audit engine. It monitors your session telemetry, verifies RNG signatures, and enforces your own profit targets. No keys. No custody. Just the math.
          </p>
        </div>

        <div className="stepper-vertical max-w-4xl mx-auto text-left space-y-12">
          <div className="stepper-item active relative pl-12 border-l border-[#283347]" aria-current="step">
            <div className="absolute -left-4 top-0 w-8 h-8 rounded-none bg-black border border-[#17c3b2] flex items-center justify-center text-[#17c3b2] font-mono text-xs font-black">01</div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">INITIALIZE_SENTRY</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Install the extension. It operates in the background, listening to casino API responses in real-time. It doesn&apos;t ask for your seed phrase because it doesn&apos;t need it. It only needs the data.
            </p>
          </div>

          <div className="stepper-item relative pl-12 border-l border-[#283347]">
            <div className="absolute -left-4 top-0 w-8 h-8 rounded-none bg-black border border-[#283347] flex items-center justify-center text-gray-500 font-mono text-xs">02</div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">TELEMETRY_AUDIT</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              The engine tracks every play, mapping your betting frequency and variance against theoretical RTP. If the house starts shadow-buffing edges or your betting looks like a mental spiral, the system flags the drift.
            </p>
          </div>

          <div className="stepper-item relative pl-12 border-l border-[#283347]">
            <div className="absolute -left-4 top-0 w-8 h-8 rounded-none bg-black border border-[#17c3b2] flex items-center justify-center text-[#17c3b2] font-mono text-xs font-black">03</div>
            <h3 className="text-xl font-black uppercase tracking-tight text-[#17c3b2] mb-2">REDEEM_TO_WIN</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              When the math hits your pre-set tilt limit or profit target, the UI locks. Access to the casino is restricted. Your winning session is secured. Go touch grass, recalibrate, and come back when the math maths again.
            </p>
            <div className="mt-4 p-3 bg-[#17c3b2]/5 border border-[#17c3b2]/20 inline-block text-[10px] font-mono text-[#17c3b2] uppercase tracking-widest">
              PROTOCOL: LOCKDOWN_ENGAGED
            </div>
          </div>
        </div>
    </div>
  );
}
