/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */

import { execFileSync } from 'node:child_process';

function runGit(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function getBasename(filePath) {
  const segments = normalizePath(filePath).split('/');
  return segments[segments.length - 1] ?? filePath;
}

function isExampleFile(baseName) {
  return (
    baseName.endsWith('.example') ||
    baseName.endsWith('.sample') ||
    baseName.endsWith('.template')
  );
}

function classifySecretBearingPath(filePath) {
  const normalizedPath = normalizePath(filePath);
  const baseName = getBasename(normalizedPath);

  if (baseName === '.env' || baseName === '.env.local') {
    return 'runtime-env-file';
  }

  if (/^\.env\./i.test(baseName)) {
    return isExampleFile(baseName) ? 'example-env-file' : 'runtime-env-file';
  }

  if (baseName === 'credentials.json' || baseName === 'token.json') {
    return 'credential-file';
  }

  if (/\.(pem|key|p12|pfx|jks)$/i.test(baseName)) {
    return 'key-material-file';
  }

  if (/^id_(rsa|ecdsa)/i.test(baseName)) {
    return 'key-material-file';
  }

  return null;
}

function getHistoryFilePaths() {
  const output = runGit(['log', '--all', '--full-history', '--name-only', '--pretty=format:']);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePath);
}

function getCommitsForPath(filePath) {
  const output = runGit(['log', '--all', '--full-history', '--pretty=format:%H', '--', filePath]);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function main() {
  const historyPaths = [...new Set(getHistoryFilePaths())];
  const findings = historyPaths
    .map((filePath) => {
      const classification = classifySecretBearingPath(filePath);
      if (!classification) {
        return null;
      }

      const commits = getCommitsForPath(filePath);
      return {
        file: filePath,
        classification,
        example: classification === 'example-env-file',
        commits,
      };
    })
    .filter((entry) => entry !== null)
    .sort((left, right) => left.file.localeCompare(right.file));

  const actionableFindings = findings.filter((entry) => !entry.example);

  console.log('[history-secret-audit] Secret-bearing filenames in git history');
  console.log(JSON.stringify({
    actionableCount: actionableFindings.length,
    exampleCount: findings.length - actionableFindings.length,
    actionableFindings,
  }, null, 2));

  if (actionableFindings.length > 0) {
    process.exitCode = 1;
  }
}

main();
