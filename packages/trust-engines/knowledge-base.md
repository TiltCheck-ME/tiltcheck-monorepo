# Stake.us RTP & Trust Engine Knowledge Base

This file serves as the baseline ground truth reference for the Trust Log Analyzer and Casino Scraper. When evaluating Stake.us or calculating "RTP drift" penalties, the following mechanics, variance thresholds, and advertised RTPs must be respected to avoid false-positive penalizations.

## General RTP Architecture
* **Site-Wide RTP:** Stake.us **does not** have a single site-wide RTP. It varies by game.
* **Calculation:** The RTP can be verified by checking the game's "House Edge" tab. `100% - House Edge = RTP`.
* **Standard Slots:** Third-party slots (e.g., Pragmatic Play, Hacksaw) naturally float between **93% and 96.5%**.
* **Gold Coins (GC) vs Stake Cash (SC):** RTP and House Edge are universally identical regardless of the currency played.

## Enhanced RTP Titles
Stake offers a category of third-party games with boosted payout percentages pushed to ~98%.
* Enhanced RTP Big Bass Rock and Roll: 98%
* Enhanced RTP Gates of Heaven: 98%
* Enhanced RTP Sweet Fiesta: 98%

## Stake Originals (In-House Games)
Stake Originals offer the highest transparency and the lowest house edges (highest RTP), making them optimal for "churning" playthrough requirements. They operate on a Provably Fair system.

### Chicken
* **RTP:** 99.00% (1% House Edge)
* **Mechanics:** 25 face-down dishes. Reveal Chicken to multiply, reveal Bones (1-24 customizable) to bust.
* **Variance:** Correlates with the number of bones hidden.
* **Audit Threshold:** Due to short-term variance, "small samples" (100-500 rounds) can easily sit at 80% or 120% RTP. A **minimum of 10,000+ rounds** is required before short-term variance stabilizes enough to accuse the platform of RTP drift below the 99% mark.

### Pump
* **RTP:** 98.00% (2% House Edge)
* **Mechanics:** Turn-based multiplier climbing. Wait for the player's "pump" input.
* **Variance:** Low to Extremely High (controlled by Easy/Medium/Hard/Expert difficulty toggle).
* **Notes:** Unlike Crash (real-time automated multiplier climb), Pump allows turn-based pacing. It features a massive max payout potential of **3,203,384.80x**.

### Other Originals
* **Plinko, Dice, Crash:** ~99.00% RTP
* **Blackjack (Original):** Up to 99.43% RTP (requires perfect basic strategy; otherwise, user error inflates the actual house edge captured).
