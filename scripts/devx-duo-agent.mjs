#!/usr/bin/env node
/**
 * DevX Duo Agent (MVP)
 *
 * Autonomous repo hygiene fixer focused on high-friction developer pain points:
 * - Generated analyzer artifacts accidentally tracked in git
 * - Missing .gitignore entries for local runtime outputs
 * - Optional guardrails for GitHub workflow churn in non-billed repos
 *
 * Usage:
 *   node scripts/devx-duo-agent.mjs --check
 *   node scripts/devx-duo-agent.mjs --apply
 *   node scripts/devx-duo-agent.mjs --apply --config scripts/duo-agent.config.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const isCheck = args.has('--check');
const isApply = args.has('--apply') || !isCheck;
const configArgIndex = process.argv.indexOf('--config');
const configPath = configArgIndex >= 0
  ? path.resolve(process.cwd(), process.argv[configArgIndex + 1] || '')
  : path.join(repoRoot, 'scripts', 'duo-agent.config.json');

function run(command) {
  try {
    return execSync(command, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    const stderr = String(error?.stderr || '').trim();
    const stdout = String(error?.stdout || '').trim();
    throw new Error(stderr || stdout || String(error));
  }
}

function isTracked(filePath) {
  try {
    run(`git ls-files --error-unmatch -- "${filePath}"`);
    return true;
  } catch {
    return false;
  }
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function ensureGitignoreEntries(entries, gitignorePath, applyChanges) {
  const actions = [];
  const absPath = path.join(repoRoot, gitignorePath);
  const current = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : '';
  const lines = current.split(/\r?\n/);
  let updated = current;

  for (const entry of entries) {
    if (!lines.includes(entry)) {
      const needsNewline = updated.length > 0 && !updated.endsWith('\n');
      updated += `${needsNewline ? '\n' : ''}${entry}\n`;
      lines.push(entry);
      actions.push(`add-gitignore:${entry}`);
    }
  }

  if (applyChanges && updated !== current) {
    fs.writeFileSync(absPath, updated, 'utf8');
  }
  return actions;
}

function untrackFiles(files, applyChanges) {
  const actions = [];
  for (const file of files) {
    if (isTracked(file)) {
      if (applyChanges) {
        run(`git rm --cached -- "${file}"`);
      }
      actions.push(`untrack:${file}`);
    }
  }
  return actions;
}

function main() {
  const cfg = loadConfig();
  const actions = [];

  actions.push(
    ...ensureGitignoreEntries(
      cfg.gitignore?.entries || [],
      cfg.gitignore?.file || '.gitignore',
      isApply
    )
  );
  actions.push(...untrackFiles(cfg.untrackFiles || [], isApply));

  const changed = actions.length > 0;
  const summary = {
    mode: isCheck ? 'check' : 'apply',
    config: path.relative(repoRoot, configPath).replace(/\\/g, '/'),
    actions,
    changed,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (isCheck && (actions.length > 0 || changed)) {
    process.exitCode = 2;
    return;
  }

  if (isApply && actions.length === 0) {
    console.log('DevX Duo Agent: no autofixes needed.');
  }
}

main();
