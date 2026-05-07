<!--
© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-07
-->

# TIL-72 Legal checkpoint — Ethical ad filter MVP gate

Review scope: Terms of Service, reporting-style marketing claims, Chrome Web Store listing posture, and disclosures before optional URL egress to TiltCheck APIs or “accountability” exports.

## Findings (resolved in-repo)

1. **“Accountability” language** — Public copy used “We enforce accountability,” which reads like TiltCheck holds enforcement authority over users or operators. Swapped to **operationalize** so it reflects tooling and user-configured guardrails, not third-party enforcement.

2. **Restriction Log tool description** — “Community-reported” payout issues could be read as verified findings. Clarified as **player-reported signals** and **not adjudicated outcomes**.

3. **ToS gap** — Published terms did not explicitly cover optional browser clients, user-controlled filtering limits, API use, or exports. Added section **10. Browser extension, APIs, and accountability exports** (version bump **2.1 → 2.2**).

4. **Privacy gap** — Extension section stated local-only posture; ethical-ad/MVP paths may opt into API/sync. Privacy copy now states **optional encrypted/API-backed sync only when you enable it**.

5. **Chrome Web Store / developer honesty** — Publishing guide claimed blanket “No data sent without explicit consent.” Added guidance that **optional cloud features must be disclosed** in listing and privacy policy when shipped.

6. **LegalModal typo** — “Adisory” corrected to **Advisory** (professional polish; reduces ambiguity in a regulatory-facing modal).

7. **Shared legal strings** — Added `OPTIONAL_CLOUD_FEATURES` in `@tiltcheck/shared` for reuse in extension consent surfaces when API egress ships (wire into UI in the feature PR, not here).

## Residual risks (need human counsel)

- **Jurisdiction-specific gambling-ad rules** — High-harm ad reduction copy must stay user-controlled and non-defamatory toward brands; coordinate with counsel before geo-targeted claims.

- **Store policies** — Chrome single-purpose description, permission justification, and data-use disclosures must be updated when the ethical ad filter ships; this checkpoint does not replace store submission review.

- **API terms enforcement** — Rate limits and prohibited uses exist in ToS; operational enforcement (keys, blocks) stays with engineering — confirm messaging matches actual API gateway behavior before scale.

## References

- Public ToS: `/terms` (v2.2)
- Privacy: `/privacy`
- Extension publishing: `apps/chrome-extension/docs/publishing.md`
