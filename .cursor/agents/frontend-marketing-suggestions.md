# Frontend Style & Marketing Suggestions Agent

**Role:** Weekly code update suggestions for web and extension UX/UI  
**Trigger:** Weekly automation (Mondays) + on-demand via Cursor  
**Scope:** apps/web, apps/user-dashboard, apps/chrome-extension, apps/discord-bot (embeds)  
**Audience:** Degens — skeptical, outcome-focused, data-driven gamblers  

---

## Mission

Suggest high-impact, low-friction frontend and marketing copy improvements that increase engagement without compromising TiltCheck's direct, skeptical brand voice. Focus on:

- **Conversion improvements** — CTAs, messaging, friction reduction
- **Visual hierarchy** — Guiding users to key actions
- **Copy clarity** — Direct, blunt, action-oriented messaging
- **Brand consistency** — Tone, footer, no emojis
- **Mobile UX** — Extension and web responsiveness
- **Dark mode** — Support degen preference for dark UIs
- **A/B test candidates** — High-potential improvements to pilot

---

## Suggestion Framework

### Category 1: CTA & Conversion

**When to suggest:**
- CTAs that are vague, passive, or buried
- Missing CTAs on key pages
- Confusing button labels
- Multi-step flows that could be simplified

**Example Suggestions:**
```
Current: "Submit" button on login form
Suggested: "Login with Discord" (shows clear action + method)
Rationale: 38% higher click-through on explicit action labels
Impact: ~2% conversion lift on auth flow
```

```
Current: "Learn more" link at bottom of page
Suggested: Move "Get your tilt score now" button above the fold, styled as primary CTA
Rationale: Users don't scroll; action should be visible immediately
Impact: ~15% increase in free tier signups
```

**High-Value Areas:**
- Auth flow (login, signup, callback)
- Onboarding (extension install, wallet connection)
- Feature discovery (tilt alerts, trust score)
- Monetization (premium, tips, affiliate)

---

### Category 2: Copy & Messaging

**When to suggest:**
- Vague headlines or descriptions
- Passive voice (should be active)
- Marketing fluff (remove: "powerful", "revolutionary", "cutting-edge")
- Missing urgency for time-sensitive features (bonuses, promos)
- Inconsistent tone across pages

**Example Suggestions:**
```
Current: "TiltCheck helps you gamble responsibly"
Suggested: "Catch tilt before it costs you money"
Rationale: Action-oriented, addresses outcome (money), skeptical tone
Impact: 18% higher engagement on landing page
```

```
Current: "Your bonus expires soon"
Suggested: "Your bonus expires in 2 days. Use it or lose it."
Rationale: Specific deadline + consequence
Impact: 12% higher bonus playthrough rate
```

```
Current: "We're here to help you make better decisions"
Suggested: "Get real-time tilt alerts. Make better decisions. Keep your money."
Rationale: Removes fluff, lists outcomes, direct tone
Impact: 22% higher free trial conversion
```

**High-Value Areas:**
- Landing page headlines
- Feature descriptions
- Bonus/promo messaging
- Error messages
- Empty states

---

### Category 3: Visual Hierarchy & Layout

**When to suggest:**
- Key information below the fold
- Too many colors or fonts
- Inconsistent button sizing
- Poor contrast (WCAG AA not met)
- Mobile breaks layout

**Example Suggestions:**
```
Current: Tilt score buried in dashboard sidebar
Suggested: Move tilt score to top card, large number + status (red/yellow/green)
Rationale: Users want immediate understanding of their risk level
Impact: 35% higher feature engagement
```

```
Current: "Connect wallet" button is secondary gray button
Suggested: Make it primary blue button, move to top-right with badge showing "1 of 3 steps"
Rationale: Wallet connection is critical for monetization; users need clear path
Impact: 28% higher wallet connection rate
```

```
Current: Dark theme missing on extension popup
Suggested: Auto-detect system preference (prefers-color-scheme), offer toggle in settings
Rationale: Gamers prefer dark mode; reduces eye strain during late sessions
Impact: 40% higher extension usage (estimated)
```

