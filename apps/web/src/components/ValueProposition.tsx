/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import React from "react";
import {
  BadgeCheck,
  Brain,
  ChartLine,
  Handshake,
  Leaf,
  ShieldCheck,
  Target,
  Undo2,
  Users,
  Vault,
} from "lucide-react";

type BenefitItem = {
  icon: React.ReactNode;
  label: string;
  description: string;
};

const sectionSignals = [
  "Players get bankroll defense and proof.",
  "Platforms get public trust and cleaner compliance posture.",
  "Same audit layer. Two very different wins.",
];

const playerBenefits: BenefitItem[] = [
  {
    icon: <Brain className="vp-benefit-icon" />,
    label: "Real-time tilt detection",
    description:
      "Know when your brain is working against you. Session monitoring catches emotional betting before your bankroll does.",
  },
  {
    icon: <Vault className="vp-benefit-icon" />,
    label: "Auto-lock wins to cold storage",
    description: "Your keys, our guardrails. Profits move to your vault automatically. Zero custodial risk.",
  },
  {
    icon: <ShieldCheck className="vp-benefit-icon" />,
    label: "Provably fair seed audits",
    description: "Paste the HMAC-SHA256 seeds. We run the math. If the house lied, we find it.",
  },
  {
    icon: <ChartLine className="vp-benefit-icon" />,
    label: "RTP drift alerts",
    description: "See the gap between advertised and actual return rates. Live. Per game. Per platform.",
  },
  {
    icon: <Users className="vp-benefit-icon" />,
    label: "Community-verified intel",
    description: "Bonus tracking, casino blacklists, and scam registries. Sourced by degens, for degens.",
  },
];

const platformBenefits: BenefitItem[] = [
  {
    icon: <BadgeCheck className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Certified trust scores",
    description: "Earn a public TiltCheck Trust Score. Players see it. Competitors do not have one.",
  },
  {
    icon: <Undo2 className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Reduce chargebacks and disputes",
    description: "When players verify fairness themselves, disputes drop. Transparency pays for itself.",
  },
  {
    icon: <ShieldCheck className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Provably fair compliance layer",
    description: "Integrate our audit layer. Let players verify seeds directly. No black boxes.",
  },
  {
    icon: <Target className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Attract high-value players",
    description: "Degens want platforms that do not hide. A TiltCheck badge signals you play fair.",
  },
  {
    icon: <Leaf className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Responsible gaming built in",
    description: "Touch Grass Protocol and session monitoring satisfy regulatory requirements out of the box.",
  },
];

function BenefitList({ items }: { items: BenefitItem[] }) {
  return (
    <ul className="vp-benefit-list">
      {items.map((item) => (
        <li key={item.label} className="vp-benefit-item">
          <span className="vp-benefit-icon-wrap">{item.icon}</span>
          <div>
            <p className="vp-benefit-label">{item.label}</p>
            <p className="vp-benefit-desc">{item.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ValueProposition() {
  return (
    <section className="landing-section vp-section" aria-label="Value proposition for players and platforms">
      <div className="vp-shell">
        <div className="vp-header">
          <span className="brand-eyebrow">Deeper than a landing page flex</span>
          <h2 className="vp-title">Built for players who verify and platforms willing to prove it.</h2>
          <p className="vp-lead">
            TiltCheck is a shared audit surface. One side protects bankrolls. The other side earns trust in public.
            Both sides get less room for hand-waving.
          </p>

          <ul className="vp-signal-list">
            {sectionSignals.map((signal) => (
              <li key={signal} className="vp-signal-pill">
                <Handshake className="vp-signal-pill__icon" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="vp-grid">
          <div className="vp-column vp-column--player">
            <div className="vp-column-header">
              <span className="vp-column-eyebrow vp-column-eyebrow--player">For players</span>
              <h3 className="vp-column-title">Protect the bankroll</h3>
              <p className="vp-column-subtitle">
                Stop guessing. Start auditing. Every layer here exists to keep winnings intact and bad sessions honest.
              </p>
            </div>
            <BenefitList items={playerBenefits} />
            <div className="vp-column-cta">
              <a href="/beta-tester" className="btn btn-primary">
                GET EARLY ACCESS
              </a>
            </div>
          </div>

          <div className="vp-column vp-column--platform">
            <div className="vp-column-header">
              <span className="vp-column-eyebrow vp-column-eyebrow--platform">For platforms</span>
              <h3 className="vp-column-title">Prove the platform</h3>
              <p className="vp-column-subtitle">
                Transparency is a competitive advantage. If you are legit, the audit layer should make that obvious.
              </p>
            </div>
            <BenefitList items={platformBenefits} />
            <div className="vp-column-cta">
              <a href="/collab" className="btn btn-secondary vp-btn-platform">
                PARTNER WITH US
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
