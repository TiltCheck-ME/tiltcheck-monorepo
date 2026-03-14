#!/bin/bash
set -e

cd C:\Users\jmeni\tiltcheck-monorepo

echo "========================================="
echo "COMMITTING CHANGES"
echo "========================================="

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
echo "========================================="
echo "RECENT COMMITS"
echo "========================================="
git log --oneline -5

echo ""
echo "========================================="
echo "PUSHING TO REMOTE"
echo "========================================="
git push origin feature/implement-degen-agent

echo ""
echo "========================================="
echo "CREATING PR"
echo "========================================="
gh pr create --title "Discord OAuth Fixes + Brand Compliance Agents" --body-file pr_body.md --base main

echo ""
echo "========================================="
echo "✅ DONE!"
echo "========================================="
