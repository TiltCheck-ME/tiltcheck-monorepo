<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 -->

# RG Tools v1 Plan

## Section D: Fairness Toolkit

The fairness toolkit covers provably fair education, seed verification helpers, seed rotation monitoring, and optional RTP drift monitors. It does not claim a casino is fair. It defines what was checked, where the data came from, and how much confidence the sample deserves.

### D1. Data Source Definition

Every fairness output must name its data source before showing a result.

| Field | Definition |
| :--- | :--- |
| `id` | Stable source identifier used by the UI/API. |
| `label` | Human-readable source name. |
| `type` | One of `operator-api`, `player-export`, `extension-capture`, `public-certification`, or `manual-entry`. |
| `state` | `live`, `degraded`, or `unknown`. |
| `schemaVersion` | Version actually returned by the source when available. |
| `expectedSchemaVersion` | Version the parser expects. |
| `lastCheckedAt` | Timestamp of the most recent source check. |
| `reason` | Blunt explanation for degraded or unknown output. |

State rules:

| State | Use When |
| :--- | :--- |
| `live` | Source is reachable, parser shape matches, and usable samples exist. |
| `degraded` | Source is unreachable, stale, or returns too few usable samples. |
| `unknown` | Source has not been checked or the API/schema changed enough that classification should pause. |

### D2. Window Definition

Every monitor must define the analysis window.

| Field | Definition |
| :--- | :--- |
| `id` | Stable window identifier. |
| `label` | Human-readable window name. |
| `unit` | `bet`, `spin`, `round`, or `session`. |
| `sampleSize` | Count of records inside the window. |
| `minimumSampleSize` | Minimum count required before showing classification-level language. |
| `startedAt` / `endedAt` | Optional timestamps bounding the window. |
| `sourceId` | Source feeding the window. |

Small windows stay degraded. A single bet can verify raw math, but it cannot prove long-run drift or seed hygiene. No cap, one receipt is not a courtroom.

### D3. Drift Definition

Drift is the signed delta between an observed metric and a declared baseline over a defined window:

```text
absoluteDelta = observedMetric - baselineMetric
relativeDelta = absoluteDelta / abs(baselineMetric)
```

If `baselineMetric` is zero, `relativeDelta` is `null`. Divide-by-zero math is not a vibe; call the absolute delta instead.

Direction:

| Direction | Definition |
| :--- | :--- |
| `below-baseline` | Observed metric is lower than baseline by at least the configured threshold. |
| `above-baseline` | Observed metric is higher than baseline by at least the configured threshold. |
| `flat` | Absolute delta is inside the configured threshold. |

Drift copy must say "observed", "baseline", "sample", and "window". It must not imply intent, fraud, or certainty from a small sample.

### D4. Seed Rotation Definition

Seed rotation monitors compare observed seed boundary timing against a declared interval.

Required framing:

| Field | Definition |
| :--- | :--- |
| `observedRotationCount` | Count of seed boundaries seen in the window. |
| `expectedRotationInterval` | Declared expected interval in the same unit as the window. |
| `observedAverageInterval` | Average observed interval between boundaries. |
| `tolerance` | Allowed distance from the declared schedule before surfacing a difference. |

If the expected interval is missing, the monitor state is `unknown`. If samples are too thin, state is `degraded`. The monitor can report a schedule difference; it does not infer motive.

### D5. Product Surfaces

Initial surfaces:

- `packages/shared/src/fairness-toolkit.ts` defines data source, window, drift, and seed rotation helpers.
- `apps/web/src/components/RtpDriftTicker.tsx` must show degraded or unknown states when the stats feed is unavailable or shape-shifted.
- `apps/web/src/app/tools/verify/page.tsx` remains the single-bet receipt checker and must keep warning that one bet is not a full trust verdict.

### D6. Copy Guardrails

Allowed:

- "Observed metric is below baseline for this window."
- "Source schema changed; drift classification is paused."
- "Window is too small for drift classification."
- "This verifies raw math for one receipt."

Not allowed:

- "Guaranteed fair."
- "Casino is rigged."
- "Proves fraud."
- "Live drift confirmed" when the API is unavailable, stale, or running demo data.
