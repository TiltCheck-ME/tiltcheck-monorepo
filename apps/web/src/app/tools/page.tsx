/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import React from "react";
import Link from "next/link";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";

interface Tool {
  href: string;
  label: string;
  title: string;
  description: string;
  status: "live" | "beta" | "soon";
}

const TOOLS: Tool[] = [
  {
    href: "/tools/verify",
    label: "THE RECEIPT",
    title: "Manual Bet Verifier",
    description:
      "Independent manual bet verification using the TiltCheck 4-Key Lock or legacy server/client seed model. Recomputes the raw HMAC-SHA256 result for one bet. Use /casinos for proof quality and broader trust evidence.",
    status: "live",
  },
  {
    href: "/tools/session-stats",
    label: "RTP DRIFT MONITOR",
    title: "Slot Math Index",
    description:
      "Certified RTP tier spreads across 100+ slot titles. Shows the spread between the max and min RTP a casino can legally configure — and the greed premium they pocket from that gap.",
    status: "live",
  },
  {
    href: "/tools/house-edge-scanner",
    label: "THE DELTA ENGINE",
    title: "House Edge Calculator",
    description:
      "Input your certified vs observed RTP and session data. Get your personal greed premium overcharge and a statistical confidence score on whether the variance is real or manufactured.",
    status: "live",
  },
  {
    href: "/tools/domain-verifier",
    label: "PHISHING SHIELD",
    title: "Domain + Email Verifier",
    description:
      "Scan casino domains for license validity, phishing signals, SPF/SSL anomalies, and bonus extraction. Paste a suspicious email to identify impersonation attempts before they cost you.",
    status: "live",
  },
  {
    href: "/tools/scan-scams",
    label: "SHADOW-BAN TRACKER",
    title: "Casino Restriction Log",
    description:
      "Community-reported withdrawal delays, account locks, silent ToS changes, and payout denials. Updated from Discord reports and the Trust Engine. Named, dated, severity-graded.",
    status: "live",
  },
  {
    href: "/tools/collectclock",
    label: "COLLECTCLOCK",
    title: "BonusCheck 2.0",
    description:
      "Track cooldowns, log weekly wager and P/L, reverse-engineer reload math, and catch bonuses that land suspiciously light.",
    status: "live",
  },
  {
    href: "/tools/justthetip",
    label: "JUST THE TIP",
    title: "SOL Peer Tipping",
    description:
      "Send SOL tips to other degens via Discord username from the web UI. Non-custodial — keys never leave your wallet. Direct sends and room rain are both wired.",
    status: "live",
  },
  {
    href: "/tools/auto-vault",
    label: "LOCKVAULT",
    title: "Auto Profit Lock",
    description:
      "Lock profits behind a timer, manage releases, and update your redeem threshold from the web UI. Non-custodial. You set the line, the lock protects the bag.",
    status: "live",
  },
  {
    href: "/tools/buddy-system",
    label: "BUDDY SYSTEM",
    title: "Accountability Partner",
    description:
      "Add and manage accountability partners from the web UI. Buddies get support-only alerts when your session goes sideways. No bankroll sharing, no money asks.",
    status: "live",
  },
  {
    href: "/tools/geo-laws",
    label: "GEO LAWS",
    title: "Regulation by Region",
    description:
      "Online gambling laws by country — legal status, regulator, self-exclusion programs, and official links. Know your jurisdiction before you deposit anywhere.",
    status: "live",
  },
  {
    href: "/tools/degens-arena",
    label: "DEGENS ARENA",
    title: "Trivia Drop Arena",
    description:
      "Live trivia drops are already running on Discord via /triviadrop. The web surface is live as the briefing, rules, and access path — not the launch surface.",
    status: "live",
  },
];

function StatusBadge({ status }: { status: Tool["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-block rounded-full border border-[#17c3b2]/45 bg-[#17c3b2]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
        LIVE
      </span>
    );
  }

  if (status === "beta") {
    return (
      <span className="inline-block rounded-full border border-[#ffd700]/45 bg-[#ffd700]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd700]">
        BETA
      </span>
    );
  }

  return (
    <span className="inline-block rounded-full border border-gray-600/50 bg-gray-800/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
      IN DEV
    </span>
  );
}