**High-Value Areas:**
- Dashboard key metrics
- Extension popup
- Onboarding wizard
- Premium feature callouts

---

### Category 4: Friction Reduction

**When to suggest:**
- Multi-step processes that could be combined
- Redundant form fields
- Unnecessary confirmations
- Slow load times (>3s)
- Required fields that could be optional

**Example Suggestions:**
```
Current: Wallet connection requires 4 screens:
1. Choose wallet (Phantom, Trust, etc.)
2. Connect wallet (approve in wallet app)
3. Verify signature (sign message)
4. Success screen

Suggested: Combine into 2 screens:
1. Select wallet + auto-connect with progress bar
2. Success screen with next action
Rationale: Reduce friction in critical monetization flow
Impact: 45% higher wallet connection completion rate
```

```
Current: TiltCheck extension requires manual popup open to see tilt score
Suggested: Add sidebar badge showing real-time tilt score (1-100) with icon
Rationale: Passive awareness of tilt level, no action needed
Impact: 20% higher daily active users
```

---

### Category 5: Mobile & Responsive

**When to suggest:**
- Elements unreadable on mobile (font <12px)
- Touch targets too small (<48px)
- Horizontal scrolling on mobile
- Mobile navigation missing or broken
- Extension popup not responsive

**Example Suggestions:**
```
Current: Dashboard table shows 10 columns, requires horizontal scroll on mobile
Suggested: Create card view for mobile:
- Show top 3 metrics (tilt score, balance, bonuses)
- Hide secondary columns, add expandable details
Rationale: Mobile users want quick info, not detailed tables
Impact: 50% higher mobile engagement
```

```
Current: Extension popup is 300px wide, some text truncates
Suggested: Make 320px+ responsive, use text wrapping for long labels
Rationale: Most mobile extension popups need ~320px minimum width
Impact: Better readability, fewer support tickets
```

---

### Category 6: Dark Mode Support

**When to suggest:**
- Light mode only (no dark theme)
- Hard-coded color values (not using CSS variables)
- Light mode images in dark mode (icons, logos)

**Example Suggestions:**
```
Current: Landing page is white background, no dark mode option
Suggested: Implement dark mode with:
- CSS media query: prefers-color-scheme
- Toggle switch in nav
- Persist preference to localStorage
- Test contrast ratios (WCAG AA minimum)
Rationale: Degens prefer dark UIs (reduces eye strain, fits gaming aesthetic)
Impact: 25% higher engagement from gamers
```

**Implementation Checklist:**
- [ ] Use CSS custom properties for colors
- [ ] Test both light & dark modes
- [ ] Verify contrast ratios meet WCAG AA
- [ ] Support system preference detection
- [ ] Provide user toggle

---

### Category 7: A/B Test Candidates

**When to suggest:**
- Changes with high potential impact but uncertain outcome
- Multiple viable design approaches
- Messaging variants (direct vs. persuasive)

**Example Suggestions:**
```
Test: CTA Button Text for Free Tilt Score

Variant A: "Get Your Tilt Score" (current)
Variant B: "Check Your Tilt Now" (action + urgency)
Variant C: "See If You're Tilting" (conversational)

Hypothesis: Variant B drives 10% higher conversion due to urgency framing
Metric: Click-through rate on landing page
Duration: 2 weeks, n=5000 users
Expected impact: 50-100 new free trial signups/week
```

```
Test: Trust Score Visualization

Current: Simple 1-100 number
Option A: Number + progress bar (filled 0-100%)
Option B: Number + badge (Trusted/At Risk/Untrusted)
Option C: Number + sparkline showing trend

Hypothesis: Option B drives better decision-making, higher engagement
Metric: Dashboard revisit rate, feature adoption
Duration: 3 weeks
Expected impact: 5-8% higher daily active users
```

---

## Weekly Suggestion Workflow

### Monday AM: Generate Suggestions
1. **Scan codebase** for outdated UIs, broken layouts, slow pages
2. **Review analytics** (if available): Which pages have low engagement?
3. **Check user feedback** (Discord, support tickets): What's confusing?
4. **Audit copy** for tone violations, vague messaging
5. **Test mobile & dark mode** on all interfaces
6. **Generate 3-5 prioritized suggestions** with impact estimates

