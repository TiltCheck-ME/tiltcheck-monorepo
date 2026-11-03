<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 -->

# Player-defense stack: what exists, what it misses, TiltCheck fit

Research date: 2026-10-13. Scope: what current player-defense tools actually do, the gaps they leave for crypto / Curaçao / Discord-native play, and where a player-side tool like TiltCheck (non-custodial Chrome extension + on-chain cooldown + trust scores + bonus intel) is uniquely positioned — versus what it should not pretend to do.

Method: web search plus primary-source fetches. This is a fit brief, not a product spec and not implementation guidance.

---

## 1. GAMSTOP (UK multi-operator self-exclusion)

**What it actually does.** GAMSTOP is a free national register for UK residents (Great Britain and Northern Ireland). After identity verification, the person is added to a shared register. Licensed Great Britain operators must check that register on login and registration and refuse the person. Official copy:

> "Gamstop Online is a free tool that enables people who live in the UK (Great Britain and Northern Ireland) to exclude themselves from all licensed gambling websites and apps."
> — GAMSTOP help centre, updated 2 April 2026. https://info.gamstop.co.uk/hc/en-gb/articles/4404984025106-What-is-Gamstop-Online

> "Gamstop Online blocks you from signing up for or using online accounts with gambling companies licensed in Great Britain."
> — https://www.gamstop.co.uk/about

Periods: six months, one year, five years, or five years with auto-renewal. The exclusion stays on after the chosen period unless the person contacts GAMSTOP to remove it. Since 31 March 2020, participation has been a UKGC licence condition (social responsibility code 3.5.5). A UK-licensed operator that lets a GAMSTOP-registered person gamble is breaking a rule it agreed to keep. The Commission has already suspended licences for failure to integrate (Dynamic / Prophet and Sportito, April 2020).

**Who can reverse it.** The player cannot cancel during the minimum period. After expiry, deactivation is an explicit request (GAMSTOP documents an automated chat for this). GAMSTOP itself does not send reminder texts or mail.

**What it blocks.** Account open + login at UKGC-licensed online operators and apps. Separate product: Gamstop Betting Shops for high-street bookmakers. It does not block the browser, the payment rail, or the search results that advertise a way around it.

**What it misses.**

- Any operator without a UK licence: Curaçao, Anjouan, many Malta-licensed brands that do not hold a GB remote licence, and the entire "not on GamStop" affiliate layer.
- Crypto casinos that settle in USDT / ETH / SOL and never touch a UKGC check.
- Mirrors, white-label skins, and new domains spun up faster than any register.
- Telegram bots, Discord rakes, P2P tables, and skin / crash sites that are not "gambling websites and apps run by [UK-licensed] companies."
- Land-based play outside the Betting Shops product.

Guardian reporting (17 Dec 2025) documented the search-term economy around "Not on GamStop" / "Non GamStop casinos" as a direct exploit of people who already self-excluded. https://www.theguardian.com/society/2025/dec/17/offshore-bookies-gamblers-uk-self-exclusion-scheme-gamstop

Plain statement of the legal boundary:

> "The scheme has no power over a casino licensed somewhere else, for example in Curaçao, Anjouan, or Malta, that holds no UK licence. There is no technical link between GamStop and that operator’s systems, no legal obligation on it to check the GamStop register."
> — Clinton & Co, 30 June 2026. https://www.clintonandco.co.uk/articles/gamstop-offshore-casinos-why-slip-through

GAMSTOP's own about page tells people to layer bank blocks and device blocking software. That is an admission, not a footnote: the register is necessary and not sufficient.

---

## 2. State self-exclusion lists (US example: Iowa)

**What it actually does.** There is no US national list. Gambling is state-regulated, so each state (and often each product class inside a state) runs its own scheme. Tribal casinos are usually outside the state list. Signing one state does not block the next; signing casinos does not always block sports or lottery in the same state.

Iowa is a clean example because the statute and the commission page are specific. Iowa Code 99D.7(23) and 99F.4(22). The Iowa Racing and Gaming Commission (IRGC) runs a voluntary program covering state-licensed casinos, racetracks, sports wagering, and fantasy sports. Licensees must drop the person from marketing lists and deactivate player-club / online sports and fantasy accounts. A self-excluded person may not enter gaming areas. If found: removal, possible criminal trespass, forfeiture of winnings (to the Iowa General Fund). Enrollment can take up to two weeks to propagate to all licensees.

