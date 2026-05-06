<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 -->

# Ethical Ad Filter Privacy Data Flow

This reference defines the MVP privacy posture for the TiltGuard Ethical ad filter. It is written for product, legal, and engineering review before the feature ships.

Made for Degens. By Degens.

## Scope

The Ethical ad filter flags or suppresses gambling promotion surfaces when a user explicitly enables the feature inside the TiltGuard Chrome extension. The MVP is a browser-side guardrail. It is not a diagnosis tool, a credit product, or a mental-health classifier.

Out of scope:

- Inferring or labeling mental health status.
- Selling, renting, or sharing user browsing data for advertising.
- Reading unrelated tabs, keystrokes, screenshots, private messages, or form fields.
- Persisting full-page content or raw browsing history.
- Making automated account closure, exclusion, or financial eligibility decisions.

## Data Minimization

Collect only the minimum signals needed to decide whether a visible page element or active tab matches an enabled filter.

| Data class | Source | Purpose | Storage | Retention |
| :--- | :--- | :--- | :--- | :--- |
| Extension enablement state | User action in extension UI | Know whether ad filtering is on | `chrome.storage.local` | Until disabled, reset, or uninstall |
| Active tab URL domain and path | Browser active tab on supported domains | Match known casino, bonus, or promotion patterns | In memory during scan; optional local rule cache | No server retention; local cache until disabled/reset |
| Visible promotion text snippets | Current page DOM on supported domains | Detect bonus, affiliate, or promo language | In memory only for MVP | Discard after the scan cycle |
| Filter result | Local matcher | Show why an element was flagged or hidden | In memory; optional local event summary | Local summary capped at 7 days if enabled |
| User identity token | Discord OAuth, when logged in | Sync account-scoped settings and dashboard access | `chrome.storage.local`; API session where required | Until logout, token expiry, or deletion request |
| Aggregated telemetry | Explicit opt-in only | Improve rule quality and abuse detection | API telemetry store | 7 days for session-like events unless a legal hold applies |

Do not store raw page HTML, screenshots, keystrokes, unrelated browsing history, or inferred sensitive categories.

## Consent Gates

The MVP must keep these gates separate:

1. Extension install permissions: Chrome-level permission notice for active-tab, storage, supported host domains, and notifications.
2. Feature enablement: user turns on Ethical ad filtering in the extension.
3. Optional account sync: user logs in with Discord to sync settings.
4. Optional telemetry: user explicitly opts in before any ad-filter improvement telemetry leaves the browser.

Declining telemetry must not block local ad filtering.

## User-Facing Consent Strings

Use blunt copy that explains what happens without implying a mental-health diagnosis.

### First Enablement

Title: `Turn on Ethical ad filtering?`

Body: `TiltCheck will scan supported gambling pages you actively visit for visible promo and bonus patterns. Matching ads may be flagged or hidden in your browser. We do not read unrelated tabs, log keystrokes, capture screenshots, or label your mental health. Local filtering works even if you skip telemetry.`

Primary CTA: `Turn on filtering`

Secondary CTA: `Not now`

### Optional Telemetry

Title: `Help improve the filter?`

Body: `Share minimal filter results with TiltCheck so we can tune the rules: domain, rule category, timestamp, and whether the filter matched. No raw page HTML, screenshots, private messages, or unrelated browsing history. You can opt out anytime.`

Primary CTA: `Share minimal results`

Secondary CTA: `Keep it local`

### Account Sync

Title: `Sync filter settings?`

Body: `Log in with Discord if you want your filter settings to follow your TiltCheck account. The extension stores the auth token locally and sends it only to TiltCheck API endpoints.`

Primary CTA: `Sync with Discord`

Secondary CTA: `Use this browser only`

### Privacy Reminder

Short copy: `Filtering happens in your browser first. Telemetry is optional. No unrelated tabs. No mental-health labels. No ad resale skem.`

## Data Flow

```text
User enables filter
  -> extension stores enablement locally
  -> active supported page is scanned in browser
  -> local matcher checks visible promo text and URL patterns
  -> matched element is flagged or hidden in page
  -> optional local summary records rule category and timestamp
  -> optional telemetry sends minimal result to TiltCheck API only if the user opted in
```

Account sync adds this path:

```text
User logs in with Discord
  -> API completes OAuth
  -> extension stores auth token in chrome.storage.local
  -> extension requests account-scoped filter settings
  -> API returns settings only for the authenticated user
```

## Retention And Deletion

- Local settings stay in `chrome.storage.local` until the user disables the feature, resets extension data, logs out, or uninstalls the extension.
- Local event summaries, if enabled, are capped at 7 days.
- Optional telemetry uses the same short-lived posture as session logs: 7 days by default.
- Account sync settings are retained until the user deletes the account, disables sync, or requests deletion through `privacy@tiltcheck.me`.
- Deletion requests must remove account-linked filter settings and telemetry where the data can be tied back to the user.

## Compliance Notes

- GDPR-minded basis: consent for optional telemetry and account sync; legitimate interest may cover local security-like processing that never leaves the browser.
- CCPA-minded posture: no sale or sharing of personal information for cross-context behavioral advertising.
- Sensitive data: do not infer health status, addiction status, financial vulnerability, or protected class membership.
- Children: the product remains for users of legal gambling age only.
- Rollback: if privacy behavior regresses, disable telemetry upload and leave local-only filtering available while the server path is corrected.
