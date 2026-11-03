<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29 -->

# Findings: auto-vault / Stake vault

Research date: 2026-10-29. Five WebSearch queries total across this file and `findings_casino-social.md`. Primary pages fetched for quotes.

## How Stake.us explains the vault

Official Stake.us copy is a bank metaphor, not a tilt brake. They never say "so you do not instantly rebet." They say store, separate, inactive, cannot play.

> "Vault is a feature that works as a bank - you can store your Stake Cash and Gold Coins there and separate them from the tokens you wish to play with or if you want to save them for later usage. It is an inactive part of your balance and for as long as the tokes are in your Vault, they cannot be used for playing."
>
> "In order to navigate your Vault and store tokens there, go to Account icon > Vault > Store, choose the tokens you wish to move there and input the amount."
>
> "If you already have tokens in your Vault, but you wish to move them back to your balance, go to Account icon > Vault > Retrieve and fill in the blank fields."
>
> "The purpose of the Vault is to provide a safe and convenient place to store your coins."
>
> "Any access to the vault will require confirmation of the security measures opted on your account, i.e. password, verified email, 2FA, etc."
>
> "Coins can stay in your vault for as long as you would like, so there's no limitation in that way."
>
> Source: https://help.stake.us/en/articles/6796294-storing-your-sc-and-gc-in-vault

The friction that actually stops instant rebet is incidental: vaulted coins are unplayable, and retrieve requires password / email / 2FA. The house frames that as security, not self-control.

## How Stake.com explains the vault

International Stake sells vault as custody-lite, not as a session brake. Blockchain fees and "secure storage" are the pitch. Play-prevention is not named.

> "The “ Vault" is a secured storage solution for your funds on Stake. It provides a safe and convenient place to store your funds."
>
> "It’s located in the main user menu under [Account > Vault]."
>
> Purpose:
> "The Vault eliminates the need to worry about transaction fees and blockchain delays."
> "It offers a secure and convenient place to store your funds."
>
> "Access to the Vault requires confirmation through various security measures opted into on your account."
> "These measures include password, verified email, and 2-Factor Authentication, ensuring the highest level of security."
>
> "Funds stored in your Vault can remain there indefinitely."
>
> Source: https://help.stake.com/en/articles/5222711-securing-your-funds-using-the-vault

Gap vs player intent: official docs do not mention auto-move, skim-the-win, heater lock, or "stop yourself from betting it back." Manual Store / Retrieve only.

## Players already named the missing job

The auto-vault ask is old, public, and explicit. Players want the house to skim wins so they cannot instantly rebet. Stake has not shipped it.

Stake Forum, August 2021:

> "There should be an option to automatically put any coins you receive in your vault. If you receive a deposit, tips, bonus or reloads in your account, you should have an option to choose if you would like them to automatically be transferred into your vault."
>
> Reply: "i would love it if you could do this with wins while you are afk auto-betting on some 98% dice or something"
>
> Counter: "Interesting idea, but honestly after awhile I feel like it would get annoying since u would have to constantly withdraw from vault."
>
> Source: https://stakecommunity.com/topic/44922-option-to-automatically-have-received-coins-put-in-vault/

r/stakeus, May 2024, title "Auto Vault":

> "Does anyone know of a way to automatically move winnings to vault? For example, every net gain of $X, put $X in vault."
> "I know they don't want something like this, but I am wondering if anyone here has a workaround."
>
> Community: "Nah there is no option just do it yourself" / "That would be nice but I don't think Stake will make it auto. Just vault it yourself." / "That would be interesting but its not hard to vault if you can control yourself."
> Workaround named: "You have to use an outside software called qbot..."
>
> Source: https://www.reddit.com/r/stakeus/comments/1cs741d/auto_vault/

Official language = bank. Player language = stop me from rinsing the heater. The house will not close that gap. Third parties did.

## Third-party auto-vault scripts (public pages)

These exist. They are userscripts / Tampermonkey overlays on Stake, not a first-party setting. Public pages:

### 1. rubyatmidnight/stakeautovaulter (GitHub)

https://github.com/rubyatmidnight/stakeautovaulter

README (updated 1/6/2026):

> "A tool to automatically vault profits while playing games on Stake, using Tampermonkey."
>
> "Does not require an api key, an account token, or account access, or 2fa access"
>
> "Open Stake.us or Stake.com"
>
> "Works on Stake.us, Stake.com, and all mirror sites"
>
> "Works for all crypto, sc, and gc"
>
> "Save %: in decimal, the % of how much you want the profit difference to send to vault. 0.14 = 14% of the profit."
>
> "Big win threshold: If a win increases your balance by this much as a multiple (if balance was 10 units, and you hit for 50+ units it will hit )"
>
> "If you have games open in multiple tabs, and also start this in multiple tabs, it will double/triple deposit. Only have one autovaulter started at one time!"

