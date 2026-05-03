<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-13 -->

# Brand Law Enforcer & Frontend Marketing Agents - Setup Summary

**Status:** ✅ DEPLOYED AND ACTIVE  
**Deployment Date:** 2026-03-13  
**Author:** Copilot CLI  

---

## Overview

Two new agents have been deployed to enforce brand compliance and drive continuous UI/UX improvements:

### 1. **Brand Law Enforcer Agent** 🚨
Automated PR reviewer that enforces "The Degen Laws" — TiltCheck's non-negotiable brand and governance standards.

**Location:** 
- Cursor Agent: `.cursor/agents/brand-law-enforcer.md`
- GitHub Action: `.github/agents/brand-law-enforcer.yml`

**Activation:** Automatically runs on all PRs (open/update)

**What It Enforces:**
- ✅ **No hardcoded secrets** — Blocks API keys, credentials
- ✅ **No custodial code** — Blocks private key storage, fund holding
- ✅ **Copyright headers** — Requires `© 2024–2026 TiltCheck` on all source files
- ✅ **Tone compliance** — Blocks apologetic language ("sorry", "please", "unfortunately")
- ✅ **No emojis** — Strips emojis from code/comments
- ✅ **Footer requirement** — Ensures "Made for Degens. By Degens." on UIs
- ✅ **Atomic documentation** — Requires docs update with code changes
- ✅ **SESSION_LOG.md** — Requires log update on every PR
- ✅ **Test coverage** — Enforces tests for business logic (>70%)

**Actions:**
- 🔴 **CRITICAL:** Blocks merge (secrets, custodial code)
- 🟡 **MEDIUM:** Requests changes (headers, emojis, tone, docs, footer)
- 💬 **Posts review comments** with detailed guidance

**Example:**
```
A PR with hardcoded Discord token → BLOCKED
A PR missing copyright header → Requests changes
A PR with "Sorry, we couldn't process..." → Requests tone fix
A PR without SESSION_LOG.md update → Requests changes
```

---

### 2. **Frontend & Marketing Suggestions Agent** 📋
Weekly automation that suggests high-impact UI/UX and marketing copy improvements.

**Location:**
- Cursor Agent: `.cursor/agents/frontend-marketing-suggestions.md`
- GitHub Workflow: `.github/workflows/frontend-suggestions.yml`

**Activation:** 
- Automatic: Every Monday at 9 AM UTC
- Manual: Workflow dispatch with `--area` parameter (landing, dashboard, extension, discord, all)

**What It Suggests:**

**🔥 Critical Issues** (implement immediately)
- Broken layouts, missing CTAs, exposed tokens
- Example: "Dashboard tilt score is buried; move to top card"

**⚡ High Priority** (this week)
- +10% impact improvements
- Example: "Add dark mode auto-detection for 20% usage boost"
- Example: "Stronger CTA: 'Get Your Free Tilt Score Now' instead of 'Learn More'"

**💡 Medium Priority** (this sprint)
- +5-10% impact, polish work
- Copy audits, mobile responsiveness, error handling

**✨ Low Priority** (backlog)
- <5% impact, A/B test ideas
- Example: "Test bonus urgency messaging"

**Focus Areas Audited Weekly:**
- Landing Page (hero CTA, copy tone, mobile, dark mode, load time)
- Dashboard (tilt score prominence, bonus expiry, wallet status, mobile)
- Extension Popup (load speed, dark mode, touch targets, responsiveness)
- Discord Bot (command tone, emoji usage, response clarity)

**Output Format:**
- Posts weekly summary to GitHub Actions job summary
- Can integrate with Discussions or Issues for team visibility
- Includes effort estimates and impact projections

**Example Suggestions:**
```
1. "Add dark mode to extension (20% usage boost)" — Medium effort
2. "Stronger landing CTA copy (10% signup lift)" — Small effort
3. "Move tilt score to dashboard top card (15% engagement)" — Small effort
4. "Test: 'Use it or lose it' bonus messaging" — Medium effort (A/B test)
```

---

## Integration Points

### For Developers
```bash
# Check brand compliance locally before pushing
pnpm audit:brand

# View this week's frontend suggestions
pnpm suggest:frontend --week

# Check specific area
pnpm suggest:frontend --area=dashboard
```

### For Cursor IDE
```
@brand-law-enforcer Review this PR for brand compliance
@frontend-agent What are this week's top suggestions?
```

### For GitHub
- **Brand Law Enforcer:** Auto-runs on PR open/update, posts review comments
- **Frontend Suggestions:** Auto-runs Mondays 9 AM UTC, posts to Actions summary
- Both available via workflow dispatch for manual runs

---

## The Degen Laws (Enforced)

