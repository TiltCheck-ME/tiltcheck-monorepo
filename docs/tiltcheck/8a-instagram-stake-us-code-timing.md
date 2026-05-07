© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-07

# 8A. Instagram Stake.us Code Timing (Observed)

This is a raw observation log of Stake.us Instagram code drops (as captured by a user) with a basic timing analysis.

Scope:
- Date range: 2026-01-02 through 2026-05-04
- Sample size: 32 drops
- Amounts: $5 and $10
- Timezone: America/Los_Angeles (Pacific). DST is handled implicitly (Jan/Feb are PST, mid-March onward is PDT).

## Raw log (Pacific time)
```
01/02/2026     20:14   $5
01/04/2026     22:30   $10
01/07/2026     13:23   $10
01/09/2026     21:11   $5
01/10/2026     16:50   $5
01/12/2026     14:56   $5
01/13/2026     16:41   $10
01/16/2026     21:26   $5
01/18/2026     19:05   $5
01/19/2026     15:40   $10
01/21/2026     17:25   $5
01/23/2026     18:35   $10
01/26/2026     14:33   $5
01/28/2026     13:14   $10
02/01/2026     15:36   $10
02/09/2026     15:18   $5
02/17/2026     14:55   $10
02/23/2026     15:11   $10
02/28/2026     19:01   $10
03/03/2026     14:28   $5
03/10/2026     15:01   $10
03/15/2026     17:10   $5
03/18/2026     18:05   $10
03/23/2026     20:53   $5
03/27/2026     20:13   $10
03/29/2026     17:58   $5
04/06/2026     18:58   $10
04/11/2026     22:52   $5
04/19/2026     17:39   $10
04/28/2026     18:42   $10
04/29/2026     16:20   $5
05/04/2026     17:41   $10
```

## Summary stats
Totals:
- 32 drops
- $245 total
- $10: 17 drops
- $5: 15 drops

Weekday counts (Pacific):
- Mon: 8
- Tue: 5
- Wed: 5
- Thu: 0
- Fri: 5
- Sat: 3
- Sun: 6

Time-of-day bucket counts (Pacific):
- 12:00–14:59: 6
- 15:00–17:59: 13
- 18:00–20:59: 9
- 21:00–23:59: 4
- 00:00–11:59: 0

Gaps between drops (calendar days, based on Pacific-local timestamps):
- min: ~0.82 days
- median: ~3.04 days
- mean: ~3.93 days
- max: ~9.04 days

## Practical takeaway
If you’re watching for drops, the only real signal in this sample is the window:
- Most common: 15:00–17:59 Pacific
- Next most common: 18:00–20:59 Pacific

There is not enough evidence here to treat “weekday” as a reliable schedule, and the $5/$10 amounts do not show a clear time-based rule.

