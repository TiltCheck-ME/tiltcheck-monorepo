# Upstream Security Issue Template

Use this template when creating issues to track upstream security vulnerabilities in TiltCheck's dependencies.

---

## Title Format
```
Track upstream [package-name] vulnerability ([GHSA-ID])
```

## Issue Body

```markdown
## Summary
[Brief description of the vulnerability and how it affects TiltCheck]

Advisory: [GHSA-ID] affecting `[package@version]` [direct/transitive] via [dependency chain if transitive].

## Current Impact
[Describe how TiltCheck uses this package and whether the vulnerability affects TiltCheck]

## Dependency Chain
[For transitive dependencies, show the full chain]
```
package-a → package-b → vulnerable-package
```

## Mitigations Implemented
- [ ] Runtime guards added in `[file paths]`
- [ ] Vulnerability documented in `SECURITY.md`
- [ ] Automated audit workflow configured
- [ ] Test coverage added for mitigation
- [ ] Alternative implementation considered (if applicable)

## Desired Actions (Upstream / Tracking)
- [ ] Monitor for patched release
- [ ] Consider temporary workarounds if available
- [ ] Evaluate alternative packages if no fix expected
- [ ] Upgrade dependency chain when fix released

## Acceptance Criteria
- Issue closed when:
  - [ ] Vulnerability patched in upstream package
  - [ ] Dependency chain updated to non-vulnerable version
  - [ ] No security advisories remain for the package
  - OR alternative package adopted

## References
- Advisory: [URL to GitHub Advisory]
- Package repository: [URL]
- Related CVEs: [if applicable]
- Upstream tracking issue: [if exists]

## Security Checklist
- [ ] Added to Known Vulnerabilities table in `SECURITY.md`
- [ ] Runtime mitigations implemented and tested
- [ ] Daily security audit workflow running
- [ ] Team notified of vulnerability status

## Notes
[Any additional context, workarounds considered, or timeline expectations]

---

**Labels:** `security`, `dependencies`, `tracking`  
**Priority:** Determined by severity (Critical/High/Medium/Low)

---

*Remember: Do NOT include sensitive data, credentials, or exploit details in public issues.*
```

## Example

See issue [#15](https://github.com/jmenichole/tiltcheck-monorepo/issues/15) for a complete example of tracking the bigint-buffer vulnerability.

## Workflow Integration

This template works with the automated security audit workflow (`.github/workflows/security-audit.yml`):

1. **Create Issue**: Use this template when a new vulnerability is discovered
2. **Apply Labels**: Add `security` and `dependencies` labels
3. **Implement Mitigations**: Add runtime guards and update SECURITY.md
4. **Daily Monitoring**: The security-audit workflow will comment on the issue daily
5. **Close Issue**: When vulnerability is patched and dependencies updated

## Best Practices

1. **Create Early**: Open tracking issues as soon as vulnerabilities are discovered
2. **Document Thoroughly**: Include full dependency chain and impact analysis
3. **Implement Mitigations**: Don't wait for upstream fixes - add runtime guards
4. **Monitor Actively**: Check upstream repositories regularly for patches
5. **Update Promptly**: Upgrade dependencies as soon as fixes are available
6. **Close Properly**: Verify the vulnerability is resolved before closing

## Security Communication

- Use this template for **public tracking** of known vulnerabilities
- For **zero-day** or **undisclosed** vulnerabilities, contact security team privately first
- Always follow responsible disclosure practices
- Credit security researchers when appropriate
