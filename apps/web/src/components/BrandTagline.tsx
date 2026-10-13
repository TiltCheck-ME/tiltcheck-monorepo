/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Canonical brand tagline with heart mark.
 * Heart is inline SVG (not emoji) so Brand Law CI stays clean.
 */

import { SITE_BRAND_TAGLINE } from '@/lib/site-copy';

type BrandTaglineProps = {
  className?: string;
  /** When true, uppercase + tracking for footer / hero eyebrows */
  compact?: boolean;
};

function HeartMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 21s-6.716-4.218-9.428-7.35C.55 11.15.7 7.7 3.05 5.75 5.05 4.1 7.85 4.35 9.6 6.2L12 8.75l2.4-2.55c1.75-1.85 4.55-2.1 6.55-.45 2.35 1.95 2.5 5.4.478 7.9C18.716 16.782 12 21 12 21z"
      />
    </svg>
  );
}

export default function BrandTagline({ className, compact = false }: BrandTaglineProps) {
  return (
    <span
      className={className}
      style={
        compact
          ? {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.65rem',
              fontWeight: 900,
              letterSpacing: '0.3em',
              textTransform: 'uppercase' as const,
            }
          : {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }
      }
    >
      <span>{SITE_BRAND_TAGLINE}</span>
      <HeartMark />
    </span>
  );
}

export { SITE_BRAND_TAGLINE };
