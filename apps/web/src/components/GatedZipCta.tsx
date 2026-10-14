/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14 */
import { HOME_LAUNCH } from '@/lib/home-launch-copy';

type GatedZipCtaProps = {
  funnelEvent: string;
  funnelSource: string;
};

export default function GatedZipCta({ funnelEvent, funnelSource }: GatedZipCtaProps) {
  if (HOME_LAUNCH.ctaReady) {
    return (
      <a
        href={HOME_LAUNCH.ctaHref}
        download
        className="btn btn-primary"
        data-funnel-event={funnelEvent}
        data-funnel-source={funnelSource}
        data-funnel-label={HOME_LAUNCH.ctaLabel}
      >
        {HOME_LAUNCH.ctaLabel}
      </a>
    );
  }

  const whyId = `gated-zip-why-${funnelSource}`;

  return (
    <span className="gated-zip-cta">
      <button
        type="button"
        disabled
        className="btn btn-primary btn-disabled"
        aria-disabled="true"
        aria-describedby={whyId}
        data-funnel-event={`${funnelEvent}_gated`}
        data-funnel-source={funnelSource}
        data-funnel-label={HOME_LAUNCH.ctaGatedLabel}
      >
        {HOME_LAUNCH.ctaGatedLabel}
      </button>
      <span id={whyId} className="gated-zip-cta__why">
        {HOME_LAUNCH.ctaGatedHint}
      </span>
    </span>
  );
}
