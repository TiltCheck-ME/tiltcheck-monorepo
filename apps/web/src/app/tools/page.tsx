/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import React from "react";
import Link from "next/link";
import BrandTagline from "@/components/BrandTagline";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import {
  INSTALL_SURFACES,
  PARTNER_LINKS,
  REPORT_REGISTRY,
  TOOL_REGISTRY,
  type ToolEntry,
} from "@/lib/tool-registry";

function StatusBadge({ status }: { status: ToolEntry["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-block rounded-full border border-[color:var(--tc-accent)]/45 bg-[color:var(--tc-accent)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--tc-accent)]">
        LIVE
      </span>
    );
  }

  if (status === "beta") {
    return (
      <span className="inline-block rounded-full border border-[color:var(--tc-accent-2)]/45 bg-[color:var(--tc-accent-2)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--tc-accent-2)]">
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

function CadenceBadge({ cadence }: { cadence: string }) {
  return (
    <span className="inline-block rounded-full border border-[color:var(--tc-accent-2)]/38 bg-[color:var(--tc-accent-2)]/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--tc-accent-2)]">
      {cadence}
    </span>
  );
}

export default function ToolsIndexPage() {
  const live = TOOL_REGISTRY.filter((tool) => tool.status === "live");
  const beta = TOOL_REGISTRY.filter((tool) => tool.status === "beta");

  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="Player dash"
        title="Tools + intel. One index."
        description={
          <p>
            Extension first — that is the guardrail. Everything here is optional: live web tools,
            automated report feeds, and DM install links for AutoVault.
          </p>
        }
        actions={
          <div className="public-page-hero__actions">
            <Link href="/extension" className="btn btn-primary">
              Install extension
            </Link>
            <Link href="/casinos" className="btn btn-outline-partner">
              Check casino trust
            </Link>
          </div>
        }
      />

      <section className="public-page-section px-4" id="install">
        <div className="landing-shell">
          <PublicPageSectionHeader
            compact
            eyebrow="Player // DM install"
            title="AutoVault setup links — never post these in casino chat."
          />
          <p className="tools-dash-section-label tools-dash-section-label--player" style={{ marginBottom: "1rem" }}>
            Player tools
          </p>
          <div className="public-page-grid public-page-grid--2">
            {INSTALL_SURFACES.map((item) => (
              <Link key={item.href} href={item.href} className="block h-full">
                <div className="public-page-card public-page-card--accent h-full transition-colors hover:border-[color:var(--tc-accent)]/55">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <p className="public-page-card__eyebrow">{item.label}</p>
                    <span className="inline-block rounded-full border border-[color:var(--tc-accent)]/45 bg-[color:var(--tc-accent)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--tc-accent)]">
                      DM READY
                    </span>
                  </div>
                  <h3 className="public-page-card__title text-white">{item.title}</h3>
                  <p className="public-page-card__copy text-gray-400">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader compact eyebrow={`Live // ${live.length}`} title="Open and run." />
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
              compact
              eyebrow={`Beta // ${beta.length}`}
              title="Dashboard or power-user flows."
              description={
                <p>
                  Extension for live guardrails. Dashboard for durable rules. Install links above for in-tab AutoVault.
                </p>
              }
            />
            <div className="public-page-grid public-page-grid--2">
              {beta.map((tool) => (
                <ToolCard key={tool.href} tool={tool} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="public-page-section px-4" id="reports">
        <div className="landing-shell">
          <PublicPageSectionHeader
            compact
            eyebrow={`Reports // ${REPORT_REGISTRY.length}`}
            title="Automated intel feeds."
            description={
              <p>
                These are read-only report surfaces — trust scores, drift logs, scam registry, bonus scanner.
                No wallet. No cashout.
              </p>
            }
          />
          <p className="tools-dash-section-label tools-dash-section-label--reports" style={{ marginBottom: "1rem" }}>
            Automation reports
          </p>
          <div className="public-page-grid public-page-grid--3">
            {REPORT_REGISTRY.map((report) => (
              <Link key={report.href} href={report.href} className="block h-full">
                <div className="public-page-card public-page-card--report h-full transition-colors hover:border-[color:var(--tc-accent-2)]/45">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <p className="public-page-card__eyebrow">{report.label}</p>
                    <CadenceBadge cadence={report.cadence} />
                  </div>
                  <h3 className="public-page-card__title text-white">{report.title}</h3>
                  <p className="public-page-card__copy text-gray-400">{report.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4" id="partners">
        <div className="landing-shell">
          <PublicPageSectionHeader
            compact
            eyebrow="Partners // B2B only"
            title="Processors and operators — not player cashout."
            description={
              <p>
                Instant Redeem is a partner API. Players see badges on{" "}
                <Link href="/casinos" className="text-[color:var(--tc-accent)] hover:underline">
                  /casinos
                </Link>
                ; operators integrate here.
              </p>
            }
          />
          <p className="tools-dash-section-label tools-dash-section-label--partner" style={{ marginBottom: "1rem" }}>
            Partner links
          </p>
          <div className="public-page-grid public-page-grid--3">
            {PARTNER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="block h-full">
                <div className="public-page-card public-page-card--partner h-full transition-colors hover:border-[color:var(--tc-accent-2)]/45">
                  <p className="public-page-card__eyebrow">{link.label}</p>
                  <h3 className="public-page-card__title text-white">{link.title}</h3>
                  <p className="public-page-card__copy text-gray-400">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-cta-band__copy">
              No cap — if you only do one thing, install the extension. Everything on this dash is backup armor.
            </p>
            <div className="public-page-cta-band__actions">
              <Link href="/extension" className="btn btn-primary">
                Install extension
              </Link>
              <Link href="/ask" className="btn btn-secondary">
                Ask intel
              </Link>
              <Link href="/bonuses" className="btn btn-secondary">
                Bonuses
              </Link>
            </div>
            <p className="public-page-cta-band__tagline">
              <BrandTagline />
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function ToolCard({ tool }: { tool: ToolEntry }) {
  return (
    <Link href={tool.href} className="block h-full">
      <div className="public-page-card h-full transition-colors hover:border-[color:var(--tc-accent)]/40 hover:bg-[color:var(--tc-accent)]/5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="public-page-card__eyebrow">{tool.label}</p>
          <StatusBadge status={tool.status} />
        </div>
        <h3 className="public-page-card__title text-white">{tool.title}</h3>
        <p className="public-page-card__copy text-gray-400">{tool.description}</p>
      </div>
    </Link>
  );
}
