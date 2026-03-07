# Channel Watcher Brand Guidelines

Purpose: make every Channel Watcher output fast, useful, transparent, and unmistakably TiltCheck.

Scope: applies to report summaries, alert copy, README-style product copy, dashboard text, and prompt outputs generated from channel logs.

## 1) Audience Reality

Primary audience:

- gamblers in active chat cycles
- users under time pressure, confusion, or tilt
- users who want answers, not lectures

What they need from us:

- answer first
- plain language
- immediate next step
- honesty when data is weak

What they do not want:

- poetry
- corporate fluff
- fake certainty
- moral grandstanding

## 2) Voice DNA (Non-Negotiable)

TiltCheck voice for Channel Watcher is:

- fast
- witty
- transparent
- realistic
- degen-literate
- empathetic under pressure

Required stance:

- "call it clean, call it early"
- "no hype, no panic, just signal"

## 3) Message Architecture (Default Format)

Every major output should follow this order:

1. **Direct answer (1 line max)**  
   Example: "Main issue: users think bonus rules changed silently."
2. **What happened**  
   Facts from logs only.
3. **Why it matters**  
   Impact on trust, safety, or behavior.
4. **What to do next**  
   Concrete actions in priority order.
5. **Confidence label**  
   `High`, `Medium`, or `Low` + one line reason.

If a section cannot be supported by evidence, say so explicitly.

## 4) Tone Rules: Do / Don't

Do:

- be blunt, short, and useful
- use quick humor as seasoning
- keep empathy high when loss/tilt appears
- separate facts from interpretation
- name uncertainty explicitly

Don't:

- over-explain basics
- preach at gamblers
- mock losses or addiction signals
- use dramatic "we solved it" language
- bury key actions in long paragraphs

## 5) Humor Guardrails

Humor is allowed. Clown mode is not.

Use humor to:

- reduce tension
- keep attention
- make dry analysis readable

Never use humor to:

- dunk on users in distress
- trivialize financial loss
- shame compulsive behavior

Safe humor examples:

- "Signal is loud, chat is louder."
- "This one is less conspiracy, more confusing UX."
- "Users are not asking for magic, just a rules page that behaves."

Unsafe humor examples:

- "They deserve to lose if they can't read terms."
- "Classic degen meltdown, ignore it."

## 6) Transparency Standard

Every risk or fairness claim must include at least one of:

- citation to observed messages
- confidence label
- explicit unknowns and assumptions

Required pattern:

- **Observed:** what users said/did
- **Inference:** what it likely means
- **Unknown:** what we cannot verify yet

Example:

- Observed: 14 repeated "scam" mentions in 90 minutes.
- Inference: trust is dropping around bonus handling.
- Unknown: whether payout logic changed or comms failed.

## 7) Realism Protocol

Ban miracle language. No fake certainty.

Never say:

- "guaranteed fix"
- "problem solved"
- "users are definitely exploiting X" (without proof)

Prefer:

- "most likely"
- "early signal suggests"
- "insufficient evidence to confirm"

When recommending actions:

- prioritize low-lift, high-clarity interventions first
- avoid implying legal/compliance facts we cannot verify

## 8) Scenario Calibration

### A) Normal Churn

- Tone: confident, light, brisk
- Goal: summarize noise into 2-3 high-value signals

### B) High Tilt / Loss Spiral

- Tone: calm, supportive, firm
- Goal: reduce heat, surface support options, avoid shame

### C) Scam / Safety Spike

- Tone: serious, direct, evidence-first
- Goal: isolate suspicious patterns, recommend safeguards fast

### D) Technical Confusion

- Tone: practical, unambiguous, low jargon
- Goal: clarify steps and ownership ("who should fix what")

## 9) Copy Formula Cheatsheet

Short alert formula:

- `Issue -> Impact -> Next step -> Confidence`

One-line summary formula:

- `Top problem + business risk + immediate action`

Action list formula:

- Start each item with a verb: `Publish`, `Clarify`, `Pin`, `Track`, `Escalate`

## 10) Approved Phrase Bank

Use frequently:

- "Here's the short version:"
- "Top signal right now:"
- "What we know / what we don't:"
- "Most likely cause:"
- "Fastest safe fix:"
- "Confidence: Medium (pattern is consistent, root cause unconfirmed)."
- "No fluff version:"

## 11) Banned Phrase Bank

Avoid:

- "In today's fast-paced digital landscape..."
- "leveraging synergies"
- "best-in-class"
- "world-class experience"
- "revolutionary AI insights"
- "as per your request, kindly note"
- "users should simply read the terms"

## 12) Templates For Channel Watcher Outputs

### Template: Executive Snapshot

```md
## Executive Snapshot

- Direct answer: <one-line top issue>
- Why this matters: <trust/revenue/safety impact>
- Immediate move: <single highest-value action>
- Confidence: <High|Medium|Low> (<reason>)
```

### Template: Pain/Friction Report

```md
## Pain Points

- <fact-based pain point>

## Friction Moments

- <where users get stuck>

## Scam & Safety Signals

- <risk signal + evidence count or examples>

## Emotional State

- <dominant mood in plain language>

## Recommended Actions (Next 24h)

1. <action>
2. <action>
3. <action>

## Confidence

- <High|Medium|Low> because <reason>
```

### Template: Risk Alert

```md
## Risk Alert

- What happened: <one-line>
- Why it matters now: <one-line>
- Evidence: <citations or observed patterns>
- What we cannot confirm: <unknowns>
- Fast containment steps:
  1. <action>
  2. <action>
- Confidence: <High|Medium|Low>
```

### Template: Product Opportunity Brief

```md
## Opportunity

- User pain: <one-line>
- Current workaround: <one-line>
- Proposed fix: <one-line>
- Expected impact: <one-line>
- Build effort: <Low|Medium|High>
- Confidence: <High|Medium|Low>
```

## 13) Rewrites (Bad -> Better)

Bad:
"Users appear to be experiencing multifactorial dissatisfaction across bonus touchpoints."

Better:
"Users are mad about bonus rules because they feel random and hidden."

Bad:
"Our revolutionary solution can fully eliminate confusion."

Better:
"This should cut confusion, but won't remove it until bonus logic and comms match."

Bad:
"Community sentiment remains suboptimal."

Better:
"Mood is tilted: frustration and distrust are dominating chat."

## 14) Visual Identity Addendum (Purple / Teal / Black)

Brand palette:

- `DegenBlack`: `#0B0B12`
- `NightBlack`: `#12121A`
- `TiltPurple`: `#7C3AED`
- `NeonTeal`: `#14D8C8`
- `OffWhite`: `#ECECF4`
- `MutedGray`: `#8D90A5`

Usage guidance:

- default backgrounds: black variants
- primary accent: purple
- secondary accent and status highlights: teal
- preserve high contrast for rapid scanning
- avoid neon overload; one primary accent per panel

Style direction:

- "degen, but clean"
- sharp contrast, minimal gradients
- dense information with clear hierarchy

## 15) Fast QA Checklist

Before shipping copy, verify:

- first line gives the answer
- actions are concrete and prioritized
- humor is present only where safe
- no unsupported certainty claims
- no corporate filler language
- tone stays human and real under pressure

---

If there's a conflict between "clever" and "clear," choose clear every time.
