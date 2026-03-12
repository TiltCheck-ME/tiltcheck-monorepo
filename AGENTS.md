# TiltCheck Agent Directory

Current Ecosystem Capacity: 100% (Readiness)

## 1. Global System Skills
Managed by Gemini CLI in ~/.agents/skills

| Name | Function |
| :--- | :--- |
| code-review | Specialist in correctness, security, and performance reviews. |
| playwright | Browser automation for UI testing and screenshots. |
| troubleshooting | Diagnoses connection/DevTools issues. |
| debug-optimize-lcp | Web performance and Core Web Vitals optimization. |
| a11y-debugging | Accessibility auditing and compliance checks. |

## 2. Domain-Specific Agents
Located in .cursor/agents/

| Name | Path | Description |
| :--- | :--- | :--- |
| Casino Scraper | .cursor/agents/casino-public-data-scraper.md | Scrapes public casino data for the Trust Engine. |
| Daily Issue Finder | .cursor/agents/daily-issue-finder.md | (Merged) Reviews code changes and performs smoke tests on new features. |
| Regulatory Scout | services/regulatory-scout/ | Functional: Monitors commission filings via SusLink integration. |
| Trust Log Analyzer | .cursor/agents/trust-log-analyzer.md | Extracts GGR, Churn, and behavioral metrics from system logs. |
| Brand Specialist | .cursor/agents/design-marketing-brand.md | Visual hierarchy, CTA clarity, and copy coherence. |
| KPI Agent | .cursor/agents/kpi-agent.md | Metrics, experiment readouts, and funnel analysis. |
| Production Auditor | .cursor/agents/production-standards-auditor.md | (Renamed) Ensures codebase remains production-ready and high quality. |

## 3. Workflow & CI Agents
Located in .github/agents/

| Name | Path | Description |
| :--- | :--- | :--- |
| CI/CD Validator | .github/agents/ci-cd-validator.yml | Validates GitHub Actions and pipelines. |
| TiltCheck Agent | .github/agents/tiltcheck-agent.yaml | General monorepo task orchestrator. |
| Scribe Agent | .github/agents/scribe-agent.md | Enforces Zero-Drift policy and project laws. |

## 4. Cloud Readiness (1:1 Mapping)
All local apps are accounted for in the Cloud environment. Shadow services have been purged.

| Service | Status | Verdict |
| :--- | :--- | :--- |
| **api** | Live | Functional (Central Gateway). |
| **web** | Live | Functional (Landing Page). |
| **discord-bot** | Live | Functional: Powers tiltcheck-bot & dad-bot. |
| **game-arena** | Live | Functional: Multiplayer Socket.io server. |
| **trust-rollup** | Live | Functional: Trust Engine aggregator. |
| **control-room** | Live | Functional: Admin management panel. |
| **user-dashboard** | Live | Functional: Primary Degen Hub profile entry point. |
| **chrome-extension** | Browser-Side | Functional: Linked to production API. |

## 5. Core System Modules
Functional code located in modules/

| Name | Path | Function |
| :--- | :--- | :--- |
| Tilt Detector | modules/tiltcheck-core/ | Logic for monitoring community activity for tilt signals. |
| JustTheTip | modules/justthetip/ | Logic for intelligent tipping and financial transactions. |
| Solana Agent | packages/agent/ | Degen Intelligence Agent (DIA) via Google ADK. |

---
Last Updated: 2026-03-11
