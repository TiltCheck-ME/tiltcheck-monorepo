/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import Link from "next/link";

type ToolCardProps = {
  href: string;
  icon: string;
  category: string;
  title: string;
  description: string;
  status: "live" | "coming-soon" | "featured";
  gridClasses?: string;
  variant?: "hero" | "flagship" | "supporting";
};

const ToolCard = ({
  href,
  icon,
  category,
  title,
  description,
  status,
  gridClasses,
  variant = "flagship",
}: ToolCardProps) => {
  const isComingSoon = status === "coming-soon";
  const isFeatured = status === "featured" || variant !== "supporting";

  const cardClasses = [
    "tool-card",
    `tool-card--${variant}`,
    isComingSoon ? "tool-card--coming-soon" : "tool-card--live",
    isFeatured ? "tool-card--featured" : "",
    gridClasses || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={cardClasses}>
      <div className="tool-card__media" aria-hidden="true">
        <img src={icon} alt="" className="tool-card__image" />
      </div>

      <div className="tool-card__body">
        <div className="tool-card__eyebrow-row">
          <span className="tool-card__category">{category}</span>
          <span className={`tool-card__status ${isComingSoon ? "tool-card__status--notify" : "tool-card__status--live"}`}>
            {isComingSoon ? "Get notified" : "Live now"}
          </span>
        </div>

        <h3 className="tool-card__title">{title}</h3>
        <p className="tool-card__description">{description}</p>
      </div>

      <div className="tool-card__footer">
        <span className="tool-card__cta">{isComingSoon ? "Join waitlist" : "Open tool"}</span>
      </div>
    </Link>
  );
};

export default ToolCard;
