<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 -->

# Findings — predatory practices that extract tilted players

Scope: concrete mechanics used by online casino and betting sites to keep a player spinning, depositing, or reversing a cashout after a heater or a rinse. Preference given to regulator enforcement, RG/academic papers, and investigative reporting. Casino-blog mechanics are noted only when a regulator already named the same trap.

This is a research brief, not product spec. It does not claim TiltCheck can block these operators.

---

## 1. Bonus traps

The bonus is not free money. It is a contract that converts a deposit into play-through, then gives the house a second bite if the player breaks an opaque rule.

### Wagering requirements (play-through)

UKGC evidence: high wagering attached to bonuses raises intensity and complexity, which raises harm risk. The Commission's own example:

> "a £10 bonus with a 50 times wagering requirement requires the consumer to play through £500 before the winnings can be withdrawn."
>
> "Such high wagering requirements could confuse consumers and lead them to gamble for longer, and faster, than they are used to."

Source: [Gambling promotions to be safer and simpler](https://www.gamblingcommission.gov.uk/news/article/gambling-promotions-to-be-safer-and-simpler) (26 March 2025; implementation 19 January 2026).

From 19 January 2026, GB-licensed operators must cap promotional wagering at **10x** the incentive and must not mix product types inside one incentive (e.g. "bet then play slots"). Mixed-product offers were banned because multi-product play is a documented harm marker and the T&Cs are hard to parse. Source: same UKGC news item; [consultation response executive summary](https://www.gamblingcommission.gov.uk/consultation-response/autumn-2023-consultation-proposed-changes-to-lccp-and-rts-socially/executive-summary-socially-responsible-incentives-consultation-response); [LCCP 5.1.1](https://gamblingcommission.gov.uk/licensees-and-businesses/lccp/condition/5-1-1-sr-code).

Grey-market and pre-cap GB practice routinely used 30x–70x. The 10x cap is GB-only. Curaçao / crypto sites are not bound by it.

### Sticky vs non-sticky (mixed pot)

**Sticky (locked):** deposit and bonus are treated as one pot. Withdrawal of the player's own cash is blocked until wagering is cleared, or the unused bonus plus related winnings are clawed on cashout. This is the classic "your money is now ours until you grind it."

**Non-sticky (separate pot):** player cash and bonus sit in two balances. Player can cash the deposit (and deposit winnings) without clearing bonus play-through; unused bonus is forfeited.

UKGC / CMA consumer-law baseline (GB) treats the sticky mix as the prohibited pattern:

> "players must not be made to meet wagering requirements before they can withdraw money from their deposit balance"
>
> "funds from deposit and bonus balances must not be mixed together or displayed to the player as a single pot of money"

Banned example terms: "You may withdraw up to £5,000 per day once you have wagered your original deposit" and "Before making any withdrawals from your deposit account, you must first wager the value of this 5 times."

Source: [Restrictions on withdrawing deposit and deposit winnings](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/restrictions-on-withdrawing-deposit-and-deposit-winnings) (updated 28 May 2024).

This is the regulator naming the sticky mechanic without using the industry slang. Off-GB sites still ship sticky bonuses as the default.

### Max bet, game weighting, expiry

**Max bet while bonus is active.** A typical clause voids the bonus and related winnings if a single spin exceeds a cap (often £5 / $5, sometimes lower). The player who tilts up the stake after a rinse trips the clause and loses the heater. UKGC requires promotional play restrictions to be listed in advance, and software must block a prohibited stake rather than let the player place it and then confiscate the win. Source: [Promotional play restrictions](https://www.gamblingcommission.gov.uk/authorities/codes-of-practice/guide/page/promotional-play-restrictions); [Restrictions on withdrawing deposit](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/restrictions-on-withdrawing-deposit-and-deposit-winnings).

**Game weighting.** Slots often count 100% toward wagering; table games and roulette are weighted down so the effective play-through explodes. UKGC's own worked example:

> "a bonus might carry 10 times wagering requirements on all slots but will be weighted at 50 percent for blackjack and 30 percent for roulette. This means that if you have a £100 bonus with 10 times wagering requirement and you decide to play a casino game like roulette with a 30 percent weighting, each £1 you wager contributes 30 pence towards the wagering requirement."

Source: [Bingo and casino technical requirements — Proposal 1](https://www.gamblingcommission.gov.uk/standards/bingo-and-casino-technical-requirements/proposal-1-ban-or-limit-the-use-of-wagering-requirements). The Commission did **not** cap weightings in the 2026 package. It said it would "keep under review." So even a 10x headline can be 33x real play-through on roulette.

**Expiry.** LCCP 5.1.1 requires incentive T&Cs to be "clear, transparent, and fair and readily accessible," including time limits. Short expiry + high wagering is the squeeze: the player who does not grind fast enough loses the bonus and often the deposit-linked winnings. Source: [LCCP 5.1.1](https://gamblingcommission.gov.uk/licensees-and-businesses/lccp/condition/5-1-1-sr-code).

Hing et al. (2018, 2019), scanned in the McGarrigle scoping review: inducements on race/sports brands were "subject to numerous terms and conditions which were complex, difficult to find, and obscured by legalistic language"; 58% of surveyed bettors underestimated the extra amount they would need to bet to unlock bonus winnings. Source: [Dark patterns in online gambling: A scoping review](https://real.mtak.hu/237479/1/2006-article-p99.pdf) (McGarrigle et al., *Journal of Behavioral Addictions*, 2026), citing Hing et al. 2018/2019.

### Bonus-abuse clauses used against the player

The house writes "bonus abuse" as a residual discretion, then applies it after a win.

UKGC prohibited pattern (paraphrased from the Commission's own "do not" example):

> "Your membership of the scheme may be withdrawn if it is abused, and we will decide on what behaviour and types of play constitutes an abuse."

Required instead: list every prohibited pattern in advance; separate fraud/collusion terms from promotional play restrictions; if winnings are refused, give a full explanation of the specific term breached. "Operators must not reserve sole discretion to determine when and what forms of play breach terms and conditions."

Source: [Promotional play restrictions](https://www.gamblingcommission.gov.uk/authorities/codes-of-practice/guide/page/promotional-play-restrictions).

Enforcement case: **Taichi Tech Limited (Fafabet), fined £170,000 (July 2025)** for a bonus term stating Fafabet had "the right at their own discretion to close accounts or forfeit winnings." The Commission held that discretionary forfeiture "lack[s] transparency and may lead to unfair outcomes." Same case: high-velocity spend (tilt marker) got insufficient customer interaction.

Source: [Taichi Tech Limited fined £170,000 for unfair terms and conditions](https://www.gamblingcommission.gov.uk/news/article/taichi-tech-limited-fined-gbp170-000-for-unfair-terms-and-conditions).

Sector-wide backdrop: the 2018 CMA + UKGC joint programme targeted "fairness, transparency and potential for consumers to be misled by a number of terms and practices relating to online bonus promotions, and on obstacles preventing withdrawal of customer funds." Undertakings were then extended to all licensees via LCCP (in force 31 October 2018). Source: [Joint CMA and Gambling Commission letter to the gambling sector](https://www.gamblingcommission.gov.uk/licensees-and-businesses/page/joint-cma-and-gambling-commission-letter-to-the-gambling-sector).

---

## 2. Withdrawal friction

The deposit path is one tap. The cashout path is a maze. That asymmetry is the product.

### Instant deposit, delayed withdrawal, reverse-cashout

Newall (2025), *Addiction*:

> "GB gambling websites have also in the past taken sludgy friction further, by processing deposits instantly, but by placing delays of up to several days on withdrawals. Furthermore, during this withdrawal-delay prominent buttons were displayed to encourage gamblers to reverse the withdrawal, and thereby instantly enable further gambling with the money that was intended to be withdrawn. Although these 'reverse-withdrawals' are now banned by the GB regulator, they can still be performed on gambling websites elsewhere."

Source: [Sludge, dark patterns and dark nudges](https://research-information.bris.ac.uk/ws/portalfiles/portal/454361319/Addiction_-_2025_-_Newall_-_Sludge_dark_patterns_and_dark_nudges_A_taxonomy_of_on_line_gambling_platforms_deceptive.pdf) (doi:10.1111/add.70085). Journal version: https://doi.org/10.1111/add.70085

Click-count sludge: deposit pages fewer clicks from home than withdrawal pages; sign-up in under five minutes vs account closure via lengthy customer-service calls (Newall citing audit / qualitative work). Same paper.

### KYC / document loops at cashout

UKGC contact centre: **around 2,000 complaints a year** about delayed withdrawals. The Commission's position:

> "it is not acceptable for operators to introduce friction when a customer tries to withdraw from their account rather than when they deposit into the account, or to place the operator’s commercial interests over those of their customers."

If a withdrawal is delayed or refused, the operator must tell the player why (including if the operator is investigating a T&Cs breach). Identity checks belong **before** first deposit, not as a cashout surprise.

> "players must not be asked for information at the point they request a withdrawal from their account if the operator could reasonably have asked for this information at an earlier time."

Sources: [Key issues and our expectations concerning account withdrawals](https://www.gamblingcommission.gov.uk/blog/post/key-issues-and-our-expectations-concerning-account-withdrawals); [Restrictions on withdrawing deposit](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/restrictions-on-withdrawing-deposit-and-deposit-winnings).

Off-licence / Curaçao / crypto: the same KYC packet is routinely demanded only after a win. FinTelegram's Santeda network write-up (treat as investigative allegation, not a court finding) lists "KYC weaponization to delay legitimate payouts," delayed withdrawals, and unexplained account restrictions at cashout across cloned brands. Source: [Santeda International compliance report](https://fintelegram.com/compliance-report-santeda-international-europes-most-sophisticated-illegal-gambling-network/).

### Minimum withdrawal, fee stacking, deposit rollover

GB rule: withdrawal fees, if any, must be disclosed before first deposit and must not exceed **direct processing cost**. Operators may reasonably limit the size/number of partial withdrawals via a fair, transparent term — they may not invent a "wager your deposit 5x first" rollover on player cash. Source: UKGC withdrawal guide, above.

McGarrigle et al. (2026) scoping review of 16 records lists, as documented dark patterns: **minimum balances required to withdraw funds**, unnecessary frictions to close an account, inducements with complex conditions, hidden gambling-management tools, high defaults on stake / deposit / reality-check / deposit-limit settings, and urgency-based prompts. Source: [Dark patterns in online gambling](https://real.mtak.hu/237479/1/2006-article-p99.pdf).

### VIP lock-in

VIP is not a perk. It is a retention desk that fires after a rinse or a heater.

ABC News (4 December 2025) reconstructed Stake chat + deposit data for one player ("Oscar"):

- After an eight-day **$US40,000+ rinse**, a host ("Jelena") welcomed him to VIP and sent a ~$US1,000 bonus: "hope it will help you on your way to full recovery."
- He blew the bonus, chased, hit $US68,000 down in three weeks, unlocked a higher VIP tier, and got another bonus for the "outstanding achievement."
- When he asked to delete the account ("I've lost way more than my budget so I wanna quit"), the host offered a **monthly top-player reload** if he kept the account open one more day, and described a 24-hour cool-off before any exclusion. He waited. He relapsed. Lifetime losses exceeded $US180,000.
- He had already self-excluded from Danish licensed sites. Stake ads followed him anyway; the site would not honour that exclusion.
- Two former employees: "hundreds of similar cases a day" of players asking to be banned were treated as bonus-hunting; one said hosts would not treat harm as real "unless [a player] explicitly said... 'I'm going to kill myself.'"
- In other chats seen by ABC, CEO Ed Craven allowed a permanently self-excluded player to **transfer VIP perks to a new account**.

Robert Heirene (University of Sydney) to ABC, on the "wait for tomorrow's bonus" move:

> "That's a terrible practice. Undoubtedly, it's to make people renege on their original decision."

Source: [One player's case against the world's biggest crypto casino](https://www.abc.net.au/news/2025-12-04/case-against-the-worlds-biggest-crypto-casino-stake-vip-host/105884760) (Julian Fell and Georgina Piper, ABC News).

Stake's on-record reply: staff are "trained to identify gambling harms"; "the claim of 'no real compliance' is categorically false." The chat logs remain the primary evidence.

---

## 3. Session extraction (pace, reload, host)

### Autoplay and turbo

Jonsson, Carlbring, and Lindner (2024): interrupted time-series A/B at a live Swedish licensed casino (ATG). Autoplay enabled on 40 slots vs 40 matched controls.

> "offering an auto-play feature on online casinos likely increases total gambling activity in terms of betted amount (approx.+ 7-9%) and (perhaps) number of spins (approx. +3%) but has no effect on net losses."

Authors note autoplay can increase dissociation, prolong and speed play, and enable parallel play. UKGC already banned autoplay on GB online slots, stating the structural use of autoplay and multi-product play "does not seem compatible with the requirements for operators to keep players safe." Sweden's regulator proposed a similar ban. Swedish survey: autoplay used by **over 80% of daily gamblers**, almost 2x weekly/monthly gamblers.

Source: [Offering an auto-play feature likely increases total gambling activity](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2024.1340104/full) (*Frontiers in Psychiatry*, 2 Feb 2024).

Turbo / instant-spin is the same extraction with a shorter animation. It is the near-miss and chase literature's "faster next spin" delivered as a button.

### One-click / saved-card deposit

Newall (2025): deposit suggested amounts often sit above the player's typical deposit; 30% of audited sites suggested deposits above the minimum; **70% suggested in-game bet sizes greater than the minimum**. Reality checks defaulted to the longest, least-effective delay (**4 hours**) on 60% of sites. Safer-gambling links used low-contrast font on 30% of GB sites; 90% of site search bars did not route "limit" to the limit tool. Crypto-casino safer-gambling pages were worse: 22.5% contained deposit-bonus promotions; 7.5% were unlinked from the site itself.

Same paper: account balance sitting on-site is itself a "tempting invitation to gamble"; promoting easy withdrawal would be the beneficial nudge; operators do the reverse.

Source: Newall 2025, above.

McGarrigle / BIT audits: instant depositing "facilitates loss-chasing." Continuous in-play micro-bets (corners, cards) turn sports into a slot-like loop. Source: McGarrigle et al. 2026.

### Loss-back / reload bait

The Stake case is the cleanest primary: a **make-good / reload** offered at the exact moment the player asked to quit, framed as "alleviate those losses" and gated on keeping the account open. That is loss-back as anti-self-exclusion.

UKGC 2026 incentive rules also stop operators from **increasing** the reward if the player hits the spend target faster — i.e. paying people to grind harder in a shorter window (LCCP 5.1.1: must not "Alter or increase the receipt or the value, or amount of the incentive if the qualifying activity or spend is reached within a shorter time than the whole period"). That clause exists because speed-bonus design is a known tilt accelerant.

### Host chasing after heater or rinse

Stake: VIP trigger was the **rinse**, not a welfare flag. Subsequent bonuses landed on new VIP tiers (more loss = more "achievement"). Heater path in the same story: a later ~$US50,000 win cut the hole in half; he re-deposited most of it. Extraction works both directions: giveback after a heater, reload after a rinse.

UKGC high-value-customer rules (LCCP 5.1.1) require VIP schemes to be consistent with the licensing objectives and with Commission HVC guidance. The Fafabet case shows the opposite pattern: high-velocity spend, weak interaction.

---

## 4. Dark patterns / UX

Newall's three-layer taxonomy (use these terms; they are the academic ones):

| Term | Meaning in this market | Worked example |
| --- | --- | --- |
| **Sludge** | Detrimental friction on the helpful action | Extra clicks to withdraw or close; KYC at cashout; reverse-withdrawal button during a pending period |
| **Dark pattern** | Deceptive UI that steers toward the profitable option | High suggested deposit / bet; 4-hour reality-check default; low-contrast RG links |
| **Dark nudge** | Any design that makes the player worse off, including bias exploits | "When the FUN stops, stop"; RTP framed as 90% return not 10% house edge; past-outcome tickers that feed the gambler's fallacy |

Source: Newall 2025.

McGarrigle et al. (2026) map the same set onto a transdisciplinary dark-pattern framework and flag that **behavioural-impact evidence is thin** because operators will not share proprietary data. That is a limit on this brief, not a reason to ignore the mechanics.

### Near-miss (engineered "almost")

Palmer, Ferrari, and Clark (2024), preregistered online three-reel slot simulations:

- Near-misses **increased motivation to continue** vs full-misses.
- Players **spun faster** after a near-miss than after a full-miss.
- Players **raised the next bet** after a near-miss vs a full-miss.

> "modern gambling products have the capacity to alter and engineer the delivery of near-misses."
>
> "this series of replications indicates that near-miss outcomes in slot machine gambling influence a range of gambling behaviors relevant to harm reduction policy."

Source: [The Near-Miss Effect in Online Slot Machine Gambling](https://psycnet.apa.org/fulltext/2024-81139-001.pdf) (*Psychology of Addictive Behaviors*, 2024). https://doi.org/10.1037/adb0000999

Multi-line slots celebrating a net loss ("losses disguised as wins") sit in the same structural-characteristics family (Newall citing Dixon et al.). Infinite-scroll / lobby grids keep the next game one flick away; the academic literature names the **continuous, mobile, always-on** format more than the specific "infinite scroll" phrase. Treat lobby density as the same class of sludge-removal on "start another game."

### Fake social proof, countdown FOMO, high defaults

Documented in the scoping review and BIT behavioural-risk audits: urgency-based gambling prompts; high default stakes / deposits / limits; "nagging" and intermediate-currency framing (European Commission mystery shop, 2022, in McGarrigle Table 1). Newall: complex representative soccer accumulators in ads (conjunction fallacy + illusion of control); roulette "last 100 spins" tickers that do not change the odds.

Independent testing of the industry slogan "when the FUN stops, stop" found it "does not reduce contemporaneous levels of gambling and may actually lead to people gambling slightly more than if no message is shown at all" (Newall 2025, citing [66]).

### Geo-spoof onboarding and license-washing

**License-washing:** a Curaçao (or sublicence) badge presented as if it were UKGC / MGA / a national licence. It is a payment-and-provider passport, not a player-protection regime.

Follow the Money + #CasinoPapers (Delasport leak):

- Letterbox companies in **Curaçao and Malta** operated dozens to hundreds of sites targeting Germany, Austria, Sweden, Italy, Finland, Denmark — markets where those brands were not authorised.
- Internal instruction: geo-block **the Netherlands and the United States** (jurisdictions that can pressure Curaçao), while continuing to take the rest of the EU. That is selective geo-block, not compliance.
- CGA leak (Lilith Wittmann): licences granted even when applicants withheld key information or were suspected of targeting unauthorised countries. Regulator line: distinguishing "actively targeting" from "merely accepting customers" is "complex"; guiding principle was not to "immediately refuse a licence."
- 2024 LOK reform put operators under a government regulator for the first time. FTM: sites are still blacklisted in Europe; owners still hide behind trust-office letterboxes.

Sources:

- [Authorities struggle to shut illegal gambling sites that target European players](https://www.ftm.eu/articles/illegal-gambling-sites-target-european-users) (Follow the Money)
- [Curaçao’s secretive gambling industry exposed in leak](https://www.ftm.eu/articles/curacao-secretive-gambling-industry-exposed-in-leak) (Follow the Money)
- [#CasinoPapers: International software provider operates gambling websites through Malta shell company](https://theshiftnews.com/2025/01/07/casinopapers-international-software-provider-operates-gambling-websites-through-malta-shell-company/) (The Shift)

**Geo-spoof onboarding:** player uses a VPN; site accepts the signup (or only blocks NL/US). Combined with a Curaçao sticker, the player is told they are "licensed and safe." They are in a jurisdiction with weak cashout enforcement and no GAMSTOP. The Stake/ABC case is the consumer-side pair: Danish self-exclusion did not travel; ads still found him.

---

## 5. How this stack interacts with tilt

Tilt is speed + chase + "I'm due." The product is built for that state.

**Faster spin after a near-miss or a loss.** Palmer et al.: near-miss shortens spin latency and raises the next stake. Zhang, Rights, Deng, Lesch, and Clark (2024), PlayNow.com eCasino (BCLC), bet-by-bet:

> "gamblers bet more and played longer sessions after immediate losses, but they bet less and played shorter sessions when losing cumulatively."
>
> "For wins, gamblers bet more after both immediate and cumulative wins, but they also played shorter sessions."

Source: [Within-session chasing of losses and wins in an online eCasino](https://www.nature.com/articles/s41598-024-70738-3) (*Scientific Reports*, 2 Sept 2024).

Read: the dangerous window is the **last spin**, not the session P&L. Immediate loss = bigger bet + stay. Immediate win = bigger bet (giveback) but a higher chance of walking. Product response: autoplay/turbo to skip the walk; loss-back / host ping to kill the walk; pending-withdrawal cancel button to recycle the cash that was about to leave.

Auer and Griffiths (cited in Zhang et al.): among putative chase markers, **frequent deposits inside a single session** best predicted high-risk classification. That is the one-click / saved-card deposit doing its job.

**Chase after losses (rinse).** Bonus play-through and 50x-class wagering "lead them to gamble for longer, and faster" (UKGC). Sticky pot + max-bet clause + game weighting keep the player in slots. VIP host lands after the bloodbath with a reload that reframes the hole as a "tier achievement." KYC-at-cashout never triggers because there is nothing to withdraw.

**Giveback after wins (heater).** Same host, same reload calendar, same reverse-withdrawal button. Zhang: players raise stake after wins. Newall: money left in the wallet is the next session. Stake/Oscar: a $US50k heater was mostly re-deposited. Discretionary "bonus abuse" clauses are the clawback if the heater happened on a forbidden game, stake, or IP.

**Cross-product funnel.** Mixed betting+slots bonuses (now banned in GB, live elsewhere) move a sports loser into the faster product. Autoplay and near-miss then take the session.

**Grey vs GB.** Almost every sludge item above is restricted or banned for UKGC licensees (reverse-withdrawal, sticky mix, 10x cap, listed play restrictions, KYC-before-play, autoplay on slots, VIP duty of care). The extraction stack is therefore **the default off-licence / Curaçao / crypto path**, which is also the path Discord-native and VPN players actually use. License-washing is how that path is sold as "regulated."

---

## Source list (primary)

| Kind | Item | URL |
| --- | --- | --- |
| Regulator | UKGC — withdraw deposit / no sticky mix | https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/restrictions-on-withdrawing-deposit-and-deposit-winnings |
| Regulator | UKGC — withdrawal delays blog | https://www.gamblingcommission.gov.uk/blog/post/key-issues-and-our-expectations-concerning-account-withdrawals |
| Regulator | UKGC — 10x wagering + mixed-product ban (19 Jan 2026) | https://www.gamblingcommission.gov.uk/news/article/gambling-promotions-to-be-safer-and-simpler |
| Regulator | UKGC — promotional play restrictions / no sole-discretion abuse | https://www.gamblingcommission.gov.uk/authorities/codes-of-practice/guide/page/promotional-play-restrictions |
| Regulator | UKGC — game weighting example | https://www.gamblingcommission.gov.uk/standards/bingo-and-casino-technical-requirements/proposal-1-ban-or-limit-the-use-of-wagering-requirements |
| Regulator | LCCP 5.1.1 Rewards and bonuses | https://gamblingcommission.gov.uk/licensees-and-businesses/lccp/condition/5-1-1-sr-code |
| Enforcement | Taichi Tech / Fafabet £170k (discretionary forfeit) | https://www.gamblingcommission.gov.uk/news/article/taichi-tech-limited-fined-gbp170-000-for-unfair-terms-and-conditions |
| Regulator + CMA | 2018 joint bonus / withdrawal programme | https://www.gamblingcommission.gov.uk/licensees-and-businesses/page/joint-cma-and-gambling-commission-letter-to-the-gambling-sector |
| Academic | Newall 2025 — sludge / dark patterns / dark nudges | https://doi.org/10.1111/add.70085 |
| Academic | McGarrigle et al. 2026 — dark-pattern scoping review | https://real.mtak.hu/237479/1/2006-article-p99.pdf |
| Academic | Jonsson et al. 2024 — autoplay +7–9% bets | https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2024.1340104/full |
| Academic | Palmer, Ferrari, Clark 2024 — near-miss: faster spin, bigger bet | https://doi.org/10.1037/adb0000999 |
| Academic | Zhang et al. 2024 — within-session chase after immediate loss/win | https://www.nature.com/articles/s41598-024-70738-3 |
| Investigative | ABC — Stake VIP host after a rinse | https://www.abc.net.au/news/2025-12-04/case-against-the-worlds-biggest-crypto-casino-stake-vip-host/105884760 |
| Investigative | FTM — illegal sites targeting EU via Curaçao/Malta | https://www.ftm.eu/articles/illegal-gambling-sites-target-european-users |
| Investigative | FTM — Curaçao CGA leak | https://www.ftm.eu/articles/curacao-secretive-gambling-industry-exposed-in-leak |
| Investigative | The Shift — #CasinoPapers / Delasport | https://theshiftnews.com/2025/01/07/casinopapers-international-software-provider-operates-gambling-websites-through-malta-shell-company/ |

### Limits

- Most dark-pattern audits are UK/Australia. Grey-market UX is less measured and, from the crypto-casino safer-gambling audits, worse.
- Causal evidence is strong for autoplay volume, near-miss next-spin behaviour, and within-session chase. It is weaker for countdown timers and fake live-player counts specifically (those appear in industry UX and recovery write-ups more than in RCTs).
- FinTelegram / WGO pieces were used only as colour on mechanics already named by UKGC or ABC; they are not treated as findings of fact.
