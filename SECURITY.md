# TiltCheck Security Policy

TiltCheck follows a minimal attack surface philosophy:
- no custodial systems  
- no private key storage  
- no sensitive personal data  
- no long-term session storage  

## Security Documentation

- **[API Security Guide](./docs/security/API-SECURITY-GUIDE.md)** — Protecting against third-party API breaches
- **[IP Allowlist Deployment](./docs/security/DEPLOY_IP_ALLOWLIST.md)** — Admin panel protection

## Supported Versions
Active version: `main` branch.

## Third-Party API Security

TiltCheck integrates with multiple external services. For protection against API breaches:

### Security Utilities Available

The `@tiltcheck/express-utils` package provides:

- **API Signature Verification** — HMAC-based request signing
- **Rate Limiting** — Protect against abuse
- **Circuit Breaker** — Graceful degradation when APIs fail
- **URL Validation** — Prevent SSRF attacks
- **Error Sanitization** — Don't leak internal details
- **Data Redaction** — Remove sensitive data from logs

See [`packages/express-utils/README.md`](./packages/express-utils/README.md) for usage.

### Key Practices

1. **Never commit API keys** — Use environment variables
2. **Validate all inputs** — Before passing to external APIs
3. **Sanitize all outputs** — From external APIs before use
4. **Implement fallbacks** — Mock responses when APIs fail
5. **Monitor for anomalies** — Track unusual patterns

## Known Vulnerabilities & Mitigations

### Transitive Dependencies

| Advisory | Package | Severity | Status | Mitigation |
|----------|---------|----------|--------|------------|
| [GHSA-3gc7-fjrx-p6mg](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg) | `bigint-buffer@1.1.5` | High | Tracking Upstream | Runtime guards implemented |

#### GHSA-3gc7-fjrx-p6mg: bigint-buffer Integer Overflow

**Dependency Chain:**  
`@solana/spl-token@0.4.14` → `@solana/buffer-layout-utils@0.2.0` → `bigint-buffer@1.1.5`

**Impact:**  
TiltCheck does not directly invoke bigint-buffer functions. Usage occurs inside SPL Token layout utilities. User-provided data is limited to validated base58 Solana addresses.

**Mitigations Implemented:**
- ✅ Runtime guard added in `modules/justthetip/src/wallet-manager.ts`
  - Base58 charset validation (no 0, O, I, l characters)
  - Address length validation (32-44 characters)
  - 32-byte buffer constraint enforcement
- ✅ Automated daily security audit workflow (`.github/workflows/security-audit.yml`)
- ✅ Comprehensive test coverage for validation logic
- ✅ Vulnerability documented with upstream tracking

**Upstream Status:**  
Monitoring for patched release of `@solana/buffer-layout-utils` or removal of bigint-buffer dependency.

**Next Steps:**
- Monitor upstream repositories for security patches
- Upgrade dependency chain when fix released
- Track progress in issue [#15](https://github.com/jmenichole/tiltcheck-monorepo/issues/15)

## Reporting a Vulnerability

If you discover:
- security exploit  
- trust engine bypass  
- unauthorized transaction flow  
- Discord permissions issue  
- prediction poisoning  
- any suspicious AI behavior  
- third-party API breach

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