/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-24 */
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
  "Players get live Auto-Pilot detection and behavioral circuit breakers.",
  "Platforms get a public way to prove their numbers hold up.",
  "Same audit layer. Honest outcomes for both sides.",
];

const playerBenefits: BenefitItem[] = [
  {
    icon: <Brain className="vp-benefit-icon" />,
    label: "Real-time tilt detection",
    description:
      "Know when you've hit The Loop. TiltCheck spots Auto-Pilot patterns — rapid clicking, loss chasing, Martingale spirals — before your bankroll pays the tuition.",
  },
  {
    icon: <Vault className="vp-benefit-icon" />,
    label: "Lock wins behind your rules",
    description: "Set the line, trigger the vault flow, and get profit out of easy reach before The Loop convinces you to spin it back.",
  },
  {
    icon: <ShieldCheck className="vp-benefit-icon" />,
    label: "Provably fair seed audits",
    description: "Paste the seed inputs, rerun the math, and keep the receipts when a fairness claim needs proof.",
  },
  {
    icon: <ChartLine className="vp-benefit-icon" />,
    label: "RTP drift exposed",
    description: "See when a casino is running a weaker RTP tier than advertised. Track the gap, see the cost per $100 wagered, and read the actual receipts.",
  },
  {
    icon: <Users className="vp-benefit-icon" />,
    label: "Community-verified intel",
    description: "Casino trust scores, scam reports, and shadow-ban logs in one place. Community-verified, not casino-sponsored.",
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
          <h2 className="vp-title">TiltCheck breaks The Loop. For players who know the feeling.</h2>
          <p className="vp-lead">
            TiltCheck is a shared audit surface. Players use it to kill Auto-Pilot mode and protect bankrolls. Platforms use it to show their numbers don't lie.
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
              <h3 className="vp-column-title">Break The Loop</h3>
              <p className="vp-column-subtitle">
                Live session data, behavioral triggers, and hard exits — so you stop playing on Auto-Pilot when the session turns stupid.
              </p>
            </div>
            <BenefitList items={playerBenefits} />
            <div className="vp-column-cta">
              <a
                href="/extension"
                className="btn btn-primary"
                data-funnel-event="player_value_prop_install_click"
                data-funnel-source="web-home-value-prop"
                data-funnel-label="Install the Extension"
              >
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