https://irgc.iowa.gov/self-exclusion-program/program-overview
https://irgc.iowa.gov/self-exclusion-program/frequently-asked-questions

**Who can reverse it.** Iowa terms are five years or life. Five-year terms auto-end; they cannot be shortened. Lifetime terms signed on or after 1 July 2017 cannot be ended. Older lifetime enrollments (on or before 30 June 2017) can request revocation (up to 10 business days at IRGC, then up to 7 calendar days for licensees). The person cannot enroll a family member. Facilities can also keep their own house bans after a statewide term ends.

**What it blocks.** Physical gaming floors and wagering with Iowa-licensed operators, including online sports and fantasy once those products exist. Identity is shared with licensees, not the public.

**What it misses.**

- Every other state's casinos, sportsbooks, and iGaming, unless that state has its own list and the person enrolled there too.
- Tribal properties not bound by the IRGC list.
- Curaçao / crypto / sweepstakes / social-casino sites that never held an Iowa licence.
- Discord / Telegram rakes, P2P, and skin betting.
- A two-week enforcement lag after enrollment.
- The person who simply drives to Illinois or opens Stake in a browser.

Secondary synthesis of the national picture (not a regulator page, but consistent with how the programs are built): "There is no national self-exclusion list in the United States... Tribal casinos are regulated by tribes, not states, so a state list usually does not cover them." https://doctor-gambling.net/self-exclusion/us-self-exclusion-guide/

---

## 3. Gamban / BetBlocker / similar site blockers

**What they actually do.** Device- or network-level blocklists. They are not a regulator register and they are not account closure. They try to stop the browser / app / DNS path from loading a gambling destination. Coverage is "sites and apps in our database," not "every place a human can wager."

**BetBlocker** (charity, free, no registration, founded 2017 by ThePOGG ADR, later spun out). Claims 1.1M+ sites and 3.1k+ apps. Restriction periods from 1 day to 5 years. Once a Gambling Self-Restriction starts, support will not lift it early. Periods of 2 months and longer stay on after expiry until the user explicitly deactivates, then a 7-day cooling-off (Malta-style) before the lift. Custom URLs can be added on local (non-VPN) installs and cannot be removed during the restriction. Official FAQ:

> "National self-exclusion schemes like Gamstop and Spelpaus ... only extend as far as gambling sites that are licensed in that country. With hundreds, if not thousands, of rogue gambling operators accepting players without a license that will not be covered ... BetBlocker does not base its restriction on any individual countries licensees."
> — https://betblocker.org/

**Gamban** (paid, multi-device licence, 7-day trial). Markets "tens of thousands of gambling websites and apps worldwide" across sports, casinos, poker, bingo, lotteries, social casinos, crypto gambling, affiliates, and some trading-style products. It does not claim to block gambling ads, investment sites, sports-info pages, adult content, or loot boxes. It is a first layer; the product itself tells users to add other exclusion layers. https://gamban.com/

GuardingGamblers comparison (useful as a non-vendor frame): a blocker "can add friction between you and gambling websites or apps. It is not the same as closing an account, setting a temporary timeout, or joining an operator or regulator self-exclusion program." https://www.guardinggamblers.com/resources/gambling-blocker-comparison

**Who can reverse it.** Product rules, not statute. BetBlocker: nobody, including support, until the selected term ends (then cooling-off for longer terms). Gamban: paid subscription / device uninstall / period settings per their current terms. A determined user can still use another device, a fresh OS, a friend's phone, or a browser the agent does not hook.

**What they miss (especially crypto / Curaçao / Discord-native).**

- New mirrors and white-labels that are not yet on the weekly list.
- Telegram Mini Apps, Discord embedded browsers, WhatsApp in-app browsers, and invite-only rake links that never resolve as a "casino domain."
- On-chain casinos / dApps that are a frontend + wallet connect, not a classic merchant site.
- Wallet extensions (MetaMask, Phantom) that make the dApp useful even if one frontend domain is blocked.
- The second laptop, the work PC, the phone that never got the agent installed.
- Payment. A blocked site on this Chrome profile does not stop a card deposit from another device.