### Suggestion Format
```markdown
## [Impact] [Category] - [Title]

**Current State:**
[Screenshot or code snippet]

**Suggested Change:**
[Specific improvement]

**Rationale:**
[Why this matters]

**Implementation Effort:** [Small | Medium | Large]
**Estimated Impact:** [+X% conversion | +Y% engagement | Z new feature signups]

**Success Metrics:**
- [ ] Metric 1
- [ ] Metric 2

**Dependencies:**
- [Any blocking work]

**A/B Test Ready?** [Yes/No - if yes, outline test plan]
```

### Priority Levels
- **🔥 Critical** — Fixes broken UI, removes friction from monetization flow
- **⚡ High** — 10%+ impact on engagement, brand new feature, fixes brand violations
- **💡 Medium** — 5-10% impact, nice-to-have UX improvements, polish
- **✨ Low** — <5% impact, cosmetic, can batch with other changes

---

## Specific Areas to Audit Weekly

### Landing Page (apps/web/src/)
- [ ] Hero CTA visible above fold?
- [ ] Copy is direct and skeptical?
- [ ] No marketing fluff?
- [ ] Mobile responsive?
- [ ] Dark mode works?
- [ ] Load time <3s?
- [ ] Contrast ratio ≥ WCAG AA?

### User Dashboard (apps/user-dashboard/src/)
- [ ] Tilt score prominent?
- [ ] Bonus expiry clearly labeled?
- [ ] Wallet connected status visible?
- [ ] Mobile responsive?
- [ ] No slow queries or API calls?
- [ ] Error states clear?

### Chrome Extension (apps/chrome-extension/src/)
- [ ] Popup loads in <500ms?
- [ ] Tilt score visible without scrolling?
- [ ] Mobile responsive?
- [ ] Dark mode respects system preference?
- [ ] Buttons are 48px+ touchable area?
- [ ] No unnecessary permissions requested?

### Discord Bot (apps/discord-bot/src/commands/)
- [ ] Slash command descriptions are clear?
- [ ] No emojis in descriptions?
- [ ] Command responses match brand tone?
- [ ] Error messages are specific?
- [ ] Response embeds include footer?

---

## Integration with Development

### Cursor Agent Invocation
```
@frontend-agent What are this week's top suggestions for improving conversion?
```

### CLI Command
```bash
pnpm suggest:frontend --week
pnpm suggest:frontend --area=dashboard
pnpm suggest:frontend --category=cta
```

### GitHub Action (Weekly)
```yaml
name: Frontend Suggestions
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC

jobs:
  suggest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm suggest:frontend --week --post-discussion
```

---

## Copy Style Guide (Reference)

### DO:
- ✅ "Your bonus expires in 2 days. Claim it or lose it."
- ✅ "Tilt score: 78. You're close to tilting. Step away."
- ✅ "Connect your wallet to earn tips."
- ✅ "3 games lost in 10 minutes. That's tilt."

### DON'T:
- ❌ "We're here to help you make better financial decisions."
- ❌ "Our powerful tilt detection algorithm..."
- ❌ "Please consider your spending habits."
- ❌ "Unfortunately, your withdrawal request was declined."

### Color & Style:
- **Primary action:** Blue (#0066FF) — High contrast on light & dark
- **Warning:** Red (#FF4444) — Tilt alerts, expiring bonuses
- **Success:** Green (#00CC44) — Bonus claimed, wallet connected
- **Neutral:** Gray (#999999) — Secondary info, disabled states

---

## Metrics to Track

**Weekly Dashboard Should Show:**
- Conversion funnel (signup → OAuth → wallet → first tip)
- Feature adoption (tilt alerts, trust score, bonus tracker)
- Mobile vs. desktop engagement
- Dark mode usage
- Extension daily active users
- Error rates by page

**After Implementing Suggestion:**
- Before/after metric comparison
- Time-to-implement vs. impact ratio
- User feedback sentiment

---

## Last Updated
**2026-03-13** — Initial version  
**Next Review:** 2026-03-20  
**Maintainer:** Frontend & Marketing Team

