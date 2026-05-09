<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 -->

# RG Tools v1 Plan

## A. Scope

RG Tools v1 focuses on player-protection surfaces that reduce tilt loops without creating custody, payout, or contest-law risk.

## B. Core Surfaces

- `LockVault`: timed locks, wallet action locks, guardian recovery, and paid early-unlock friction.
- `Touch Grass`: fast off-ramp when session behavior starts looking cooked.
- `Degen Trivia`: skill-based community activity that can redirect attention without a house edge.
- `Recovery Microgrants`: manual support flow for players who got rinsed and need structured help.

## C. Non-Custodial Boundary

TiltCheck does not hold user keys, execute wallet transfers from user accounts, or mint internal balances that pretend money moved. Wallet movements must be user-signed or explicitly handled by a reviewed treasury workflow.

## D. Early-Unlock Fees

Paid early-unlock fees are a harm-reduction friction mechanism, not jackpot fuel. For RG v1, the user-facing route is:

- debit the configured early-unlock fee from the LockVault ledger;
- log the configured dev skim for reconciliation;
- route the remaining recovery allocation to the recovery microgrant ledger;
- do not credit trivia jackpots from penalty, fee, or punishment mechanics.

## E. Recovery Microgrant Ledger

The recovery microgrant pool can receive early-unlock recovery allocations and other reviewed funding sources. Any payout path remains manual, reviewed, and non-custodial until a production treasury workflow is approved.

## F. Degen Trivia

Degen Trivia remains a skill-based community activity and a safer attention redirect. Activity testing can continue, but payout language must stay conservative until public rules are approved.

## G. Trivia Jackpot Treasury

Penalty-funded jackpots are deferred. No LockVault penalty, early-unlock fee, trust penalty, or similar friction mechanic may seed the trivia jackpot.

The only allowed funding path before legal review is voluntary donation to a published treasury address:

- publish the treasury address on a transparent web page;
- state that donations do not buy entry, odds, or a promised payout;
- state that no guaranteed prize pool exists;
- keep Discord command/help copy gated behind counsel review before enabling payout claims;
- reconcile any treasury movements publicly before promoting a trivia drop.

Open legal review:

- contest and sweepstakes treatment by jurisdiction;
- crypto payout restrictions and tax reporting;
- donation wording and no-consideration entry mechanics;
- winner selection, eligibility, and dispute rules.

## H. Launch Gate

Do not promote prize-bearing trivia until the public rules, treasury reconciliation process, Discord command copy, and payout workflow are reviewed. No cap, this is the line between a community game and a skem-shaped compliance problem.
