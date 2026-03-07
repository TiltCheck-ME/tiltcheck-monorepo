# Pull Request

## Description
<!-- Provide a clear and concise description of your changes -->

## Type of Change
<!-- Check all that apply -->
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🔒 Security fix
- [ ] ⚡ Performance improvement
- [ ] 🧹 Code refactoring
- [ ] 🔧 Configuration change
- [ ] 🚀 Deployment change

## Related Issues
<!-- Link to related issues using #issue_number -->
Fixes #
Related to #

## Decision Gates (Required for Ambiguous Changes)
<!-- Explicitly document decisions for architecture/security/cost ambiguity -->
- [ ] No ambiguous production-impacting choices left unresolved
- [ ] Decision log updated (`docs/migration/decision-log.md`) when applicable
- [ ] Approver noted for any new migration decision (`DEC-*`)

### Decision Entries Added/Updated
<!-- Example: DEC-20260307-04 -->
- (none)

## Changes Made
<!-- List the key changes in this PR -->
- (change 1)
- (change 2)
- (change 3)

## Module/Service Affected
<!-- Check all that apply -->
- [ ] Discord Bot
- [ ] JustTheTip
- [ ] SusLink
- [ ] CollectClock
- [ ] (Archived) FreeSpinScan
- [ ] (Archived) QualifyFirst
- [ ] TiltCheck Core
- [ ] Trust Engines
- [ ] Dashboard
- [ ] Event Router
- [ ] Infrastructure/DevOps
- [ ] Documentation

## Testing
<!-- Describe how you tested your changes -->
- [ ] Tests pass locally (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Manual testing completed
- [ ] Accessibility audit passes (if UI changes)

### Test Details
<!-- Describe specific tests or manual verification steps -->

## Security Checklist
<!-- Ensure security best practices are followed -->
- [ ] No secrets or sensitive data in code
- [ ] Non-custodial principles maintained (if applicable)
- [ ] Input validation added for user-provided data
- [ ] Dependencies checked for vulnerabilities
- [ ] No new high/critical security warnings
- [ ] No production secrets or credentials committed

## Performance Impact
<!-- Describe any performance implications -->
- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance may be affected (details below)

**Details:**

## Breaking Changes
<!-- If this is a breaking change, describe the impact and migration path -->

## Documentation
<!-- Check all that apply -->
- [ ] Code comments added/updated
- [ ] README updated
- [ ] Architecture docs updated
- [ ] API documentation updated
- [ ] No documentation needed

## Deployment Notes
<!-- Any special deployment considerations? -->
- [ ] Requires environment variable changes
- [ ] Requires database migration
- [ ] Requires configuration updates
- [ ] No special deployment steps

**Details:**

## Screenshots/Videos
<!-- If applicable, add screenshots or videos to demonstrate changes -->

## Additional Context
<!-- Any other information that reviewers should know -->

---

## Reviewer Checklist
<!-- For reviewers - ensure these items are verified -->
- [ ] Code follows TiltCheck architecture principles
- [ ] Changes are minimal and focused
- [ ] Security implications reviewed
- [ ] Tests are adequate
- [ ] Documentation is complete
- [ ] No unnecessary dependencies added
