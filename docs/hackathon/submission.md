# Elasticsearch Agent Builder Hackathon Submission

## Project
TiltCheck Intervention Agent

## Brief Description
TiltCheck Intervention Agent is a multi-step Discord safety and compliance agent built on Elasticsearch + tool orchestration. It solves a real operational problem: high-risk gambling behavior is detected too late, and moderation/compliance context is fragmented across telemetry, gameplay signals, and legal rules. TiltCheck brings these into one workflow that retrieves context, reasons over risk, and triggers the right intervention path.

The agent continuously ingests Discord telemetry (messages, commands, tips, sentiment/tilt signals) into Elasticsearch (`tiltcheck-telemetry`) and evaluates each active user with ES|QL. It compares a user’s last 1-hour activity against baseline behavior and computes anomaly ratios (event volume spike, tilt-score spike). A reasoning layer applies threshold policies to output structured actions: `send_dm_intervention`, `deterministic_message`, or `none`.

To extend beyond behavior-only monitoring, we added a regulations intelligence layer in Elasticsearch (`tiltcheck-regulations-us-v1`) for state/topic status (e.g., igaming, sportsbook, sweepstakes). A sync pipeline validates primary-source citations, enforces schema quality, versions records by content hash, and rejects weak records. User-specific context is set optionally with `/setstate` and persisted in Elasticsearch (`tiltcheck-user-context`), so risk decisions survive restarts and remain personalized.

We also integrated gameplay anomaly signals (RTP outliers, win clustering, RTP drift) into a compliance bridge. Fairness events from gameplay analyzer modules are routed into Discord with regulation-aware risk classification (`allow|warn|block`) and explainable flags (`RTP_OUTLIER`, `STATE_RESTRICTION_CONFLICT`, `PROMO_VIOLATION_RISK`, etc.). This creates a full retrieval-reasoning-action loop that lives where work already happens (Discord moderation channels and user DMs).

### Features Used
- ES|QL retrieval and baseline comparison
- Elasticsearch indexes for telemetry, regulations, and user context
- Multi-step decision flow with intervention routing
- Event-router tool orchestration across gameplay + compliance
- Automated regulatory sync pipeline with validation and rejection reports

### What We Liked / Challenges
1. ES|QL made baseline-vs-recent anomaly logic concise and fast to iterate.
2. Elasticsearch unified telemetry, legal context, and agent memory cleanly.
3. Event-driven orchestration let us add fairness/compliance workflows without breaking core intervention logic.

Main challenge: regulatory data quality. We addressed it with strict source allowlists, primary-source enforcement, dry-run rejection reports, and human-in-the-loop review gates.

## Demo Outline (3 minutes)
1. Problem and architecture (indices + loop)
2. Live tilt detection with ES|QL output -> action JSON
3. `/setstate` and regulation-aware intervention guardrails
4. Fairness anomaly event -> compliance alert in Discord channel
5. `convert -> sync:dry -> sync` regulatory data pipeline

## Architecture Notes
- Inputs: Discord telemetry, gameplay anomaly events, regulation sources
- Core indexes: `tiltcheck-telemetry`, `tiltcheck-regulations-us-v1`, `tiltcheck-user-context`
- Services: reasoning/retrieval, regulations retrieval, gameplay compliance bridge, notifier
- Outputs: intervention DM, deterministic fallback, compliance channel alerts
