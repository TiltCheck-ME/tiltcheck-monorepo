/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */

import { execFileSync } from 'node:child_process';

function runGit(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function parseArgs(argv) {
  const options = {
    base: null,
    head: null,
    staged: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--base') {
      options.base = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (argument === '--head') {
      options.head = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (argument === '--staged') {
      options.staged = true;
    }
  }

  return options;
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function getBasename(filePath) {
  const normalizedPath = normalizePath(filePath);
  const segments = normalizedPath.split('/');
  return segments[segments.length - 1] ?? normalizedPath;
}

function isExampleFile(baseName) {
  return (
    baseName.endsWith('.example') ||
    baseName.endsWith('.sample') ||
    baseName.endsWith('.template')
  );
}

function isBlockedPath(filePath) {
  const normalizedPath = normalizePath(filePath);
  const baseName = getBasename(normalizedPath);

  if (isExampleFile(baseName)) {
    return false;
  }

  if (baseName === '.env' || baseName === '.env.local') {
    return true;
  }

  if (/^\.env\./i.test(baseName)) {
    return true;
  }

  if (baseName === 'credentials.json' || baseName === 'token.json') {
    return true;
  }

  if (/\.(pem|key|p12|pfx|jks)$/i.test(baseName)) {
    return true;
  }

  if (/^id_(rsa|ecdsa)/i.test(baseName)) {
    return true;
  }

  return false;
}

function getChangedFiles(options) {
  if (options.staged) {
    const output = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  }

  if (options.base && options.head) {
    const output = runGit([
      'diff',
      '--name-only',
      '--diff-filter=ACMR',
      options.base,
      options.head,
    ]);
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  }

  const output = runGit(['ls-files']);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function getDiffText(options) {
  if (options.staged) {
    return runGit(['diff', '--cached', '--unified=0', '--no-color']);
  }

  if (options.base && options.head) {
    return runGit([
      'diff',
      '--unified=0',
      '--no-color',
      options.base,
      options.head,
    ]);
  }

  return '';
}

const secretLineMatchers = [
  {
    label: 'private-key-material',
    regex: /BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY/,
  },
  {
    label: 'github-token',
    regex: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/,
  },
  {
    label: 'slack-token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  },
  {
    label: 'stripe-live-key',
    regex: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/,
  },
  {
    label: 'google-api-key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    label: 'discord-bot-token',
    regex: /\b(?:[MN][A-Za-z\d_-]{23}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,}|[A-Za-z\d_-]{24}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,})\b/,
  },
  {
    label: 'hardcoded-secret-assignment',
    regex:
      /\b(?:DISCORD_TOKEN|JWT_SECRET|DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|RAILWAY_TOKEN|CLOUDFLARE_API_TOKEN|OPENAI_API_KEY|GITHUB_TOKEN)\b\s*[:=]\s*['"]?(?!your_|example|placeholder|changeme|dummy|test_|dev-|not-for-production|\$\{\{\s*secrets\.|process\.env)[A-Za-z0-9_./+=:-]{12,}/i,
  },
];

function detectSecretLines(diffText) {
  const lines = diffText.split(/\r?\n/);
  let currentFile = null;
  const findings = [];

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
      continue;
    }

    if (!line.startsWith('+') || line.startsWith('+++')) {
      continue;
    }

    for (const matcher of secretLineMatchers) {
      if (matcher.regex.test(line)) {
        findings.push({
          file: currentFile ?? 'unknown',
          label: matcher.label,
        });
      }
    }
  }

  return findings;
}

function printFindings(title, findings) {
  if (findings.length === 0) {
    return;
  }

  console.error(title);
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.label}`);
  }
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.file}::${finding.label}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const changedFiles = getChangedFiles(options).map(normalizePath);
  const blockedPaths = changedFiles
    .filter(isBlockedPath)
    .map((file) => ({ file, label: 'blocked-secret-file' }));

  const secretLines = dedupeFindings(detectSecretLines(getDiffText(options)));

  if (blockedPaths.length === 0 && secretLines.length === 0) {
    console.log('Secret guard passed.');
    return;
  }

  printFindings('Secret guard failed on blocked file paths:', blockedPaths);
  printFindings('Secret guard failed on high-signal secret patterns:', secretLines);
  process.exit(1);
}

main();
