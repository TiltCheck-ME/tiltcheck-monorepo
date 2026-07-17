# Canva Prompt Reply Examples (TiltCheck Brand)

These are sample AI "reply outputs" you can expect or target when feeding the original prompt blocks into Canva's design assistant. Each section includes:
- Original Prompt (condensed)
- Suggested Refinement (to steer Canva harder toward brand constraints)
- Sample Reply (plausible AI response / design breakdown)
- Quick Variations (alternate directions preserving brand voice)
- Asset Spec (size, format guidance)

Keep brand constants: Dark near-black backgrounds (#0a0a0a–#16213e), accents cyan (#00d4aa) + electric blue (#00a8ff), occasional danger red (#ff6b6b) for alerts, no gradients except strategic hero / founder sections, no emojis, professional degen tone.

---
## 1. Hero Section (Landing Page)
**Original Prompt**: "Design a hero titled 'TiltCheck — The Degen Transparency Layer' with a dark gradient, subtle trust grid pattern, CTA button, and space for a short 2-line positioning statement."

**Refinement**:
"Full-width hero, 1440px canvas. Background: diagonal dark gradient (#1a1a2e → #16213e) with a faint geometric mesh (opacity <5%). Large H1: 'TiltCheck' and subheading: 'The Degen Transparency Layer'. Include a concise positioning block of 2 lines (semi-bold, 1.2rem). Single primary CTA button 'Explore Tools'. Use accent cyan for underline flourishes, avoid glow effects. Add minimal corner micro-label 'Non-Custodial • Transparent • Modular'."

**Sample Reply**:
"Layout: Centered vertical stack. Background gradient applied; mesh overlay at 4% opacity using thin lines. Typography: Inter Bold 72px for H1, Inter Medium 22px for subheading, 600 weight for two-line positioning. Accent bars left of subheading in #00d4aa (4px width, 48px height). CTA: Rounded rectangle (8px radius), filled #00d4aa, hover shift to #00a8ff. Micro-label: top left, Inter SemiBold 11px, letter spacing +6%. Color palette consistent; adequate contrast meets WCAG AA."

**Quick Variations**:
- Variation A: Left-aligned hero with an abstract trust ring SVG faintly behind text.
- Variation B: Split layout with hero copy left, stylized gauge cluster right (three outlined circles at 30% opacity).
- Variation C: Dark matte background (#121212) with a narrow cyan accent bar spanning top edge.

**Asset Spec**: Export at 2880×1600 for retina; provide a cropped mobile 1080×1920 vertical version.

---
## 2. Trust Gauges Component Set
**Original Prompt**: "Produce a component gallery of trust gauges: circular ring, horizontal bar, pill badge, sparkline, all dark theme and accent colors only."

**Refinement**:
"Design a modular gauge set on a neutral dark board (#0f0f0f). Include: 1) Circular ring gauge (arc 70% filled, inside numeric value). 2) Horizontal bar gauge showing segmented progress. 3) Pill badge (status: 'Stable', background #1a1a1a, border accent cyan). 4) Sparkline card (small trend line over last 12 events). Use consistent corner radius 12px for cards, inner spacing 20px. Font Inter Medium for labels (11px uppercase)."

**Sample Reply**:
"Circular ring: Outer stroke 10px #222, filled arc stroke #00d4aa 10px with 70% circumference. Center value '74' in Inter SemiBold 28px, label 'Casino Trust' uppercase 10px below. Horizontal bar: container 240×16px, background #181818, fill gradient disabled; solid cyan fill to 62%. Pill badge: 92×30px, rounded 30px radius, text 'STABLE' letter-spaced +4%, border 1px #00d4aa. Sparkline: mini card 200×80px, line stroke #00a8ff, baseline faint #333, subtle dots at peaks (4px). All components share subtle shadow (0 2px 4px rgba(0,0,0,0.45))."

**Quick Variations**:
- Variation A: Dual-color ring (outer arc reliability, inner arc volatility).
- Variation B: Horizontal bar segmented into 5 equal trust tiers with thin separators.
- Variation C: Sparkline replaced by delta histogram (bars minimalistic).

**Asset Spec**: Export SVG for gauges (vectors); PNG preview sheet 1600×900.

---
## 3. Tool Icon Set (Modules)
**Original Prompt**: "Generate crisp, line-based SVG icons for: JustTheTip, SusLink, CollectClock, FreeSpinScan, Tilt Engine, DA&D, Accountability Wallet. Monochrome lines with accent option."

**Refinement**:
"Create a unified icon grid (7 icons) at 48×48 viewport each. Style: 2px stroke, no fills except small accent dots (#00d4aa). Consistent stroke round caps. Each icon metaphor: JustTheTip (non-custodial transfer: two diverging arrows), SusLink (broken chain link with scan beam), CollectClock (clock + stacked bonus ticket), FreeSpinScan (radar sweep over chip), Tilt Engine (gyroscope ring tilted 15°), DA&D (stylized playing card with abstract AI nodes), Accountability Wallet (shield + wallet outline). Background transparent."

**Sample Reply**:
"Icons drafted with uniform stroke (#eee) and selective accent elements (#00d4aa). Arrows for JustTheTip: opposing diagonal arrows, small circle node center. SusLink: chain link broken at top-right, small radial scan lines 3 segments. CollectClock: circular clock 3 markers + small rectangular ticket overlapped bottom-right. FreeSpinScan: poker chip outline + sweeping arc (partial circle). Tilt Engine: ring ellipse with inner pivot dot offset. DA&D: vertical card rectangle, top-left badge circle, bottom-right node cluster of 3 small dots. Accountability Wallet: wallet rectangle with overlapping shield outline front center. All exported as individual SVGs + sprite sheet."

**Quick Variations**:
- Variation A: Use negative space cutouts for Tilting motion effect.
- Variation B: Introduce dual accent (#00a8ff) for nodes while keeping main accent cyan.
- Variation C: Minimal filled accent circle in each icon center for brand consistency.

**Asset Spec**: Provide individual `*.svg` + combined `icons-sprite.svg` (symbol IDs kebab-case). Ensure scale independence.

---
## 4. Legal Rights Badge
**Original Prompt**: "Design a badge for 'Legal Rights Alert' used in casino trust section. High contrast, non-gimmicky, small footprint."

**Refinement**:
"Badge 220×70px, dark surface (#1a1a1a) with thin 2px border #ff6b6b. Title line: 'Legal Rights Alert' Inter SemiBold 14px. Subline: 'Potential grounds: payout delay' Inter Regular 11px. Left icon: minimalist balance scales (line art, stroke #ff6b6b). Right side: subtle vertical bar in cyan (#00d4aa) 4px wide spanning full height. No glow, no drop shadow beyond subtle 0 2px 4px rgba(0,0,0,0.4)."

**Sample Reply**:
"Badge created: rectangle radius 10px, border color #ff6b6b. Scales icon 24×24 with 2px strokes, positioned 12px from left. Text block: title in #ff6b6b, subline muted #bbb. Accent vertical bar placed flush right inside badge with 4px width #00d4aa. Composition passes contrast; easily scalable to 1.5×. Provided SVG + PNG variants."

**Quick Variations**:
- Variation A: Replace right cyan bar with bottom accent underline.
- Variation B: Border uses dashed pattern when severity escalates.
- Variation C: Add miniature evidence-chain icon variant (stacked papers) for contexts requiring data package visual.

**Asset Spec**: Export base SVG, plus `badge--highsev.svg` variant (dashed border).

---
## 5. Trust Engine Dual Diagram
**Original Prompt**: "Diagram showing Casino Trust Engine and Degen Trust Engine as two layers feeding transparency outcomes."

**Refinement**:
"Landscape diagram 1400×700. Two primary vertical columns: left 'Casino Trust Engine', right 'Degen Trust Engine'. Each column: 4 stack blocks (Fairness, Payout Timelines, Bonus Nerfs, Compliance) vs (Behavior Signals, Reputation, Scam Flags, Accountability). Center overlap area labeled 'Unified Transparency Layer' with output arrows to three pill nodes: 'Alerts', 'Scores', 'Evidence Package'. Color: columns subtle difference (#16213e left, #1a1a2e right), shared accent connectors cyan. Typography Inter Medium 16px for block labels. All shapes rounded radius 12px."

**Sample Reply**:
"Diagram constructed: two tinted columns with equal width, each containing four stacked rounded rectangles spaced 24px vertical. Column headers bold 22px. Central convergence zone diamond shape (rotated square) in neutral dark (#121212) with glowing cyan outline (2px, soft). Three output pill nodes horizontally arranged below, each with icon: bell (Alerts), gauge (Scores), document (Evidence). Arrows: thin lines with arrowheads, stroke #00d4aa. Legend bottom-right clarifying color semantics. Delivered as layered SVG."

**Quick Variations**:
- Variation A: Replace diamond with interlocking rings motif.
- Variation B: Animated connector arrows (for web embed) with dashed motion path.
- Variation C: Use a vertical funnel narrowing from dual inputs to single output channel.

**Asset Spec**: Provide static SVG + optional animated Lottie JSON (arrows pulsing) at 60fps loop.

---
## 6. Bonus: Accountability / Evidence Package Card
**Original Prompt**: "A compact card representing the evidence package generated for disputes."

**Refinement**:
"Card 360×180, dark surface, title 'Evidence Package Ready'. Include checklist items: 'Payout Log', 'Chat Transcript', 'Bonus History', 'Severity Timeline'. Left side vertical progress indicator (4 steps complete). Export in neutral style; accent cyan for progress bullets." 

**Sample Reply**:
"Card: background #141414, radius 14px, header bold 16px, list items 13px with cyan bullet dots (6px). Right corner small document icon outline. Progress indicator: narrow column 10px wide with four filled cyan circles spaced evenly. Minimal shadow."

**Quick Variations**:
- Variation A: Replace vertical progress with horizontal segmented bar.
- Variation B: Use checkmarks (stroke) instead of bullet dots.
- Variation C: Add subtle tag 'Non-Custodial' top-right.

**Asset Spec**: SVG for web embed + PNG preview 720×360.

---
## Usage Guidance
- Always request SVG if geometric clarity matters (icons, diagrams, gauges).
- Use PNG only for composite hero exports or texture-heavy variants.
- Maintain consistent stroke weight across iconography (2px standard).
- Avoid visual noise; transparency messaging relies on clarity + restraint.

## Next Steps
If you want, I can generate the actual SVG icon set or convert any of these sample replies into production-ready assets. Just specify which block to implement first.
