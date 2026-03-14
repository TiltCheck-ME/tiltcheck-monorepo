#!/bin/bash
cd /mnt/c/Users/jmeni/tiltcheck-monorepo

# Show git status
echo "=== Git Status ==="
git status

# Show changed files
echo ""
echo "=== Changed Files ==="
git diff --name-only

# Commit changes
echo ""
echo "=== Committing Changes ==="
git add -A

git commit -m "feat: fix discord oauth login issues and deploy brand compliance agents

- Fix: Extension state validation in production (remove cookie domain parameter)
- Fix: User-dashboard token exposure (use secure HTTP-only cookie instead of URL param)
- Fix: Extension storage race condition (Promise-based handling with ACK and retry)
- Fix: Extension runtime ID validation (pass and validate ext_id on callback)
- Fix: Resolve merge conflict in auth-oauth-state.test.ts

- Deploy: Brand Law Enforcer agent (automated PR reviewer for Degen Laws compliance)
- Deploy: Frontend & Marketing Suggestions agent (weekly UI/UX improvements)
- Deploy: Chrome extension dev tools (MCP config, debugger setup, dev guide)

All Discord OAuth flows (web + extension) now working securely in production.
Brand compliance agents enforce tone, headers, no secrets, atomic docs on all PRs.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo ""
echo "=== Commit Complete ==="
git log --oneline -5
