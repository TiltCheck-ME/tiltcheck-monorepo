/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
import type { ReactNode } from "react";

export type PublicPageHeroStat = {
  label: string;
  value: string;
  description: string;
};

type PublicPageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  panel?: ReactNode;
  stats?: PublicPageHeroStat[];
  centered?: boolean;
  /** Tighter hero — no side panel or stat strip. Default for most public pages. */
  compact?: boolean;
};

type PublicPageSectionHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  split?: boolean;
  compact?: boolean;
};

export default function PublicPageHero({
  eyebrow,
  title,
  description,
  actions,
  panel,
  stats = [],
  centered = false,
  compact = false,
}: PublicPageHeroProps) {
  const showPanel = !compact && panel;
  const showStats = !compact && stats.length > 0;

  const shellClassName = [
    "landing-shell",
    "public-page-hero__shell",
    showPanel ? "public-page-hero__shell--panel" : "",
    centered ? "public-page-hero__shell--centered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={`hero-surface public-page-hero${compact ? " public-page-hero--compact" : ""}`}>
      <div className={shellClassName}>
        <div className="public-page-hero__copy">
          <span className="brand-eyebrow">{eyebrow}</span>
          <h1 className="public-page-hero__title">{title}</h1>
          <div className="public-page-hero__description">{description}</div>
          {actions ? <div className="hero-actions public-page-hero__actions">{actions}</div> : null}
          {showStats ? (
            <ul className="public-page-hero__stats" aria-label={`${eyebrow} proof points`}>
              {stats.map((stat) => (
                <li key={stat.label} className="public-page-hero__stat">
                  <span className="public-page-hero__stat-value">{stat.value}</span>
                  <div>
                    <p className="public-page-hero__stat-label">{stat.label}</p>
                    <p className="public-page-hero__stat-description">{stat.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {showPanel ? (
          <aside className="public-page-hero__panel" aria-label={`${eyebrow} summary`}>
            {panel}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

export function PublicPageSectionHeader({
  eyebrow,
  title,
  description,
  split = true,
  compact = false,
}: PublicPageSectionHeaderProps) {
  return (
    <div
      className={`public-page-section-heading ${split ? "public-page-section-heading--split" : ""}${compact ? " public-page-section-heading--compact" : ""}`}
    >
      <div>
        <span className="brand-eyebrow">{eyebrow}</span>
        <h2 className="public-page-section-heading__title">{title}</h2>
      </div>
      {description ? <div className="public-page-section-heading__copy">{description}</div> : null}
    </div>
  );
}
