---
title: Provably Fair – What It Actually Covers (and What It Doesn't)
status: Draft
date: 2025-11-20
---

# Provably Fair ≠ Holistically Fair

Provably fair systems (server seed + client seed + nonce hashed with a known algorithm) let a player verify that the raw RNG outputs were not altered post‑generation. They DO NOT guarantee that the surrounding game logic, payout tables, reel mapping, or dynamic configuration is stable, honest, or consistent across time. Casinos can truthfully say “the RNG is provably fair” while still shaping player outcomes through non-RNG layers.

## 1. What Provably Fair Actually Verifies
| Layer | Covered | Explanation |
|-------|---------|-------------|
| Seed hash pre‑commit (server seed) | Yes | Casino reveals hash of secret seed ahead of play, later reveals seed for verification. |
| Client seed influence | Partially | Player can set / randomize their client seed, but casino can constrain its effect size. |
| Nonce increment per bet | Yes | Sequential index ensures deterministic ordering of outputs. |
| Hash / HMAC algorithm correctness | Yes (auditable) | Player can recompute outcomes locally (e.g., SHA256(serverSeed + clientSeed + nonce)). |
| Post-generation tampering of RNG output | Designed to prevent | If final seed disclosed, any divergence becomes detectable. |
| Game logic fairness (RTP, reel weighting, volatility mode) | NO | Outside the cryptographic commitment. |
| Dynamic config changes mid‑session | NO | Casino can change mapping without altering seed sequence. |
| Seed rotation timing strategies | NO | Rotation schedule can be exploited (e.g., avoiding ‘hot’ windows). |
| Bonus / feature trigger weighting | NO | Separate layer can scale trigger chances independent of RNG purity. |

## 2. Gray-Area Mechanics Creating Illusion of Time-Based RTP Swings
These techniques do not falsify RNG outputs; they alter interpretation or payout mapping so players perceive “RTP changes” even though seed + nonce sequences remain valid.

1. Reel / Outcome Mapping Layers
   - RNG picks an index; mapping table can be swapped (e.g., daytime table vs nighttime table) with different symbol distributions.
   - Weighted tables can bias toward low volatility when player balance is high, then increase volatility after a loss streak.
2. Multiple RTP Versions
   - Vendor may offer 96%, 94%, 92% variants. Casino can silently toggle which variant a player gets based on session metadata (geo, bankroll, recency, VIP tag).
3. Volatility Modes / Hidden States
   - Behind-the-scenes state machine selects a volatility regime (low / medium / high). RNG output decides symbol, but per-mode payout intervals differ.
4. Feature Trigger Scaling
   - Free spins / bonus entries apply multiplicative weighting per player segment. Not visible to player yet still consistent with RNG draws.
5. Seed Rotation Timing Games
   - Provably fair claims often rotate server seeds daily or per X bets. A casino can align rotations with observed hot/cold streak patterns to ‘reset’ favorable distributions without appearing manipulative.
6. Adaptive RTP Dampening
   - If a player wins above expected EV, subsequent mapping can bias toward outcomes with lower variance—subtle suppression rather than overt rigging.
7. Session Segmentation / A/B Logic
   - Player bucket assignment (new vs returning vs chasing losses) chooses which RTP/volatility profile they experience, while RNG remains identical in form.
8. Hidden Bonus Bank Mechanics
   - Some slots accumulate internal meters that pay out only when crossing thresholds; adjusting threshold progression rate alters effective RTP timing.
9. Cascading Outcome Filters
   - Initial RNG output selects a large outcome set; secondary filters prune rare high payouts in certain windows (e.g., peak traffic) to manage liability.
10. Time-of-Day Payout Scheduling
    - Operator caches large wins for marketing bursts at prime times; near-real-time mapping throttles large payouts at off-peak while RNG is still verifiable per bet.

## 3. Why Players Perceive “RTP Changes”
| Perception | Underlying Cause |
|------------|------------------|
| Morning feels colder | Shift to lower volatility mode or tighter reel mapping before peak engagement period. |
| After big win, dead spins | Adaptive dampening logic engages; high-value symbols recede due to alt reel weighting. |
| Late night ‘comebacks’ | Release of stored bonus bank / high-volatility mapping reactivated. |
| Different luck across devices | Device fingerprint used for segmentation (mobile flagged as ‘casual’, gets safer RTP variant). |

## 4. Player Verification Limits
Even with seed transparency, the player can only recompute the raw numeric or index outcome. They CANNOT:
- Prove reel table remained constant across the session.
- Detect silent RTP version toggles.
- See volatility mode transitions unless surfaced by the UI.
- Distinguish legitimate variance vs mapping manipulations without historical mapping snapshots.

## 5. Detection & Auditing Strategies (TiltCheck Angle)
TiltCheck cannot “break” the seed model, but it can accumulate signals suggesting behavioral or config shifts:
1. Outcome Distribution Drift: Track symbol frequencies vs published paytable baseline; alert if sustained deviation > threshold (e.g., chi-square test p < 0.01).
2. RTP Variant Fingerprinting: Estimate rolling EV over N spins and cluster sessions; multiple stable plateaus hint variant switching.
3. Volatility Mode Inference: Compute variance of net returns in sliding windows; abrupt variance compression after large win = flag.
4. Time-of-Day Curve Analysis: Compare aggregate payout % by hour vs expected uniform; persistent cyclical dips = potential scheduling.
5. Seed Rotation Impact: Correlate rotation boundary with win clusters; excessive alignment triggers suspicion.
6. Bonus Trigger Latency: Track expected trigger frequency vs actual; chronic undershoot then sudden catch-up suggests bank throttling.

## 6. Trust Engine Integration
Proposed events / metrics (extend existing `trust.casino.updated` reasoning):
| Metric | Event / Field | Meaning |
|--------|---------------|---------|
| payout.drift.score | trust.casino.updated.metadata.payoutDrift | Normalized 0–1 divergence from baseline distribution |
| volatility.shift.score | metadata.volatilityShift | Magnitude of variance change after feature/win |
| rotation.correlation.score | metadata.seedRotationCorrelation | Correlation of seed boundaries with payout anomalies |
| bonus.latency.score | metadata.bonusLatency | Relative delay factor vs expected trigger model |

High composite anomaly could auto-suggest a LockVault CTA: “High configuration volatility detected – consider locking funds for cooldown.”

## 7. Player Protection Patterns
| Pattern | Benefit |
|---------|---------|
| Pre‑session snapshot (mapping hash claim) | Later diff shows mapping change |
| Independent spin logger (local) | Builds evidence for distribution drift |
| Volatility threshold alerts | Notifies when variance suppression likely |
| Cooldown / LockVault after surge | Reduces chase behavior in manipulated post‑win environment |
| Casino trust scoreboard (live) | External transparency discourages predatory config shifts |

## 8. Recommended Transparency Upgrades for Casinos
Minimum baseline to meaningfully claim fairness beyond RNG:
1. Publish reel / mapping version IDs with timestamps.
2. Expose RTP variant currently applied per session.
3. Emit volatility mode transitions as signed events.
4. Commit future seed rotation schedule (pre-announced) so timing cannot be adaptive.
5. Provide bonus trigger expected frequency vs actual stats daily.

## 9. Red Flags for Manipulative Configuration
| Indicator | Interpretation |
|-----------|---------------|
| Frequent RTP version changes (< 500 spins apart) | Variant targeting / micro-profiling |
| Large score drop immediately after seed rotation | Rotation used to clear favorable mapping state |
| Sustained symbol scarcity (high-paying) without global win events | Possible selective pruning |
| Volatility collapse after high payout | Post-win dampening logic engaged |
| Bonus trigger drought then burst near peak hours | Scheduled payout release |

## 10. Limitations & Ethical Boundary
Not every deviation = malicious. Legit factors:
- Network outages altering bonus progression.
- Regulatory enforced RTP adjustments regionally.
- Genuine statistical clusters (variance) misread as manipulation.
Our detection must report “anomaly” with confidence bands & avoid accusatory tone.

## 11. Roadmap Hooks
Short-term:
- Implement payout drift and volatility shift metrics (chi-square + rolling variance).
Medium:
- Integrate seed rotation correlation tracking.
Long-term:
- Open standard schema: Casino emits signed JSON describing mapping + RTP variant per hour.

## 12. Player-Facing Simplified Summary (TL;DR)
“Provably fair proves the randomness hash. It does NOT prove the game’s payout configuration stayed constant. Casinos can keep RNG legit while altering RTP variants, reel weights, volatility modes, timing of seed rotations, or bonus throttling—making it feel like the game is ‘cold’ or ‘hot’ at certain times. We monitor distribution drift and configuration signals to flag these gray zones and recommend cool-off locks when volatility patterns look engineered.”

---
Update this document as measurement modules ship (payout drift listener, volatility analyzer, rotation correlation engine).