// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const convertMarkdown = readFileSync(
  path.join(process.cwd(), 'scripts/convert-markdown.js'),
  'utf8',
);

describe('GitHub Pages login route', () => {
  it('emits /login/index.html so tiltcheck.me/login is not a Pages 404', () => {
    expect(convertMarkdown).toContain("path.join(siteRoot, 'login')");
    expect(convertMarkdown).toContain("path.join(loginDir, 'index.html')");
    expect(convertMarkdown).toContain('buildLoginPage()');
  });

  it('keeps the Discord login selector and access_denied copy the e2e specs look for', () => {
    expect(convertMarkdown).toContain("data-provider=\"discord\"");
    expect(convertMarkdown).toContain('Login with Discord');
    expect(convertMarkdown).toContain('id="login-error"');
    expect(convertMarkdown).toContain('Discord login failed. Try again or use email login.');
    expect(convertMarkdown).toContain("params.get('error')");
  });
});
