/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
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
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="TiltCheck Toolkit"
        title="Install first. Tools second."
        description={
          <p>
            AutoVault ships as DM links for nuts and Stake.us. Everything below is optional — live web tools or dashboard beta.
          </p>
        }
      />

      <section className="public-page-section px-4" id="install">
        <div className="landing-shell">
          <PublicPageSectionHeader
            compact
            eyebrow="Install // DM only"
            title="Send these in DMs — never public casino chat."
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
          <PublicPageSectionHeader compact eyebrow={`Live // ${live.length}`} title="Open and use." />
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
              title="Dashboard or power-user docs."
              description={
                <p>
                  For AutoVault sharing, use install links above. Extension:{" "}
                  <Link href="/extension" className="text-[#17c3b2] hover:underline">
                    /extension
                  </Link>
                  .
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