OFFBET and Bet Breaker are in the same class: larger or more crypto-aware lists, custom blocks, some messaging-app coverage. They still live or die by install surface and list freshness. https://offbet.app/products/essential/ and https://betbreaker.app/block-crypto-casinos/

---

## 4. Bank / card gambling merchant blocks

**What they actually do.** A card-issuer check against Merchant Category Codes at authorization time. If the MCC is a gambling code (most commonly 7995; also 7800 / 7801 / 7802) and the customer has the block on, the issuer declines. University of Bristol / Personal Finance Research Centre documented the mechanism and the early UK rollout (Barclays, HSBC, Lloyds group, RBS/NatWest, Santander, Cashplus, Monzo, Starling). https://www.bristol.ac.uk/media-library/sites/geography/pfrc/A%20Blueprint%20for%20Bank%20Card%20Gambling%20Blockers%20-%20Report.pdf

Monzo's own page is the cleanest current issuer statement:

> "When you turn the block on, we'll automatically block card payments to any companies using this gambling code. Unfortunately, sometimes transactions aren't tagged with the correct information, meaning these transactions bypass any blocks, and if this happens you'll still be charged."
> — https://monzo.com/gambling-block

Monzo: customer-set cooldown from 2 days to 1 year before the block can be lifted; if the customer has already talked to support about gambling, lift goes through a human conversation. Monzo says ~700,000 customers have used the feature and ~90% of UK banks now offer some version.

**Who can reverse it.** The account holder, after the cooldown they chose. Another card, another bank, a fintech, cash, or crypto is not bound by that cooldown.

**What it misses.**

- Overseas / crypto-facing merchants that file under a non-gambling MCC. UK law requires domestic gambling firms to use the correct MCC; it does not bind a Curaçao or crypto cashier. Financial Ombudsman Service decisions have already said this out loud: Monzo DRN-5450288 (overseas firms using e.g. "Digital Goods: gaming"); Lloyds DRN-5111124 (wrong MCC, block did not fire, customer was warned). https://www.financial-ombudsman.org.uk/decision/DRN-5450288.pdf and https://www.financial-ombudsman.org.uk/decision/DRN-5111124.pdf
- Open Banking / pay-by-bank that never hits the card MCC path (Barclays DRN-4649878). https://www.financial-ombudsman.org.uk/decision/DRN-4649878.pdf
- Crypto on-ramps, on-chain transfers, gift cards, cash, another person's card, e-wallets, and "agent" / P2P cashers used by Discord rakes.
- The site itself. A declined Visa does not stop a USDT deposit on Stake.

A bank block is a payment-friction tool on one rail. It is not self-exclusion and it is not a site block.

---

## 5. GambleAware / NCPG / 1-800-GAMBLER (support, not enforcement)

