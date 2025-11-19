# Contributing to TiltCheck

Thank you for your interest in contributing!  
TiltCheck is built by a solo founder (jmenichole), and contributions are welcomed.

---

# Guidelines

## 1. Use the Copilot Agent
The custom agent is trained on the entire docs folder.  
Ask it questions like:
- “Where should this module live?”
- “Does this respect the event router?”
- “Is this non-custodial?”
- “Does this break the flat-fee rule?”

## 2. Keep Modules Independent
No direct imports between modules.  
Use the Event Router.

## 3. Follow the Architecture
`/docs/tiltcheck/` is the single source of truth.

## 4. Never Introduce Custody
TiltCheck must not hold user funds.

## 5. Keep Fees Flat
Always use the current approved flat-fee (default 0.07 SOL).

## 6. Ask Clear Questions
When opening issues or PRs:
- What problem is this solving?
- Where should it live?
- Is this MVP or polished?

## 7. Keep Things Cheap
Optimize for:
- Cloudflare
- Supabase free tier
- lightweight architecture
- small code footprint

## 8. Be Degen-Friendly
Do NOT:
- shame users
- moralize
- discourage fun

Do:
- keep safety first
- use humor when appropriate
- focus on clarity

## 9. Follow Community Standards
- no harassment  
- no slurs  
- no doxxing  
- no targeted insults  

---

# License
TiltCheck © 2024–2025  
All Rights Reserved unless otherwise specified.
