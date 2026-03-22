import "@/styles/stepper.css";

export default function ExtensionPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold tracking-tighter mb-4">the equalizer. in your browser.</h1>
        <p className="text-xl text-primary/80 max-w-2xl mx-auto mb-12">
          The TiltCheck extension is a read-only audit layer that monitors your casino session stats without ever touching your keys.
        </p>

        <div className="stepper-vertical max-w-3xl mx-auto text-left">
          <div className="stepper-item active" aria-current="step">
            <div className="step-number">01</div>
            <h3 className="step-title">plug in.</h3>
            <p className="step-description">Install the extension. It's read-only. We don't touch your keys, we just watch the API calls.</p>
          </div>

          <div className="stepper-item">
            <div className="step-number">02</div>
            <h3 className="step-title">the pulse.</h3>
            <p className="step-description">The bot tracks your betting frequency and size. If the math starts looking like a mental breakdown, we flag it.</p>
          </div>

          <div className="stepper-item">
            <div className="step-number">03</div>
            <h3 className="step-title">touch grass.</h3>
            <p className="step-description">When you hit your pre-set tilt limit, the UI locks. Your remaining balance is pushed to a vault.</p>
            <p className="step-subtext">We lock the UI so you don't go to zero. Go outside, the sun is out.</p>
          </div>
        </div>
    </div>
  );
}