export default function ToolsIndexPage() {
  const live = TOOLS.filter((tool) => tool.status === "live");
  const beta = TOOLS.filter((tool) => tool.status === "beta");
  const soon = TOOLS.filter((tool) => tool.status === "soon");

  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="TiltCheck Toolkit"
        title={
          <>
            The tools.
            <br />
            Built for receipts.
          </>
        }
        description={
          <p>
            Math-backed, no-fluff utilities for degens who want receipts. Verify bets. Track bonuses. Scan scams. Lock
            wins. Every tool here does one job and is framed the same way the homepage now frames the rest of the stack.
          </p>
        }
        stats={[
          {
            label: "Live surfaces",
            value: `${live.length}`,
            description: "Tools already shipping across verification, trust, bankroll defense, and utility workflows.",
          },
          {
            label: "Beta queue",
            value: `${beta.length}`,
            description: "New public surfaces stay visible without pretending unfinished work is ready for production.",
          },
          {
            label: "Routing rule",
            value: "One job",
            description: "Each tool keeps a clear lane so the stack feels coherent instead of stitched together.",
          },
        ]}
        panel={
          <>
            <p className="public-page-panel__eyebrow">How to use this index</p>
            <h2 className="public-page-panel__title">Start with the tool that matches the decision you need to make.</h2>
            <ul className="public-page-list">
              <li>Need proof? Start with verification or trust tooling.</li>
              <li>Need to protect the bag? Start with vault and accountability flows.</li>
              <li>Need reference intel? Use bonuses, scam logs, and geo guidance after the core read.</li>
            </ul>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader
            eyebrow={`Live tools // ${live.length}`}
            title="The current public stack."
            description={<p>These are the surfaces already doing real work. Same shell. Same spacing logic. Same CTA treatment.</p>}
          />
          <div className="public-page-grid public-page-grid--2">
            {live.map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {beta.length > 0 && (
        <section className="public-page-section px-4">
          <div className="landing-shell">
            <PublicPageSectionHeader
              eyebrow={`Beta // ${beta.length}`}
              title="Visible, but not pretending."
              description={<p>Beta surfaces stay honest about where they are in the stack.</p>}
            />
            <div className="public-page-grid public-page-grid--2">
              {beta.map((tool) => (
                <ToolCard key={tool.href} tool={tool} />
              ))}
            </div>
          </div>
        </section>
      )}

      {soon.length > 0 && (
        <section className="public-page-section px-4">
          <div className="landing-shell">
            <PublicPageSectionHeader
              eyebrow={`In development // ${soon.length}`}
              title="Planned surfaces."
              description={<p>These are parked here so users can see the direction without confusing roadmap with runtime.</p>}
            />
            <div className="public-page-grid public-page-grid--2">
              {soon.map((tool) => (
                <ToolCard key={tool.href} tool={tool} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-panel__eyebrow">Want more</p>
            <h2 className="public-page-cta-band__title">The extension runs these workflows in the tab where the risk lives.</h2>
            <p className="public-page-cta-band__copy">
              The public tool pages explain the surfaces. The extension is where the live audit layer keeps up with the
              session in real time.
            </p>
            <div className="public-page-cta-band__actions">
              <Link href="/extension" className="btn btn-primary" data-text="OPEN EXTENSION PAGE">
                OPEN EXTENSION PAGE
              </Link>
              <Link href="/beta-tester" className="btn btn-secondary" data-text="GET EARLY ACCESS">
                GET EARLY ACCESS
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const isDisabled = tool.status === "soon";

  const cardContent = (
    <div
      className={`public-page-card h-full transition-colors ${
        isDisabled
          ? "border-gray-700/30 bg-[#111827]/20 text-gray-600"
          : "hover:border-[#17c3b2]/40 hover:bg-[#17c3b2]/5"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className={`${isDisabled ? "text-gray-500" : "public-page-card__eyebrow"}`}>{tool.label}</p>
        <StatusBadge status={tool.status} />
      </div>
      <h3 className={`public-page-card__title ${isDisabled ? "text-gray-600" : "text-white"}`}>{tool.title}</h3>
      <p className={`public-page-card__copy ${isDisabled ? "text-gray-600" : "text-gray-400"}`}>{tool.description}</p>
    </div>
  );

  if (isDisabled) {
    return <div className="block h-full">{cardContent}</div>;
  }

  return (
    <Link href={tool.href} className="block h-full">
      {cardContent}
    </Link>
  );
}
