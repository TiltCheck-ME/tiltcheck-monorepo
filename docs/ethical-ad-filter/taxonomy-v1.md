<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 -->

# Ethical Ad Filter Taxonomy v1

Made for Degens. By Degens.

## Scope

Taxonomy v1 defines the minimum policy surface for the ethical ad filter MVP. It is intentionally client-agnostic so the DNS/VPN, browser/WebView, or research-export slice can reuse the same category names and enforcement tiers without a policy rewrite.

Out of scope for v1: ad detection heuristics, DOM mutation behavior, reporting UX, integrity signing, user overrides, sensitivity profiles, and retention analytics. Those belong to the follow-up rule evaluation and policy artifact work.

## Enforcement Tiers

| Tier | Definition | Intended Handling |
| :--- | :--- | :--- |
| `block` | Hide or replace high-confidence gambling conversion ads, credit hooks, or urgency tactics that push a user toward deposit, wager, or chase behavior. | Remove the creative from view or replace it with a neutral TiltCheck interstitial. Log category, placement, confidence, and rule version. |
| `blur` | Obscure ambiguous or informational gambling content until the user makes an intentional reveal choice, then log the reveal for policy tuning. | Apply a blur or click-to-reveal shell. Do not silently remove content when the match is affiliate or sponsored context but not an immediate CTA. |
| `allow_log` | Leave low-risk, educational, compliance, or low-confidence matches visible while logging category, placement, and confidence for audit. | Preserve the page experience and capture telemetry only. This is the "maybe sus, keep receipts" tier. |

## Categories

| Category | Default Tier | Definition | Examples |
| :--- | :--- | :--- | :--- |
| `casino_bonus_promos` | `block` | Deposit matches, free spins, no-wagering claims, reload bonuses, risk-free bets, or bonus countdowns that directly push gambling conversion. | "100% deposit match", "free spins when you sign up", "reload bonus ends soon" |
| `sportsbook_odds_boosts` | `block` | Betting odds boosts, boosted parlays, same-game parlay promotions, or sportsbook CTAs designed to accelerate wager placement. | "boosted parlay", "bet now at enhanced odds", "same-game parlay special" |
| `vip_retention_chase_hooks` | `block` | VIP ladder, lossback, cashback, rebate, rakeback, or comeback messaging that frames continued gambling as recovery or status protection. | "claim your lossback", "VIP reload waiting", "cashback to win it back" |
| `credit_cash_advance_hooks` | `block` | Credit card, cash advance, payday, BNPL, or instant funding ads presented near gambling content or framed as bankroll recovery. | "instant cash advance", "borrow for tonight", "fund your wallet now" |
| `affiliate_review_rankings` | `blur` | Casino rankings, bonus comparison tables, referral reviews, or best-site lists that steer users toward gambling operators via affiliate intent. | "top casinos this month", "best crypto casinos", "exclusive referral code" |
| `influencer_casino_sponcon` | `blur` | Creator-led casino sponsorships, wager challenge clips, streamer bonus codes, or social proof that normalizes high-frequency gambling. | "use my casino code", "sponsored slot challenge", "watch this heater" |
| `operator_brand_mentions` | `allow_log` | General gambling operator names, logos, or sponsorship disclosures without a direct deposit, bonus, odds, or wager CTA. | "presented by example casino", "casino logo on stream overlay", "operator named in neutral article" |

## Policy Notes

Block is reserved for direct conversion pressure and bankroll-risk hooks. No cap, if the creative is telling a user to deposit, chase, borrow, or fire a boosted bet, it should not get a polite little blur.

Blur is for content that may be editorial, affiliate, or sponsored context but still nudges a user toward gambling operators. The user can reveal it intentionally, and the reveal becomes useful signal for tuning.

Allow+log is not a free pass. It is a low-friction audit path for low-confidence matches, neutral references, and compliance-safe context where blocking would create too many false positives.

## Source Of Truth

The canonical TypeScript definitions live in `packages/types/src/index.ts`:

- `ETHICAL_AD_FILTER_TIERS`
- `ETHICAL_AD_FILTER_TIER_DEFINITIONS`
- `ETHICAL_AD_FILTER_CATEGORIES`
- `ETHICAL_AD_FILTER_CATEGORY_DEFINITIONS`
