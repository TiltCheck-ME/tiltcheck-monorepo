# Agent Architecture and Workflow

## System Objective
Detect high-risk gambling behavior patterns and trigger timely, explainable interventions inside Discord.

## Runtime Components
- Event producer: Discord bot interaction and message handlers
- Context store: Elasticsearch index `tiltcheck-telemetry`
- Reasoning engine: `apps/discord-bot/src/services/tilt-agent.ts`
- Action executor: Discord DM sender in `startTiltAgentLoop(...)`

## Multi-Step Agent Flow
1. Observe
- `events.ts` captures user activity and sends telemetry via:
  - `trackMessageEvent(...)`
  - `trackCommandEvent(...)`
- Active users are tracked with `markUserActive(...)`.

2. Retrieve Context
- Agent runs ES|QL query for last-hour behavior (`buildTiltQuery`).
- Agent runs ES|QL query for 24-hour baseline (`buildBaselineQuery`).
- Query outputs are merged by `runEsql(...)` + `analyseUser(...)`.

3. Reason and Score
- `scoreActivity(...)` computes anomaly flags:
  - message-volume ratio
  - tip-frequency ratio
  - sentiment drop
  - max tilt score
- Severity is computed as low/medium/high based on rule composition.

4. Decide and Generate Response
- If no flags: no intervention.
- If flags exist:
  - first attempt generated intervention (`callElasticAgent(...)`)
  - fallback deterministic intervention (`buildMessage(...)`)

5. Execute Action
- `startTiltAgentLoop(...)` runs every 5 minutes.
- For each active user with `isActing=true`, send DM intervention.

6. Continue Monitoring
- Loop repeats with new telemetry; no manual retraining needed for baseline comparisons.

## Why this maps to Agent Builder principles
- Context-driven: decisions are based on indexed behavior history, not a single prompt.
- Tool-driven: indexing, ES|QL retrieval, scoring, and action are separate tools in one workflow.
- Multi-step: ingest, retrieve, reason, decide, and execute occur in sequence.
- Reliable action: deterministic fallback ensures interventions still run if generation fails.

## Example Operational Metrics
- Time-to-intervention (event to DM)
- Intervention count by severity
- Repeat-risk rate after intervention
- Moderator escalations prevented

## Key Files
- `apps/discord-bot/src/services/elastic-telemetry.ts`
- `apps/discord-bot/src/services/tilt-agent.ts`
- `apps/discord-bot/src/handlers/events.ts`
- `apps/discord-bot/src/index.ts`
