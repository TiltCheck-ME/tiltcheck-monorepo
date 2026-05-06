<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 -->

# ADR-0001: Ethical Ad Filter MVP Slice

## Status

Accepted for v1 planning.

## Context

Linear issue: TIL-69.

The ethical ad filter MVP needs one track for v1. The candidates are:

- DNS/VPN blocking: system-wide filtering through Android `VpnService`, iOS Network Extension DNS proxy, or iOS content filter providers.
- Browser/WebView blocking: opted-in filtering inside TiltCheck-controlled browser surfaces, browser extensions, Safari content blockers, and WebView request interception.
- Research export: no live blocking, only reports, datasets, screenshots, and evidence bundles for later analysis or partners.

The decision needs to balance mobile platform constraints, privacy posture, and time-to-value. The sharp edge is system-wide blocking: it sounds like the obvious user win, but mobile operating systems make it the slowest, riskiest path.

## Decision

Choose browser/WebView blocking as the v1 MVP track.

v1 should ship an opted-in browser/WebView filter that uses local rule evaluation for known gambling-ad and high-risk promotion patterns. It should integrate with the existing SusLink/LinkGuard trust shape where practical, expose clear allow, blur, and block tiers, and keep all browsing decisions visible to the user.

DNS/VPN and research export remain valid future tracks, but they should not anchor v1.

## Option Comparison

| Track           | Platform Reach                                                                                                                                                                                                                           | Privacy Posture                                                                                                        | Time-To-Value                                                                                                                         | Main Risk                                                                                                                  |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| DNS/VPN         | Best theoretical reach, especially Android system-wide filtering. iOS is gated by Network Extension behavior, entitlement/App Review risk, supervised-device limits for some filter configurations, and user trust in VPN-style prompts. | Strong only if all filtering is local. Risk rises fast if traffic or DNS telemetry leaves device.                      | Slowest. Requires native mobile networking, packet/DNS correctness, platform prompts, persistent OS indicators, and App Store review. | Big yikes platform drag: one VPN slot on Android, sensitive network permissions, and iOS policy constraints can derail v1. |
| Browser/WebView | Good reach inside owned surfaces and extension-enabled browsers. Not system-wide.                                                                                                                                                        | Strong. Evaluate URL/domain rules locally, avoid full browsing-history collection, and show exactly what was filtered. | Fastest useful blocking path because it reuses web/extension primitives and existing trust-domain thinking.                           | User only gets protection where they browse through the opted-in surface.                                                  |
| Research export | Broadly platform-neutral because it does not block live traffic.                                                                                                                                                                         | Strongest by default if exports are user-triggered and redacted.                                                       | Fast for analysts, weak for end users.                                                                                                | It proves the taxonomy but does not protect a degen at the moment the ad appears.                                          |

## Why Browser/WebView Wins v1

1. It delivers visible protection without asking for system-wide network control.
2. It keeps the privacy model narrow: classify the current URL/request locally, store only aggregated or user-approved evidence, and avoid collecting raw browsing history.
3. It fits existing TiltCheck surfaces better than a native VPN product: web, extension, dashboard education, and SusLink trust semantics can all support it.
4. It avoids iOS Network Extension entitlement and supervised-device traps until the taxonomy and user value are proven.
5. It leaves DNS/VPN as a deliberate v2 escalation instead of a pile of spooky mobile networking complexity shipped under pressure. No cap, that path needs more proof before it gets the keys to the whole device.

## MVP Scope

v1 includes:

- A local rule taxonomy for gambling ads, bonus bait, affiliate redirects, casino landing pages, suspicious short links, and known allowed domains.
- Three user-visible actions: block, blur, and allow with log.
- Browser/WebView enforcement in opted-in TiltCheck-controlled browsing surfaces.
- Extension-aligned rule packaging where the browser supports declarative blocking.
- Local-first logging with minimal event fields: timestamp bucket, category, tier, normalized domain, rule ID, and user action.
- User controls for enable, pause, allowlist, report false positive, and export evidence.
- Plain-language consent copy explaining that v1 is not a system-wide blocker.

## Explicit Non-Goals

v1 does not include:

- System-wide DNS filtering.
- A VPN profile, local VPN service, or remote VPN service.
- iOS Network Extension entitlement work.
- Packet inspection, TLS interception, or man-in-the-middle certificates.
- Full browsing-history collection.
- Blocking outside opted-in browser/WebView or extension-supported surfaces.
- Account-level gambling-site self-exclusion.
- Payment, wallet, or custodial controls.
- ML-based real-time ad classification. Static and curated rules are enough for v1.
- Partner compliance reports as the primary user experience.
- Claims that TiltCheck can block every ad across every app.

## Privacy Notes

- Default to local rule matching.
- Do not send raw URLs unless the user explicitly reports or exports evidence.
- Normalize domains before logging and avoid query strings by default.
- Keep retention short for local logs unless the user exports them.
- Treat reports as user-generated evidence, not surveillance data.

## Follow-Up Work

1. TIL-70: Define taxonomy v1 categories and tier definitions.
2. TIL-71: Finalize minimization, retention, and consent copy.
3. TIL-76: Map SusLink `LinkScanResult` outputs into filter tiers.
4. TIL-81: Spike concrete interception points for extension and WebView implementation.
5. TIL-87: Shape the report flow into a redacted evidence bundle export.

## References

- Apple Developer Documentation: Network Extension provider deployment: https://developer.apple.com/documentation/technotes/tn3134-network-extension-provider-deployment
- Apple Developer Documentation: Content filter providers: https://developer.apple.com/documentation/networkextension/content-filter-providers
- Apple Developer Documentation: Safari content blocking: https://developer.apple.com/documentation/safariservices/blocking-content-with-your-safari-web-extension
- Android Developers: `VpnService`: https://developer.android.com/reference/android/net/VpnService
