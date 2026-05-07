<!--
© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-07
-->

# ADR-0001: Ethical ad filter v1 — MVP client track

| Field | Value |
| --- | --- |
| Status | Accepted (spike closure) |
| Linear | TIL-69 |
| Date | 2026-05-07 |

## Context

The Ethical ad filter MVP targets user-controlled reduction of high-harm ads, with optional SusLink tie-in and accountability-friendly exports. Three candidate client tracks were evaluated:

1. **DNS / local VPN** — system-wide or device-wide interception via DNS filtering and/or `VPNService` (Android) or Network Extension (iOS).
2. **Browser / WebView** — declarative or script-based filtering inside Chromium extensions, Safari Web Extensions, or embedded `WKWebView` / `WebView` surfaces.
3. **Research export** — no blocking; instrumentation plus structured export for analysis, policy tuning, and accountability bundles.

Constraints that matter for v1:

- **System-wide blocking** is asymmetric across mobile OSes. Android can approach it with `VPNService` loopback, split tunneling, or (for DNS-only) user-directed Private DNS / resolver apps, subject to OEM and Play policy. iOS generally requires Apple-granted Network Extension entitlements (`packet-tunnel-provider`, `dns-proxy`, or `app-proxy`); distribution and review cycles are longer and entitlement denial is a real schedule risk. Safari Content Blocker extensions are powerful for Safari only, not arbitrary apps.
- **Privacy posture** must stay user-legible: a VPN-shaped client is often read as “sees my traffic,” even when implemented as on-device filtering with no third-party relay. DNS paths still observe hostnames. Browser-local rule engines keep scope obvious (“only on sites where you installed the extension / opened our WebView”).
- **Time-to-value** for a degen-facing MVP favors shipping a narrow, testable slice over waiting on mobile network stack approvals.

The monorepo already ships a manual-release **Chrome extension** (`apps/chrome-extension`) with content scripts and related guardrails, which lowers execution risk for a browser-class MVP.

## Decision

**v1 MVP client track: browser / extension (Chromium first), with embedded WebView as a secondary pattern for contained experiences.**

Phased implication:

- **Primary:** extend the existing Chromium extension model (Manifest v3 constraints acknowledged) for high-harm ad reduction on supported casino and promo surfaces where the user already runs TiltCheck.
- **Secondary (same track, later milestone):** Safari Web Extension and/or in-app WebView with bundled content-rule JSON where product needs an iOS-contained browsing shell (still not system-wide).

## Rationale

| Criterion | DNS / VPN | Browser / WebView | Research export |
| --- | --- | --- | --- |
| System-wide coverage | Strong on Android with engineering + policy work; iOS blocked on entitlement timeline | Limited to browser / embedded web stack; honest scope | None |
| Privacy story | High explanation burden; cryptographic “we don’t log” claims invite skepticism unless architecture is trivially local | Scope is naturally bounded to web surfaces the user opted into | Strong if collection is minimal and consent-first, but no user-facing block |
| Time-to-value | Low until entitlements + store posture are resolved | High: reuse extension pipeline and web tech | Highest for telemetry-only, but fails the “reduction” product promise for v1 |
| Alignment with repo | New native mobile stacks | Direct line to `apps/chrome-extension` | Fits server/policy iteration, not primary client MVP |

DNS/VPN remains the right **future** track if the product promise moves to “everything on the phone,” after entitlement and policy de-risking. Research export remains the right **parallel** track for taxonomy validation and accountability bundles, but it is not the v1 **client** MVP.

## Consequences

- Engineering prioritizes MV3 extension surfaces, rule delivery, and UX for opt-in filtering over mobile VPN scaffolding.
- iOS “true system-wide” is explicitly deferred; any iOS work stays inside Web Extensions or in-app WebView until Network Extension path is separately approved as a program bet.
- Compliance and copy must state coverage limits plainly (no fake system-wide claims on iOS v1).

### Risk and rollback notes (DNS/VPN path deferred, not deleted)

- **Threat / trust:** If a later VPN-class client is introduced, threat modeling must cover DNS query metadata, resolver chain of custody, update channel integrity, and split-tunnel bypass. Rollback is “disable extension / revert resolver” for browser track; for VPN track it would be “remove VPN profile / stop tunnel service.”

## Explicit non-goals (v1)

- **No iOS system-wide packet tunnel or DNS proxy as a v1 gate.** Entitlement acquisition and App Store narrative are out of scope for the first shippable slice.
- **No mandatory cloud replay of full browsing history** for the ad filter to function. Optional accountability exports can exist, but the default blocking path must not depend on uploading raw page streams.
- **No representation that non-browser native apps (games, sportsbooks, etc.) are covered** on iOS v1 without a separate ADR revisiting Network Extensions.
- **No “research-only” MVP as the sole deliverable** — exports and measurement may ship alongside, but v1 must ship user-visible reduction on at least one opted-in web surface.
- **No DNS/VPN feature parity promises across Android and iOS** in marketing or in-app copy until both platforms have technically equivalent enforcement hooks.

## Follow-ups (outside this ADR)

- Define rule taxonomy + engine boundaries (separate workstreams from this client-track spike).
- If SusLink hooks are required for promo-class harm, specify which events are client-local vs API-backed in a follow-on ADR or tool spec.
