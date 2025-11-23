# TiltCheck Security Policy

TiltCheck follows a minimal attack surface philosophy:
- no custodial systems  
- no private key storage  
- no sensitive personal data  
- no long-term session storage  

## Supported Versions
Active version: `main` branch.

## Security Remediations

### bigint-buffer Vulnerability (GHSA-3gc7-fjrx-p6mg)
**Status:** ✅ Resolved  
**Date:** November 2025  
**Severity:** High  

**Issue:** Buffer overflow vulnerability in `bigint-buffer@1.1.5` via `toBigIntLE()` function. This affected the dependency chain through `@solana/spl-token > @solana/buffer-layout-utils > bigint-buffer`.

**Resolution:** Implemented pnpm override to replace vulnerable `bigint-buffer` with secure fork `@gsknnft/bigint-buffer@1.3.2`. This fork provides:
- Security fixes for buffer overflow vulnerability
- Full API compatibility with original package
- Pure JavaScript fallback for Node.js versions <24
- Modern TypeScript and build tooling

No code changes were required; the override is transparent to all consuming packages.

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