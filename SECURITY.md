# TiltCheck Security Policy

TiltCheck follows a minimal attack surface philosophy:
- no custodial systems  
- no private key storage  
- no sensitive personal data  
- no long-term session storage  

## Current Third-Party Vulnerability Tracking

| Advisory | Package Path | Status | Mitigation |
|----------|--------------|--------|------------|
| GHSA-3gc7-fjrx-p6mg | `bigint-buffer@1.1.5` via `@solana/spl-token` → `@solana/buffer-layout-utils` | Upstream pending | Monitor upstream releases; limit untrusted buffer parsing; no exposed attack surface identified in current usage |
| GHSA-x7hr-w5r2-h6wg | `prismjs@1.29.0` transitive through `@react-email/code-block` | Local override applied | Forced `prismjs` to `1.30.0` with `pnpm.overrides` |

If an upstream patch appears for `bigint-buffer`, we will upgrade the Solana dependency chain and remove any temporary mitigations. Runtime guard added in `modules/justthetip/src/wallet-manager.ts` validates address format & key length (32 bytes) prior to SPL token interactions.

## Supported Versions
Active version: `main` branch.

## Reporting a Vulnerability

If you discover:
- security exploit  
- trust engine bypass  
- unauthorized transaction flow  
- Discord permissions issue  
- prediction poisoning  
- any suspicious AI behavior  

Contact privately:

**Email:** jmenichole.security@proton.me  
**Discord:** (to be added)

Do NOT open a public issue for security vulnerabilities.

## Handling Timeline
- Acknowledge within 48 hours  
- Investigate within 7 days  
- Patch within 14 days if confirmed  
- Credit given unless anonymity requested  

TiltCheck Ecosystem © 2024–2025  