// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15
import React from 'react';
import {
  Brain,
  Vault,
  ShieldCheck,
  ChartLine,
  Users,
  BadgeCheck,
  Undo2,
  Handshake,
  Target,
  Leaf,
} from 'lucide-react';

type BenefitItem = {
  icon: React.ReactNode;
  label: string;
  description: string;
};

const playerBenefits: BenefitItem[] = [
  {
    icon: <Brain className="vp-benefit-icon" />,
    label: 'Real-time tilt detection',
    description:
      'Know when your brain is working against you. Session monitoring catches emotional betting before your bankroll does.',
  },
  {
    icon: <Vault className="vp-benefit-icon" />,
    label: 'Auto-lock wins to cold storage',
    description:
      'Your keys, our guardrails. Profits move to your vault automatically. Zero custodial risk.',
  },
  {
    icon: <ShieldCheck className="vp-benefit-icon" />,
    label: 'Provably fair seed audits',
    description:
      'Paste the HMAC-SHA256 seeds. We run the math. If the house lied, we find it.',
  },
  {
    icon: <ChartLine className="vp-benefit-icon" />,
    label: 'RTP drift alerts',
    description:
      'See the gap between advertised and actual return rates. Live. Per game. Per platform.',
  },
  {
    icon: <Users className="vp-benefit-icon" />,
    label: 'Community-verified intel',
    description:
      'Bonus tracking, casino blacklists, and scam registries. Sourced by degens, for degens.',
  },
];

const platformBenefits: BenefitItem[] = [
  {
    icon: <BadgeCheck className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: 'Certified trust scores',
    description:
      'Earn a public TiltCheck Trust Score. Players see it. Competitors don\'t have one.',
  },
  {
    icon: <Undo2 className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: 'Reduce chargebacks and disputes',
    description:
      'When players verify fairness themselves, disputes drop. Transparency pays for itself.',
  },
  {
    icon: <ShieldCheck className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: 'Provably fair compliance layer',
    description:
      'Integrate our audit layer. Let players verify seeds directly. No black boxes.',
  },
  {
    icon: <Target className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: 'Attract high-value players',
    description:
      'Degens want platforms that don\'t hide. A TiltCheck badge signals you play fair.',
  },
  {
    icon: <Leaf className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: 'Responsible gaming built in',
    description:
      'Touch Grass Protocol and session monitoring satisfy regulatory requirements out of the box.',
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
    <section className="vp-section" aria-label="Value proposition for players and platforms">
      <div className="vp-header">
        <span className="brand-eyebrow">WHO IS THIS FOR</span>
        <h2 className="vp-title">
          Two sides of the table.<br />
          <span className="vp-title-accent">One audit layer.</span>
        </h2>
      </div>

      <div className="vp-grid">
        {/* Player Column */}
        <div className="vp-column vp-column--player">
          <div className="vp-column-header">
            <span className="vp-column-eyebrow vp-column-eyebrow--player">For Players</span>
            <h3 className="vp-column-title">The edge is yours</h3>
            <p className="vp-column-subtitle">
              Stop guessing. Start auditing. Every tool built to keep your bankroll intact.
            </p>
          </div>
          <BenefitList items={playerBenefits} />
          <div className="vp-column-cta">
            <a href="/beta-tester" className="btn btn-primary">
              GET EARLY ACCESS
            </a>
          </div>
        </div>

        {/* Platform Column */}
        <div className="vp-column vp-column--platform">
          <div className="vp-column-header">
            <span className="vp-column-eyebrow vp-column-eyebrow--platform">For Platforms</span>
            <h3 className="vp-column-title">Prove you are legit</h3>
            <p className="vp-column-subtitle">
              Transparency is a competitive advantage. Get certified or get left behind.
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
    </section>
  );
}
