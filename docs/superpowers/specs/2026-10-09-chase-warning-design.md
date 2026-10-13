<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 -->

# Chase warning — design spec

Status: Approved (design)
Owner: founder (solo)
Surface: Chrome extension Core on a casino tab, beside the spin pace lock
Date: 2026-10-09

Depends on `docs/superpowers/specs/2026-10-09-spin-pace-lock-design.md`. This does not change the two-second lock.

## Problem

Fast clicks are not the only tilt sign. Raising the stake after a loss is the get-even chase. The lab pattern is that losses make the next spin faster (Ferrari, 2022; Verbruggen et al., 2017). Every spin already waits two seconds, so Core cannot see a separate speed-up. It can see stake and balance. A short named warning matches a brief nudge before any harder stop (Petry, 2009; Dixon and Johnson, 2012). A longer freeze does not.

## Mission

When the last spin lost and the next stake is bigger, say so once. The spin still goes through. The two-second lock is unchanged.

## Locked behavior

- The toast text is: No cap, the last one lost and this stake is bigger. That's the chase.
- The toast shows on the spin that places the bigger stake. That spin is not blocked. `lockUntil` does not change.
- One toast node. A second chase does not add another node. A later raise after another loss may show the same node again.
- A bigger stake after a win stays quiet. The same stake after a loss stays quiet. A smaller stake after a loss stays quiet.
- Core remembers one number, `lastLosingStake`, in memory. A reload clears it. It is not written to `chrome.storage`. There is no session log.
- If enforcement is off, this warning is not installed. The same switch as the pace lock. No new setting.
- This path does not call `triggerTouchGrassTimeout`. It does not construct, sign, or send a transaction.

## Read

Use the existing per-casino `betAmount` and `balance` selectors in `apps/chrome-extension/src/extractor.ts` for the current host. Do not send a spin to the gameplay analyzer. Do not compute RTP. Pro stays off. `recordBet` stays unwired.

On a spin that goes through:

1. Read the stake and the balance before the outcome.
2. Watch the balance until it differs from that start, or for `CHASE_SETTLE_MS` (5000), whichever comes first.
3. The first balance that differs from the start is the result. Lower: `lastLosingStake` becomes the stake just read. Higher: clear `lastLosingStake`.
4. No change within 5000ms: do not record a loss and do not toast.

On the next spin that goes through, if `lastLosingStake` is a number and the stake on the page is greater than it, show the toast, then run the same watch for this spin. A null `lastLosingStake` does not toast.

## Parse

Strip currency symbols and commas. One number or the read is skipped. A skipped stake does not toast and does not update `lastLosingStake`. A skipped balance does not count as a result. The two-second lock still runs.

## UI

The chase line is a second element in the open shadow root `#tiltcheck-pace-host`. It does not replace the pace toast. The stylesheet stays inside that root.

## Homepage

Append this sentence to `HOME_LAUNCH.lede` in `apps/web/src/lib/home-launch-copy.ts`:

If the last spin lost and the next stake is bigger, it says so. The spin still goes through.

Do not change the three cards, the install steps, or `SITE_ONE_LINER` in this spec.

## Tests

- A loss, then a bigger stake, shows the chase line once, and the spin click still runs.
- A win, then a bigger stake, stays quiet and clears `lastLosingStake`.
- The same stake after a loss stays quiet.
- A smaller stake after a loss stays quiet.
- An unreadable stake stays quiet and does not change `lastLosingStake`.
- A balance that never moves does not record a loss. The watch stops at 5000ms.
- A second raise after another loss shows the same one toast node, not two.
- Enforcement off installs neither the pace lock nor this warning.

## Out of scope

Session stats, an RTP check, a research writeup, a longer freeze, the two-minute cover, and any tip or wallet work.
