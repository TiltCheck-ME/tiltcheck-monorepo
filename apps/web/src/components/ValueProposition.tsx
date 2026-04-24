/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
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
  "Players get live session defense and proof.",
  "Platforms get a public way to prove they are not hiding.",
  "Same audit layer. Clearer outcomes for both sides.",
];

const playerBenefits: BenefitItem[] = [
  {
    icon: <Brain className="vp-benefit-icon" />,
    label: "Real-time tilt detection",
    description:
      "Know when your session is getting sloppy. TiltCheck spots risky patterns before your bankroll pays for them.",
  },
  {
    icon: <Vault className="vp-benefit-icon" />,
    label: "Lock wins behind your rules",
    description: "Set the line, trigger the vault flow, and get profit out of easy reach before you spin it back.",
  },
  {
    icon: <ShieldCheck className="vp-benefit-icon" />,
    label: "Provably fair seed audits",
    description: "Paste the seed inputs, rerun the math, and keep the receipts when a fairness claim needs proof.",
  },
  {
    icon: <ChartLine className="vp-benefit-icon" />,
    label: "RTP drift alerts",
    description: "See when a casino is running a weaker RTP tier than players expect, and what that gap is costing.",
  },
  {
    icon: <Users className="vp-benefit-icon" />,
    label: "Community-verified intel",
    description: "Trust scores, scam checks, and player intel in one place instead of scattered across group chats.",
  },
];

const platformBenefits: BenefitItem[] = [
  {
    icon: <BadgeCheck className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Certified trust scores",
    description: "Earn a public TiltCheck Trust Score so players can see proof instead of another empty brand claim.",
  },
  {
    icon: <Undo2 className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Reduce chargebacks and disputes",
    description: "When players can verify what happened, weak disputes lose oxygen and support teams waste less time.",
  },
  {
    icon: <ShieldCheck className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Provably fair compliance layer",
    description: "Let players inspect fairness inputs directly instead of asking them to trust a black box.",
  },
  {
    icon: <Target className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Attract high-value players",
    description: "Sharp players want platforms that do not hide. Transparent proof makes that obvious.",
  },
  {
    icon: <Leaf className="vp-benefit-icon vp-benefit-icon--gold" />,
    label: "Responsible gaming built in",
    description: "Session guardrails and intervention flows help honest platforms show they take player risk seriously.",
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
          <span className="brand-eyebrow">One product. Two sides of the market.</span>
          <h2 className="vp-title">TiltCheck protects players and gives honest platforms a way to prove it.</h2>
          <p className="vp-lead">
            TiltCheck is a shared audit surface. Players use it to protect bankrolls and verify claims. Platforms use it
            to show that their numbers and behavior hold up in public.
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
                Use live session data, fairness checks, and hard exits to stop guessing when the session turns on you.
              </p>
            </div>
            <BenefitList items={playerBenefits} />
            <div className="vp-column-cta">
              <a href="/extension" className="btn btn-primary">
                INSTALL THE EXTENSION
              </a>
            </div>
          </div>

          <div className="vp-column vp-column--platform">
            <div className="vp-column-header">
              <span className="vp-column-eyebrow vp-column-eyebrow--platform">For platforms</span>
              <h3 className="vp-column-title">Prove the platform</h3>
              <p className="vp-column-subtitle">
                If the platform is actually clean, the audit layer should make that obvious without a sales pitch.
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
