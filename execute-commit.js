const { execSync } = require('child_process');
const path = require('path');

const repoPath = 'C:\\Users\\jmeni\\tiltcheck-monorepo';

console.log('========================================');
console.log('COMMITTING CHANGES');
console.log('========================================\n');

try {
  process.chdir(repoPath);
  
  // Stage all changes
  console.log('Staging files...');
  execSync('git add -A', { stdio: 'inherit' });
  
  // Commit with full message
  console.log('\nCommitting...');
  const commitMessage = `feat: fix discord oauth login issues and deploy brand compliance agents

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

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`;

  execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  
  // Show recent commits
  console.log('\n========================================');
  console.log('RECENT COMMITS');
  console.log('========================================\n');
  execSync('git log --oneline -5', { stdio: 'inherit' });
  
  // Push to remote
  console.log('\n========================================');
  console.log('PUSHING TO REMOTE');
  console.log('========================================\n');
  execSync('git push origin feature/implement-degen-agent', { stdio: 'inherit' });
  
  // Create PR
  console.log('\n========================================');
  console.log('CREATING PR');
  console.log('========================================\n');
  execSync('gh pr create --title "Discord OAuth Fixes + Brand Compliance Agents" --body-file pr_body.md --base main', { stdio: 'inherit' });
  
  console.log('\n========================================');
  console.log('✅ ALL DONE!');
  console.log('========================================\n');
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