These orgs do not block a site, a wallet, or a Discord server. They inform, refer, and (in GambleAware's case) commission treatment.

**GambleAware (Great Britain).** Independent charity and strategic commissioner. Public-health posture: education, prevention, early intervention, treatment. Commissions the National Gambling Support Network and the National Gambling Helpline (~55,000 calls and chats a year in recent NGSN stats). Offers self-assessment, spend calculator, service finder, and signposts to blocking / self-exclusion tools. Support services are for GB residents. It is accountable to the Charity Commission, not a licensing authority. It cannot close a Curaçao account or decline a card.

https://www.gambleaware.org/
https://www.gambleaware.org/media/krojmzxb/gambleaware-annual-statistics-from-the-ngsn-2024-25.pdf

GAMSTOP's about page separately points to the National Gambling Helpline on 0808 802 0133.

**NCPG (United States).** National Council on Problem Gambling. Advocacy, education, research, awareness campaigns. Explicitly: "We do not take a position for or against legalized gambling. We advocate solely for those affected by problem gambling." https://www.ncpgambling.org/about-us/mission/

**National Problem Gambling Helpline.** Current published number is **1-800-MY-RESET** (1-800-697-3738), 24/7/365 call / text / chat, routed by area code to a network covering all 50 states and US territories. Trained specialists; referrals to counseling, peer support, financial counseling, and "guidance on how to self-exclude from gambling establishments or online gambling sites, if available in your area." Not a crisis/911 line (use 911 or 988). Confidential; no payment required; no geolocation. https://www.ncpgambling.org/help-treatment/about-the-national-problem-gambling-helpline/

**1-800-GAMBLER / 1-800-522-4700.** This is the legacy NCPG helpline brand still printed on older operator RG pages, some state materials, and some blocker apps (e.g. Anti-Gambling Shield still lists 1-800-522-4700). Functionally the same class of service: support and referral, not a kill-switch. Treat current official routing as 1-800-MY-RESET and treat 1-800-GAMBLER as the number people still search for.

**What they miss.** Everything that requires enforcement. No operator duty. No register. No MCC. No Discord ban. No on-chain lock. A person in a Curaçao crash lobby at 3 a.m. can call them. The call does not close the lobby.

---

## 6. Browser-extension and on-chain experiments besides TiltCheck

The gap these tools are aiming at is the same gap GAMSTOP / state lists leave: crypto-native and unlicensed fronts. None of the products below combine a player-signed on-chain cooldown, a live casino trust score, and bonus intel. Most are blocklists with extra friction.

**Anti-Gambling Shield (Chrome Web Store).** Local blocklist extension. Strict mode fails the navigation at the network level; soft mode is a warning overlay. Custom allow/block. Weekly public list fetch. Zero telemetry claim. Categories include crypto gambling. The user can disable the extension in one Chrome settings click. No identity, no operator register, no wallet lock. https://chromewebstore.google.com/detail/anti-gambling-shield/mfaicdkmbihjmpanlhemjeppecdmflen

**GAMBLOCK (open-source Windows, gamblock.xyz / github.com/Xipezyy/GAMBLOCK).** Hosts-file + local DNS + local HTTPS interstitial. Ships a hard-coded list of ~31 crypto casinos (Stake, Rollbit, Roobet, Shuffle, BC.Game, etc.) plus all subdomains. Unlock requires typing 100 generated passwords with no paste. VPN browser extensions are disabled while active; full VPN apps still work. This is commitment-device software, not a protocol. It does not travel with a wallet, does not score operators, and does not see Discord.

**OFFBET Essential.** Device agent, 590k+ bundled list, weekly refresh, anti-bypass (VPN / custom DNS / DoH / Opera / Tor). Custom blocks include messaging apps "that smuggle gambling through their embedded browsers (WhatsApp, Telegram, Discord)." Closest product to admitting the Discord/Telegram hole. Still device-bound. Still not on-chain. https://offbet.app/products/essential/

**Bet Breaker.** Crypto-aware commercial blocker; custom domains; advice to also block crypto-gambling subreddits / Telegram / Discord and to remove wallet extensions because "decentralized casino dApps require a wallet extension like MetaMask to function." Correct diagnosis. The product is still a list plus hygiene advice, not a signed cooldown. https://betbreaker.app/block-crypto-casinos/

**Operator-side RG on crypto brands.** Stake, Roobet, and peers ship timeouts and self-exclusion in their own account settings. Those tools die at that brand's skin. They do not follow the player to the next Curaçao mirror, and the same company can keep a second brand live.

**On-chain self-exclusion besides TiltCheck.** Public search did not surface a shipped, player-held, casino-agnostic on-chain exclusion that operators actually honor. Academic "blockchain self-exclusion" papers and one-off responsible-gambling contracts exist as experiments; they are not a player product with distribution. Wallet-level "spend lock" features (exchange withdrawal locks, some self-custody timelocks) can add friction to funding but are not gambling-specific and are not read by casinos. TiltCheck's existing cooldown (player-signed Solana lock, no cancel in v1, extend-only; casinos do not read it unless they choose to) is the only product-shaped instance in this research set.

---

## 7. Gap map: where the stack fails for crypto, Curaçao, and Discord-native play

| Layer | Binds | Reversible by | Structural miss |
| :--- | :--- | :--- | :--- |
| GAMSTOP | UKGC-licensed online accounts | Player, only after min term + explicit deactivate | Curaçao, crypto, mirrors, Discord/Telegram, payments |
| US state list (Iowa) | That state's licensees + floors | Player cannot shorten 5yr; lifetime post-2017 is permanent | Other states, tribal, unlicensed web, crypto, chat rakes |
| Gamban / BetBlocker / OFFBET | Installed devices + known domains/apps | Product rules; other devices always available | New mirrors, in-app browsers, dApps, wallets, unpaid rails |
| Bank MCC block | That card, when MCC is honest | Player after cooldown; other rails immediately | Wrong MCC, Open Banking, crypto, cash, P2P |
| GambleAware / NCPG / 1-800-GAMBLER | Nobody. Advice and referral. | n/a | All enforcement surfaces |
| Chrome list extensions / GAMBLOCK | One browser or one Windows hosts file | Disable extension / type passwords / use another box | Discord, Telegram, second device, on-chain play |
| Operator RG on a crypto brand | That brand's account | Operator policy | Every other skin the same group, or the next site |

Shared failure mode: every mature tool is **jurisdiction-bound, merchant-code-bound, or domain-list-bound**. Crypto casinos, Curaçao white-labels, and Discord/Telegram rakes are built to sit outside those three bindings. Affiliate SEO ("casinos not on GamStop") industrially routes excluded people into the gap.

A second shared failure: **reversal lives with the person who is tilting**, except for Iowa lifetime and GAMSTOP-during-term. Device blockers can be uninstalled on a new machine. Bank blocks can be walked around with USDT. Support lines can only talk.

A third shared failure: **none of these tools tell you whether the next site is a skem** (licence-washing, fake RTP, withdrawal stall, bonus trap). They either block a name or they do not. They do not score the operator or timestamp the bonus.

---

## 8. What TiltCheck is uniquely positioned to fill

Grounded in what TiltCheck already ships (see `research_plan.md`): player-signed on-chain cooldown; Chrome Core 2s spin lock on supported tabs; Pro Touch Grass overlay; Trust Engine / casino directory; CollectClock bonus intel; Discord `/touchgrass` lockout and buddy alerts. Honesty rule already on file: no custody, no passwords, no medical / diagnostic / regulator-endorsement claims.

**Fill these. They are empty or thin in the incumbent stack.**

1. **Player-side friction at the tab where crypto / Curaçao / grey play actually happens.** GAMSTOP and Iowa never see that tab. A Chrome extension that can pause a spin, overlay a cooldown, and keep working as guest does not need the operator to be UKGC-licensed or Iowa-licensed. That is the surface blockers try to cover with a domain list; TiltCheck can cover it with behavior on a supported lobby, not only with a hostname match.

2. **A cooldown the player cannot talk a support agent out of, that is not a bank MCC and not a UK register.** On-chain, player-signed, extend-only, no cancel in v1. Casinos do not have to honor it for it to still lock *the player's own* committed funds / session promise. GAMBLOCK's 100 passwords are theater on one Windows box. A signed lock travels with the keypair.

3. **Operator intelligence the blocklists do not have.** Trust scores, payout evidence, compliance notes, source-dated bonus intel. The "not on GamStop" funnel is an information attack as much as an access attack. A player who already blew through GAMSTOP needs to know the next site is Curaçao, the bonus is sticky, and the withdrawal record is cooked — before they deposit. Gamban will not say that. NCPG will not say that. Iowa will not say that.

4. **Discord-native lockouts and buddy accountability**, which is where a large share of crypto rake and skin action is coordinated. OFFBET can block the Discord *app*. It cannot run `/touchgrass` inside the server the rake lives in. That is a different product.

5. **Honesty about jurisdiction.** TiltCheck can say, in product copy, that GAMSTOP / Iowa / MCC blocks do not follow you offshore, and then offer a tool that does not pretend to be those schemes. That is a positioning gap, not just a feature gap.

**Map to existing surfaces (no new build implied).**

- Extension / Core / Pro overlay: urgency and in-tab friction on supported casinos, including ones no register covers.
- On-chain cooldown: player-held commitment the bank and the UK register cannot provide.
- Trust Engine + bonus intel: pre-deposit "is this a skem" layer none of the incumbents own.
- Discord bot: the chat-native hole site blockers only address by killing the whole app.
- Web explainers: tell the player what GAMSTOP / Gamban / bank blocks actually do, so TiltCheck is not sold as a replacement for them.

---

## 9. What TiltCheck should not pretend to do

These are the claims that would make TiltCheck a liar, a custodian, or an unlicensed operator. Do not ship copy, UI, or partner decks that blur them.

- **Not a national or state self-exclusion scheme.** TiltCheck is not GAMSTOP, not Iowa IRGC, not BetStop. Casinos are not legally required to read a TiltCheck cooldown. Saying "you're excluded" when only TiltCheck's own surfaces are locked is cap.

- **Not a substitute for licensed-operator duty of care.** UKGC 3.5.5, Iowa trespass/forfeiture, affordability checks, and ADR sit with the licensee. A Chrome pause does not create those duties and does not restore them on a Curaçao site.

- **Not a payment block and not a bank.** MCC declines, Open Banking blocks, and card cooldown are issuer products. TiltCheck does not see Visa authorization and should not claim "we stopped your deposit" unless a specific, honest rail is actually stopped.

- **Not a complete site/app blocker.** Gamban / BetBlocker / OFFBET / GAMBLOCK own the "fail the DNS" job. TiltCheck's extension is supported-tab behavior plus optional overlay, not a 1.1M-domain hosts file. New mirrors, Telegram Mini Apps, and wallets will leak. Say so.

- **Not treatment, diagnosis, or a crisis line.** GambleAware, NCPG, 1-800-MY-RESET / 1-800-GAMBLER, GamCare 0808 802 0133. TiltCheck can deep-link. It cannot counsel, assess PGSI as a clinical act, or claim medical efficacy.

- **Not custody, not a cashier, not RGaaS-as-player-wallet.** Instant Redeem / RGaaS are partner rails. Player funds stay on the player's keypair or at the casino. A cooldown that TiltCheck can unilaterally seize would break the honesty rule.

- **Not a regulator endorsement and not "licensed protection."** No UKGC / NCPG / IRGC badge in the marketing sense. Trust scores are advisory. Bonus intel is source-dated, not a guarantee the promo will pay.

- **Not a guarantee the player cannot gamble.** Second device, cash, a friend's account, an unspecialized dApp, a Discord DM with a rake link: all still work. TiltCheck adds friction and information on surfaces it actually sits on. That is the product. "We lock you out of gambling" is GAMSTOP-shaped language TiltCheck has not earned.

---

## 10. Sources

Primary

- https://www.gamstop.co.uk/about
- https://info.gamstop.co.uk/hc/en-gb/articles/4404984025106-What-is-Gamstop-Online
- https://www.about.gamstop.co.uk/privacy-policy
- https://irgc.iowa.gov/self-exclusion-program/program-overview
- https://irgc.iowa.gov/self-exclusion-program/frequently-asked-questions
- https://betblocker.org/
- https://gamban.com/
- https://monzo.com/gambling-block
- https://www.bristol.ac.uk/media-library/sites/geography/pfrc/A%20Blueprint%20for%20Bank%20Card%20Gambling%20Blockers%20-%20Report.pdf
- https://www.financial-ombudsman.org.uk/decision/DRN-5450288.pdf
- https://www.financial-ombudsman.org.uk/decision/DRN-5111124.pdf
- https://www.financial-ombudsman.org.uk/decision/DRN-4649878.pdf
- https://www.gambleaware.org/
- https://www.gambleaware.org/media/krojmzxb/gambleaware-annual-statistics-from-the-ngsn-2024-25.pdf
- https://www.ncpgambling.org/about-us/mission/
- https://www.ncpgambling.org/help-treatment/about-the-national-problem-gambling-helpline/

Secondary / product

- https://www.theguardian.com/society/2025/dec/17/offshore-bookies-gamblers-uk-self-exclusion-scheme-gamstop
- https://www.clintonandco.co.uk/articles/gamstop-offshore-casinos-why-slip-through
- https://www.guardinggamblers.com/resources/gambling-blocker-comparison
- https://doctor-gambling.net/self-exclusion/us-self-exclusion-guide/
- https://chromewebstore.google.com/detail/anti-gambling-shield/mfaicdkmbihjmpanlhemjeppecdmflen
- https://gamblock.xyz/
- https://github.com/Xipezyy/GAMBLOCK
- https://offbet.app/products/essential/
- https://betbreaker.app/block-crypto-casinos/

Internal context (not re-researched): `research_gambling_player_defense/research_plan.md`
