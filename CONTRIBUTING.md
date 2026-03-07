# Contributing to TiltCheck

Thank you for contributing to TiltCheck.

## Core contribution rules

1. Keep modules independent and use shared interfaces/event routing.
2. Follow the architecture docs in `docs/tiltcheck/`.
3. Never introduce custodial behavior or hidden fund custody paths.
4. Keep changes focused, testable, and well-scoped.

## Open source + private runtime boundary

TiltCheck code is open source. Production runtime internals are private.

- Allowed in PRs:
  - source code
  - docs
  - infra templates
  - `.env.example` placeholders
- Never commit:
  - real credentials/tokens
  - production secret values
  - private key material

See `docs/governance/OSS-RUNTIME-BOUNDARY.md` for policy details.

## Pull request expectations

- Explain the problem and why the approach was chosen.
- Note any architecture or deployment impact.
- Document test coverage and manual verification steps.
- Use the PR template security checklist.

## Security and disclosure

If your change touches auth, payments, trust scoring, or external APIs, include:

- threat/risk notes
- validation/sanitization notes
- rollback notes if behavior regresses

For vulnerability disclosure, follow `SECURITY.md` and avoid public disclosure before coordinated fix.

## Community standards

- No harassment, slurs, doxxing, or targeted abuse.
- Keep communication direct, respectful, and practical.

## License

Project licensing is defined by repository license files and notices.
