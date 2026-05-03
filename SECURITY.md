<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

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

- Advisory: [GHSA-3gc7-fjrx-p6mg](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg)
- Package: `bigint-buffer@1.1.5`
- Severity: High
- Status: Tracking upstream
- Mitigation: Runtime guards implemented

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

## Open source boundary and secrets

TiltCheck is open source, but production runtime secrets remain private.

- never commit live credentials
- use GCP Secret Manager for production secrets
- rotate any leaked secret immediately

Reference: `docs/governance/OSS-RUNTIME-BOUNDARY.md`

## CI secret scanning policy

TiltCheck now uses a two-layer secret scanning gate on every pull request targeting `main` and every push to `main`:

1. `.github/workflows/secret-guard.yml` runs `scripts/secret-guard.mjs` as the fast pre-PR sanity check.
2. The same workflow runs `gitleaks/gitleaks-action@v2` with repo-local tuning from `.gitleaks.toml`.

`secret-guard.mjs` stays intentionally cheap and high-signal. Gitleaks is the authoritative CI gate for credential detection.

### Allowlist rules

Allowlists in `.gitleaks.toml` must stay narrow, path-scoped, and boring:

- only suppress documented false positives
- prefer obvious placeholders over realistic-looking fake tokens
- scope ignores to exact files or exact placeholder patterns
- never allowlist a real credential family across the whole repo just because a doc or fixture was sloppy

If a scan trips on a fake example, fix the example first when possible. Reach for the allowlist only when the placeholder is still useful and the match can be constrained without blinding the scanner.

### GitHub Advanced Security secret scanning

GitHub native secret scanning is separate from the CI workflow above. If the repository owner or org has GitHub Advanced Security available, enable:

- Secret scanning
- Push protection

This repository does not currently manage those GitHub settings as code, so they must be enabled from the GitHub repository security settings UI.

## Internal beta trust gate

TiltCheck may run an internal beta before a broader public launch, but only under a tighter trust bar:

1. current tracked files must not contain live credentials or secret-bearing runtime files
2. any known historical secret exposure must have an explicit remediation owner and rotation decision
3. internal beta access must stay maintainer-controlled until historical exposure is either remediated or proven non-live

The known historical reference to `apps/api/.env.test` in git history has been reviewed and the affected credential families have been rotated by the maintainer. That clears the live-secret blocker for internal beta use, but it does not erase the historical file from git history.

The secret scanning workflow now combines the fast `secret-guard.mjs` sanity check with Gitleaks as the authoritative CI gate. That blocks new secret-shaped content more effectively, but it still does not erase history. Describe the repository as rotation-remediated, not history-scrubbed, until any optional history cleanup decision is complete.

## Historical secret remediation package

Use the repo-native history audit before any rotation or history cleanup work:

```bash
pnpm audit:history-secrets
```

The command reports secret-bearing filenames that appear anywhere in git history and exits non-zero when it finds any non-example paths that still need remediation review.

### Current known historical blocker

- `apps/api/.env.test` remains the primary known non-example secret-bearing path in git history.
- Current audit evidence shows it was added on `2026-03-13T07:12:11-05:00` and removed from the tree on `2026-03-13T07:24:36-05:00`.
- The maintainer has since rotated the affected credential families, so the remaining decision is whether history rewrite is still worth doing for repo hygiene and trust posture.

### Non-destructive remediation checklist

1. run `pnpm audit:history-secrets` and capture the actionable non-example paths
2. identify every credential family that could have lived in those files
3. assign a human owner for each credential family before touching production systems
4. rotate any credential that may still be live, even if later replaced
5. only after rotation is complete, decide whether git history rewrite is still required
6. update this policy once the known historical blocker is either rotated and closed or proven non-live

This package is intentionally non-destructive. It prepares the rotation and cleanup work without rewriting history from the shared repo by default.

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

**Email:** [jme@tiltcheck.me](mailto:jme@tiltcheck.me)  
**Discord:** (to be added)

Do NOT open a public issue for security vulnerabilities.

## Handling Timeline

- Acknowledge within 48 hours
- Investigate within 7 days
- Patch within 14 days if confirmed
- Credit given unless anonymity requested

## Coordinated disclosure workflow

1. Report privately through channels above.
2. Maintainer acknowledges and assigns severity.
3. Fix is prepared in private if needed.
4. Public disclosure follows patch or mitigation release.

TiltCheck Ecosystem © 2024–2026
