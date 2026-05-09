<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 -->

# RG Tools V1 Plan

## Section F: License And Trust Surfacing

Scope: surface license and trust signals in the browser extension and public casino proof pages without implying legal clearance, casino safety, or regulator endorsement.

Implementation rules:

- Show a compact extension badge plus a source/last-verified detail line.
- Keep web casino profile parity by showing the same source, last-verified, and stale-state metadata in the registry and trust cards.
- Treat stale or missing timestamps as limited evidence, not a clean bill.
- Cite source systems directly, such as the TiltCheck license registry, live trust-rollup feed, current page scan, and regulator verification links where available.
- Include a blunt disclaimer anywhere license evidence is rendered: not legal advice, and not regulator endorsement.

Current v1 threshold:

- License registry metadata is stale after 30 days.
- Live trust-rollup events are stale after 48 hours.
- Extension DOM scans are current at scan time, but older cached reads should warn after 7 days.

Out of scope:

- No new legal conclusions.
- No regulator approval language.
- No automated enforcement decision beyond the existing extension analysis gate.
