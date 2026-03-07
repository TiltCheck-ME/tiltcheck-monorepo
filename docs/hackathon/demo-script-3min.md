# 3-Minute Demo Script

## Goal
Show a full multi-step cycle: ingest -> retrieve -> reason -> act.

## 0:00-0:25 | Problem + Architecture
- Open `apps/discord-bot/src/services/elastic-telemetry.ts`.
- Explain: Discord events are normalized and indexed into `tiltcheck-telemetry`.
- Open `apps/discord-bot/src/services/tilt-agent.ts`.
- Explain: the agent runs ES|QL windows, scores anomalies, and sends interventions.

## 0:25-1:10 | Telemetry Ingest
- Show message and command hooks in `apps/discord-bot/src/handlers/events.ts`:
  - `trackMessageEvent(...)`
  - `trackCommandEvent(...)`
  - `markUserActive(...)`
- Narrate that these events form the agent's context stream.

## 1:10-2:00 | Retrieval + Reasoning
- In `tilt-agent.ts`, highlight:
  - `buildTiltQuery(userId)` for 1-hour metrics.
  - `buildBaselineQuery(userId)` for 24-hour baseline.
  - `scoreActivity(...)` for anomaly and severity logic.
- Briefly explain one example threshold:
  - message ratio > 3x baseline
  - tip ratio > 2x baseline
  - tilt score >= 70

## 2:00-2:40 | Action Execution
- In `apps/discord-bot/src/index.ts`, show `startTiltAgentLoop(...)`.
- Explain that the loop runs every 5 minutes and sends intervention DMs.
- Show fallback design:
  - `callElasticAgent(...)` for generated message.
  - `buildMessage(...)` for deterministic backup.

## 2:40-3:00 | Results + Submission Wrap
- State measured value:
  - faster intervention cycle
  - lower moderation triage burden
  - explainable signals for each intervention
- End by showing:
  - `docs/hackathon/elasticsearch-agent-builder-submission.md`
  - public repo URL
  - social post link (if available)

## Demo Checklist
- [ ] Elasticsearch endpoint configured (`ELASTIC_URL`, `ELASTIC_API_KEY`)
- [ ] Bot started successfully
- [ ] Telemetry index exists
- [ ] Events are being indexed
- [ ] At least one intervention DM captured
- [ ] Repo is public with OSI license
- [ ] Submission description finalized