| Law | Enforces | Example |
|-----|----------|---------|
| **Tone** | Direct, blunt, skeptical | ❌ "We apologize..." → ✅ "Failed: [reason]" |
| **No Emojis** | No emojis in code/comments | ❌ `// 🔐 Security` → ✅ `// Security check` |
| **Headers** | Copyright on every file | ✅ `© 2024–2026 TiltCheck...` at top |
| **No Secrets** | Never commit credentials | 🔴 BLOCKS hardcoded keys |
| **No Custody** | Non-custodial only | 🔴 BLOCKS private key storage |
| **Footer** | "Made for Degens. By Degens." | Required on all user-facing UIs |
| **Atomic Docs** | Docs updated with code | Requests changes if missing |
| **Logs** | SESSION_LOG.md updated | Requests changes if missing |
| **Tests** | Business logic >70% coverage | Requests changes if gaps |

---

## Quick Start

### First PR with Brand Law Enforcer
1. Make code changes
2. Commit with message without emojis
3. Push to PR
4. Brand Law Enforcer auto-runs
5. If violations found, review comments posted
6. Fix and re-push; checks re-run automatically
7. Once all checks pass, green ✅

### First Monday with Frontend Suggestions
1. Monday 9 AM UTC: Workflow auto-triggers
2. Suggestions generated and posted to Actions job summary
3. Team reviews and prioritizes
4. High-priority items picked up for sprint

---

## Example Scenarios

### Scenario 1: Developer pushes PR with hardcoded secret
```
Brand Law Enforcer detects "sk_live_xxx" in code
→ Posts comment: "🔴 CRITICAL: Hardcoded secret detected"
→ Blocks merge automatically
→ Developer must remove and re-push
```

### Scenario 2: Developer updates UI without updating SESSION_LOG.md
```
Brand Law Enforcer detects code changes but no SESSION_LOG.md update
→ Posts comment: "📝 SESSION_LOG.md - PR has code changes..."
→ Requests changes (doesn't block, but review required)
→ Developer adds log entry
```

### Scenario 3: Developer adds new UI without "Made for Degens" footer
```
Brand Law Enforcer scans new component
→ Posts comment: "🚨 Brand Law Violation: Law 4 - Missing Footer"
→ Requests changes
→ Developer adds footer to component
```

### Scenario 4: Monday morning, team checks weekly suggestions
```
Frontend Agent posts:
- 🔥 Dashboard: Move tilt score to top (15% engagement)
- ⚡ Extension: Add dark mode (20% usage)
- 💡 Landing: Strengthen CTA (10% signups)
→ Team discusses in standup
→ High-priority items added to sprint
→ Estimated impact: +15-20% engagement lift
```

---

## Configuration Files

### Brand Law Enforcer
- **Cursor definition:** `.cursor/agents/brand-law-enforcer.md`
- **GitHub Action:** `.github/agents/brand-law-enforcer.yml`
- **Triggers on:** PR open, synchronize, reopen
- **Permissions:** PR comments, contents read

### Frontend Suggestions
- **Cursor definition:** `.cursor/agents/frontend-marketing-suggestions.md`
- **GitHub Workflow:** `.github/workflows/frontend-suggestions.yml`
- **Scheduled:** Mondays 9 AM UTC (or manual dispatch)
- **Permissions:** Contents read, discussions write

---

## Maintenance & Updates

### Brand Law Enforcer
- Update `.cursor/agents/brand-law-enforcer.md` to add new laws
- Update `.github/agents/brand-law-enforcer.yml` to add new checks
- Update `AGENTS.md` when laws change

### Frontend Suggestions
- Update `.cursor/agents/frontend-marketing-suggestions.md` for new suggestion categories
- Update `.github/workflows/frontend-suggestions.yml` for new audits
- Review suggestions weekly; note what gets implemented and impact

---

## Success Metrics

### Brand Law Enforcement
- [ ] 0 secrets committed to main branch
- [ ] 100% of PRs have copyright headers
- [ ] 0 custodial code patterns in production
- [ ] Consistent brand tone across codebase
- [ ] All PRs include SESSION_LOG.md updates
- [ ] 0 emoji usage in source code

### Frontend Suggestions
- [ ] Weekly suggestions generated consistently
- [ ] >70% of high-priority suggestions implemented
- [ ] Track conversion/engagement lift from implemented changes
- [ ] A/B tests running from suggestion pool
- [ ] User feedback integrated into next week's suggestions

---

## How to Invoke

### Manual Brand Check
```bash
# Check entire monorepo
pnpm audit:brand

# Check specific files
pnpm audit:brand --files="apps/api/src/auth.ts,apps/web/src/index.html"

# In Cursor IDE
@brand-law-enforcer Check this code for compliance
```

### Manual Frontend Suggestions
```bash
# Generate this week's suggestions
pnpm suggest:frontend --week

# Check specific area
pnpm suggest:frontend --area=dashboard

# With metrics
pnpm suggest:frontend --week --metrics

# In Cursor IDE
@frontend-agent What are this week's top suggestions for [area]?
```

---

## Support & Questions

- **Brand Law Enforcer:** See `.cursor/agents/brand-law-enforcer.md` for complete law definitions
- **Frontend Suggestions:** See `.cursor/agents/frontend-marketing-suggestions.md` for categories and examples
- **Issues?** Create discussion in Discussions tab or ping @copilot in Discord

---

Made for Degens. By Degens.

**Deployed:** 2026-03-13  
**Status:** ✅ ACTIVE AND ENFORCING

