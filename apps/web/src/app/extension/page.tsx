const Stepper = () => {
  // Data from plan.md
  const steps = [
    {
      number: "01",
      title: "plug in.",
      description: "Install the extension. It's read-only. We don't touch your keys, we just watch the API calls.",
      subtext: null,
    },
    {
      number: "02",
      title: "the pulse.",
      description: "The bot tracks your betting frequency and size. If the math starts looking like a mental breakdown, we flag it.",
      subtext: null,
    },
    {
      number: "03",
      title: "touch grass.",
      description: "When you hit your pre-set tilt limit, the UI locks. Your remaining balance is pushed to a vault.",
      subtext: "We lock the UI so you don't go to zero. Go outside, the sun is out.",
    },
  ];

  return (
    <div className="stepper-vertical">
      {steps.map((step, index) => (
        <div key={step.number} className={`stepper-item ${index === 0 ? 'active' : ''}`}>
          <div className="step-number">{step.number}</div>
          <h3 className="step-title" data-slang={step.title}>{step.title}</h3>
          <p className="step-description">{step.description}</p>
          {step.subtext && <p className="step-subtext">{step.subtext}</p>}
        </div>
      ))}
    </div>
  );
};


export default function ExtensionPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      <section className="w-full max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold uppercase">How It Works</h1>
        <p className="mt-4 text-lg text-gray-400">
          The TiltCheck extension runs silently in the background, giving you an audit layer without getting in the way.
        </p>
      </section>
      <section className="w-full max-w-4xl mx-auto mt-16">
        <Stepper />
      </section>
    </main>
  );
}
