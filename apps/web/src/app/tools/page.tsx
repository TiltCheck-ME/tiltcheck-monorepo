/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */
import React from "react";
import Link from "next/link";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import { INSTALL_SURFACES, TOOL_REGISTRY, type ToolEntry } from "@/lib/tool-registry";

function StatusBadge({ status }: { status: ToolEntry["status"] }) {
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
  const live = TOOL_REGISTRY.filter((tool) => tool.status === "live");
  const beta = TOOL_REGISTRY.filter((tool) => tool.status === "beta");

  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="TiltCheck Toolkit"
        title={
          <>
            Install first.
            <br />
            Everything else is optional.
          </>
        }
        description={
          <p>
            AutoVault for nuts and Stake.us ships as plain DM links — no extension store, no casino chat spam.
            Web tools below are live or beta; we stopped calling dashboard handoffs &quot;live.&quot;
          </p>
        }
        stats={[
          {
            label: "Install links",
            value: `${INSTALL_SURFACES.length}`,
            description: "Mobile setup pages you can paste in DMs. Same Share Edition script.",
          },
          {
            label: "Live web tools",
            value: `${live.length}`,
            description: "Standalone pages that work without the dashboard or extension.",
          },
          {
            label: "Beta / dashboard",
            value: `${beta.length}`,
            description: "Useful, but not the primary share path for new degens.",
          },
        ]}
        panel={
          <>
            <p className="public-page-panel__eyebrow">Distribution rule</p>
            <h2 className="public-page-panel__title">DM the install link. Never drop it in public casino chat.</h2>
            <ul className="public-page-list">
              <li>/nuts and /stake — 4 steps, plain English, big buttons.</li>
              <li>Auto-tip is off by default (nuts only, optional in Advanced).</li>
              <li>Extension and dashboard lanes stay separate from these links.</li>
            </ul>
          </>
        }
      />

      <section className="public-page-section px-4" id="install">
        <div className="landing-shell">
          <PublicPageSectionHeader
            eyebrow={`Install now // ${INSTALL_SURFACES.length}`}
            title="Send these in DMs."
            description={
              <p>
                Same Share Edition script. Pick the casino — steps match where they play.
              </p>
            }
          />
          <div className="public-page-grid public-page-grid--2">
            {INSTALL_SURFACES.map((item) => (
              <Link key={item.href} href={item.href} className="block h-full">
                <div className="public-page-card h-full border-[#17c3b2]/45 bg-[#17c3b2]/5 hover:border-[#17c3b2]/60 hover:bg-[#17c3b2]/10 transition-colors">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <p className="public-page-card__eyebrow">{item.label}</p>
                    <span className="inline-block rounded-full border border-[#17c3b2]/45 bg-[#17c3b2]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
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
          <PublicPageSectionHeader
            eyebrow={`Live web tools // ${live.length}`}
            title="Works in the browser today."
            description={<p>No install required — open and use.</p>}
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
              title="Dashboard, Discord, or power-user docs."
              description={
                <p>
                  Not hidden — just honest. For AutoVault sharing, use the install links above.
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

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-panel__eyebrow">Extension lane</p>
            <h2 className="public-page-cta-band__title">Chrome extension = richer brakes in-tab.</h2>
            <p className="public-page-cta-band__copy">
              Install links cover mobile AutoVault. The extension adds guards, blockers, and dashboard sync where supported.
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

function ToolCard({ tool }: { tool: ToolEntry }) {
  return (
    <Link href={tool.href} className="block h-full">
      <div className="public-page-card h-full hover:border-[#17c3b2]/40 hover:bg-[#17c3b2]/5 transition-colors">
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
