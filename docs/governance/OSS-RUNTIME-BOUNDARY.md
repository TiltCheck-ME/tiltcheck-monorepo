# Open Source and Private Runtime Boundary

Last updated: 2026-03-07

## Policy

TiltCheck keeps source code open while production runtime remains private and secure.

## Public (Allowed in Repository)

- application and library source code
- deployment templates and example configs
- `.env.example` files with placeholders only
- architecture and migration documentation

## Private (Never Commit)

- production secrets and tokens
- private keys and credentials
- customer or operator sensitive data
- internal-only production identifiers that increase attack surface

## Secret Management Standard

- Production secrets must be stored in GCP Secret Manager.
- Local development secrets must be kept outside git.
- Any leaked secret requires immediate rotation and incident note.

## Enforcement

- PR checks must fail on obvious plaintext secret patterns.
- Contributors must complete security checklist items in PR template.
- License and OSS policy files must remain present.