That is the "skim the win" language in the wild: save % of profit, extra hit on a big-win multiple. Not RG-branded. Mechanic is identical to AutoVault's job.

### 2. Stake.com Wingman (Greasy Fork)

https://greasyfork.org/en/scripts/433176-stake-com-wingman

> "Automatically sends a percentage of your winnings to the vault. It's based on @Dauersendung script, which is outdated."
>
> "Let's say you are playing automated dice and you started with 1 EOS. Whenever the script detects that your balance grows more than that (1 EOS), it will deposit a X% of the difference to your vault. So for instance if you reach 1.00005000 EOS and you have it set to deposit 10%, it will deposit 0.00000500 EOS, and will set the next threshold to 1.00004500, so whenever you are above that amount it will deposit again."
>
> "It's safe to use, as the only transfer is done to your vault"
> "Setup the percentage to be saved at SAVE_AMOUNT (at the beginning of the script) Default is 10% (0.10)"
> "Running it in more than one tab might cause duplicated deposits to the vault"

### 3. Stake.com Vault Script (Greasy Fork, related listing)

https://greasyfork.org/en/scripts/438429-stake-com-vault-script

> "Sends a percentage of your profits to the vault"

Same Wingman copy. Older sibling: https://greasyfork.org/en/scripts/408276-stake-com-vault-script (search result; Dauersendung-era). Search snippets show GraphQL `createVaultDeposit` against `api.stake.com` using the session cookie. These are account-session automations, not a casino feature.

Reddit also named **qbot** as an outside automation stack (dice strategies + vault). No first-party auto-vault page on Stake.us or Stake.com was found.

Stake chat bans the category: "Don't share codes, scripts or any other bot service" (`https://help.stake.com/en/articles/4793426-guidelines-for-stake-chat`). Auto-vault lives off-platform on purpose.

## nuts.gg

Search did not return a nuts.gg help article that explains vaulting winnings. Homepage fetch of `https://nuts.gg` returned 403. `https://nuts.gg/terms` served marketing chrome, not a vault explainer: "Welcome to Nuts, the Ultimate Online Casino," races, **big wins**, daily $200 / weekly $500 / monthly $2500 prize bands, provably fair seeds, instant withdrawals, unlimited faucet.

No public "store winnings so you do not rebet" copy was found for nuts.gg in this pass. Compatible-casino fact for TiltCheck remains product-side: public AutoVault install surfaces are `/stake` (Stake.us) and `/nuts` (nuts.gg). Those pages already use skim language the house will not:

- Stake.us: "Free auto-vault for Stake.us. Skim heater wins to vault (SC/GC) before you rinse."
- nuts.gg: "Free auto-vault for nuts.gg. Skim heater wins to vault before you rinse."

Third-party public scripts found in this research target Stake.us / Stake.com / mirrors, not nuts.gg.

## Language that already exists ("skim the win")

| Source | Phrase | Job named? |
| :--- | :--- | :--- |
| Stake.us help | "bank," "inactive part of your balance," "cannot be used for playing" | Separation, not auto-skim |
| Stake.com help | "secured storage," skip blockchain fees | Custody-lite |
| Stake Forum | "automatically put any coins you receive in your vault" / "wins while you are afk auto-betting" | Yes, player-requested |
| r/stakeus | "automatically move winnings to vault" / "every net gain of $X" | Yes |
| GitHub autovaulter | "automatically vault profits" / Save % of profit / big-win threshold | Yes |
| Greasy Fork Wingman | "percentage of your winnings to the vault" | Yes |
| TiltCheck `/stake` `/nuts` | "Skim heater wins to vault before you rinse" | Yes, and only on those two casinos as public install |

House copy will not say "don't rebet." Players and scripts already do.

## Compatible-casino limit (what the public web actually documents)

- **Native vault UI:** Stake.us (SC/GC) and Stake.com (crypto), documented in help centers above.
- **Native auto-vault setting:** none found.
- **Public third-party auto-vault pages:** Stake.us / Stake.com / mirrors (Tampermonkey + Greasy Fork).
- **nuts.gg vault help:** not found on the public web in this search set.
- **TiltCheck public AutoVault:** Stake.us + nuts.gg only (`/stake`, `/nuts`). Do not hero a longer casino list.

## Implications for TiltCheck

AutoVault is Stake.us + nuts.gg only. Stake's own vault is a manual bank with 2FA retrieve, sold as security, not as a heater skim. Players have asked for auto-move since at least 2021; third-party Tampermonkey/Greasy Fork scripts already skim a percent of Stake profits. nuts.gg has no public vault explainer in this research. Homepage and hero copy should not promise AutoVault as a universal casino feature. If AutoVault appears at all, it is a supporting tool for two sites, not the job of `tiltcheck.me`.
