<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-05 -->

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
| Brand Law Enforcer | .cursor/agents/brand-law-enforcer.md | **NEW:** Enforces "The Degen Laws" on PRs — brand tone, copyright headers, no secrets, atomic docs. |
| Frontend & Marketing Suggestions | .cursor/agents/frontend-marketing-suggestions.md | **NEW:** Weekly code update suggestions for web, dashboard, and extension UX/UI improvements. |
| Casino Scraper | .cursor/agents/casino-public-data-scraper.md | Scrapes public casino data for the Trust Engine. |
| Daily Issue Finder | .cursor/agents/daily-issue-finder.md | (Merged) Reviews code changes and performs smoke tests on new features. |
| Regulatory Scout | .cursor/agents/regulatory-scout.md | Functional: Monitors commission filings via SusLink integration. |
| Verifier | .cursor/agents/verifier.md | Validates completed work. Skeptically confirms implementations are functional after tasks are marked done. |
| Trust Log Analyzer | .cursor/agents/trust-log-analyzer.md | Extracts GGR, Churn, and behavioral metrics from system logs. |
| Brand Specialist | .cursor/agents/design-marketing-brand.md | Visual hierarchy, CTA clarity, and copy coherence. |
| KPI Agent | .cursor/agents/kpi-agent.md | Metrics, experiment readouts, and funnel analysis. |
| Production Auditor | .cursor/agents/production-standards-auditor.md | (Renamed) Ensures codebase remains production-ready and high quality. |

## 3. Workflow & CI Agents
Located in .github/agents/ and .github/workflows/

| Name | Path | Description |
| :--- | :--- | :--- |
| Brand Law Enforcer | .github/agents/brand-law-enforcer.yml | **NEW:** Automated PR reviewer enforcing Degen Laws (tone, headers, no secrets, docs). Blocks critical violations. |
| Weekly Frontend Suggestions | .github/workflows/frontend-suggestions.yml | **NEW:** Weekly automation (Mondays 9AM UTC) generating UI/UX and copy improvement suggestions. |
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
Last Updated: 2026-04-05

## 6. GitHub Copilot Custom Agents
Located in .github/agents/

These agents are available as GitHub Copilot custom agents within the repository. Invoke them in Copilot chat to scope assistance to a specific domain.

| Name | File | Description |
| :--- | :--- | :--- |
| backend-developer | .github/agents/backend-developer.agent.md | Specialized agent for backend development in TiltCheck monorepo. Handles building, refactoring, testing, and improving backend services. Always verifies compliance with brand laws and documents any bugs or errors encountered. |
| devops-agent | .github/agents/devops-agent.agent.md | Specialized agent for DevOps and deployment tasks in TiltCheck monorepo. Handles building, configuring, deploying, and monitoring infrastructure and CI/CD pipelines. Always verifies compliance with brand laws and documents any bugs or errors encountered. |
| frontend-developer | .github/agents/frontend-developer.agent.md | Specialized agent for frontend development in TiltCheck monorepo. Handles building, refactoring, testing, and improving frontend code. Always verifies compliance with brand laws and documents any bugs or errors encountered. |
| fullstack-developer | .github/agents/fullstack-developer.agent.md | Specialized agent for full-stack development in TiltCheck monorepo. Handles building, refactoring, testing, and improving cross-cutting features across frontend and backend. Always verifies compliance with brand laws and documents any bugs or errors encountered. |
| platform-strategy-agent | .github/agents/platform-strategy-agent.agent.md | Specialized agent for marketing pain-point analysis, UX friction evaluation, and platform-fit strategy. Recommends where tools and flows should live across web, dashboard, Discord, extension, control-room, and API. |
| scribe-agent | .github/agents/scribe-agent.md | Ecosystem documentarian and rule enforcer. Automates copyright headers, UI footers, and ensures zero-drift between code and docs. |

## Latest Additions (This Session)

### GitHub Copilot Custom Agents (ACTIVE)
- **Purpose:** Domain-scoped AI assistants available via GitHub Copilot chat in the repository
- **Agents:** backend-developer, devops-agent, frontend-developer, fullstack-developer, platform-strategy-agent, scribe-agent
- **Compliance:** All agents enforce brand laws (copyright headers, no emojis, atomic docs, non-custodial flows)
- **Files:** `.github/agents/backend-developer.agent.md`, `.github/agents/devops-agent.agent.md`, `.github/agents/frontend-developer.agent.md`, `.github/agents/fullstack-developer.agent.md`, `.github/agents/platform-strategy-agent.agent.md`, `.github/agents/scribe-agent.md`

### Platform Strategy Agent (ACTIVE)
- **Purpose:** Evaluates user pain points, UX friction, and platform-fit across the TiltCheck ecosystem so each tool lives on the right surface.
- **Focus:** Discovery vs configuration vs real-time guardrails vs durable settings vs social/accountability flows.
- **Surfaces:** `web`, `user-dashboard`, `chrome-extension`, `discord-bot`, `control-room`, and `api`.
- **Outcome:** Recommends primary surface, supporting surfaces, user journey, friction risks, and what should not be duplicated elsewhere.
- **File:** `.github/agents/platform-strategy-agent.agent.md`

### Brand Law Enforcer Agent (ACTIVE)
- **Purpose:** Automated PR gatekeeper enforcing "The Degen Laws"
- **Trigger:** Every PR open/update
- **Critical Checks:** Hardcoded secrets, custodial code, copyright headers
- **Brand Checks:** Tone (no apologies), no emojis, footer requirement, atomic docs
- **Action:** Blocks critical violations, requests changes for medium issues
- **Files:** `.cursor/agents/brand-law-enforcer.md` + `.github/agents/brand-law-enforcer.yml`

### Frontend & Marketing Suggestions Agent (ACTIVE)
- **Purpose:** Weekly (Mondays 9AM UTC) suggestions for web/extension UX improvements
- **Focus:** CTA optimization, copy clarity, mobile responsiveness, dark mode, A/B tests
- **Categories:** Conversion, messaging, visual hierarchy, friction reduction, mobile, dark mode
- **Target:** +5-15% engagement and conversion improvements
- **Files:** `.cursor/agents/frontend-marketing-suggestions.md` + `.github/workflows/frontend-suggestions.yml`
