# Elasticsearch Agent Builder Hackathon Submission

## Project: TiltCheck Intervention Agent

TiltCheck Intervention Agent is a context-driven, multi-step Discord safety agent that detects gambling tilt patterns and intervenes before users make impulsive decisions. The core problem it solves is real-time behavioral risk management in fast-moving community channels where manual moderation is too slow and reactive.

The agent combines Elasticsearch as the retrieval and analytics layer with a tool-driven orchestration flow in the bot runtime. Events from user behavior (messages, commands, tipping, and tilt signals) are continuously indexed into `tiltcheck-telemetry`. On a fixed loop and on high-risk triggers, the agent runs ES|QL analytics to compare short-term activity (last hour) against baseline behavior (last 24 hours). It computes anomaly flags such as message spikes, tipping spikes, sentiment drops, and max tilt score breaches. These flags then drive the action phase: either generating an intervention via AI endpoint or falling back to deterministic rule-based messaging.

This is explicitly multi-step and context-aware:
1. Ingest behavior events from Discord interactions.
2. Query Elasticsearch with ES|QL for current-window and baseline summaries.
3. Reason over anomalies with threshold logic.
4. Decide severity and whether to act.
5. Execute action (DM intervention) with a clear explanation tied to observed signals.
6. Continue monitoring in a recurring loop for sustained or escalating risk.

Features used:
- Elasticsearch telemetry index with typed mappings for time-series behavior data.
- ES|QL analytics for retrieval and behavioral aggregation.
- Tool orchestration between telemetry ingestion, analytics, scoring logic, and intervention delivery.
- Optional AI-generated intervention text with safe fallback to deterministic prompts.

Measurable impact (pilot estimate):
- Cuts moderator triage time by surfacing users with concrete risk signals instead of raw chat scrollback.
- Reduces time-to-intervention from manual review cycles to near-real-time loop execution.
- Improves consistency by applying stable risk thresholds and explicit intervention rules.

Two features we liked:
- ES|QL made it fast to express behavior windows and aggregates without building custom query plumbing.
- Running deterministic fallback alongside AI generation gave reliability under partial outages.

Challenges:
- ES|QL subquery limitations required splitting baseline and recent-window queries, then merging in application logic.
- Tuning thresholds to avoid noisy false positives while still catching meaningful risk required iterative calibration.

This project demonstrates an agent that does real operational work: retrieve context, reason over behavior, choose tools, and execute interventions with explainable outcomes.
