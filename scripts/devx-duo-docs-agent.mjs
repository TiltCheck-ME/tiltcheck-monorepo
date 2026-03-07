#!/usr/bin/env node
/**
 * DevX Duo Docs Agent (MVP)
 *
 * Hybrid docs updater:
 * - Deterministic section updates owned by marker pairs
 * - Optional LLM summary constrained by prompt + output validation
 *
 * Usage:
 *   node scripts/devx-duo-docs-agent.mjs --check
 *   node scripts/devx-duo-docs-agent.mjs --apply
 *   node scripts/devx-duo-docs-agent.mjs --check --changed-file apps/web/src/main.ts
 *   node scripts/devx-duo-docs-agent.mjs --apply --config scripts/duo-docs-agent.config.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const args = new Set(argv);
const isCheck = args.has('--check');
const isApply = args.has('--apply') || !isCheck;

function argValue(flag, defaultValue = '') {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return defaultValue;
  }
  return argv[index + 1] || defaultValue;
}

function repeatedArgValues(flag) {
  const values = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === flag && argv[i + 1]) {
      values.push(argv[i + 1]);
    }
  }
  return values;
}

const configPath = path.resolve(
  process.cwd(),
  argValue('--config', 'scripts/duo-docs-agent.config.json')
);
const explicitReportPath = argValue('--report-file', '');

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

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!parsed.sections || !parsed.rules) {
    throw new Error('Invalid docs agent config: missing "sections" or "rules".');
  }
  return parsed;
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function uniq(values) {
  return [...new Set(values)];
}

function detectDiffRange() {
  const cliBase = argValue('--base', '');
  const cliHead = argValue('--head', '');
  if (cliBase && cliHead) {
    return { base: cliBase, head: cliHead, source: 'cli' };
  }

  const envBase = process.env.DOCS_AGENT_BASE_SHA || process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA || '';
  const envHead = process.env.DOCS_AGENT_HEAD_SHA || process.env.CI_COMMIT_SHA || '';
  if (envBase && envHead) {
    return { base: envBase, head: envHead, source: 'ci_env' };
  }

  return { base: 'HEAD~1', head: 'HEAD', source: 'local_default' };
}

function detectChangedFiles() {
  const explicitFiles = repeatedArgValues('--changed-file').map(toPosix);
  if (explicitFiles.length > 0) {
    return {
      files: uniq(explicitFiles),
      range: { base: 'manual', head: 'manual', source: 'manual_args' },
      mode: 'manual',
    };
  }

  const range = detectDiffRange();
  try {
    const raw = run(`git diff --name-only ${range.base} ${range.head}`);
    const files = raw
      .split(/\r?\n/)
      .map((line) => toPosix(line.trim()))
      .filter(Boolean);
    return { files: uniq(files), range, mode: 'git_diff' };
  } catch {
    const raw = run('git status --porcelain');
    const files = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => toPosix(line.slice(3).trim()))
      .filter(Boolean);
    return { files: uniq(files), range: { ...range, source: 'git_status' }, mode: 'git_status' };
  }
}

function classifyAreas(files) {
  const counts = {};
  for (const file of files) {
    const area = file.includes('/') ? file.split('/')[0] : 'root';
    counts[area] = (counts[area] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([area, count]) => ({ area, count }));
}

function resolveTargets(cfg, changedFiles) {
  const targets = [];
  const matchedRules = [];
  for (const rule of cfg.rules) {
    const prefixes = rule.matchPrefixes || [];
    const hits = changedFiles.filter((file) => prefixes.some((prefix) => file.startsWith(prefix)));
    if (hits.length === 0) {
      continue;
    }
    matchedRules.push({
      ruleId: rule.id,
      description: rule.description || '',
      hitCount: hits.length,
      sampleFiles: hits.slice(0, 5),
    });
    for (const target of rule.targetSections || []) {
      targets.push({
        file: target.file,
        sectionId: target.sectionId,
        ruleId: rule.id,
      });
    }
  }

  const uniqueTargets = uniq(targets.map((target) => `${target.file}::${target.sectionId}`)).map((key) => {
    const [file, sectionId] = key.split('::');
    return { file, sectionId };
  });

  return { matchedRules, targets: uniqueTargets };
}

function interpolateTemplate(template, payload) {
  return template.replace('{{PAYLOAD_JSON}}', JSON.stringify(payload, null, 2));
}

function normalizeLlmBullets(text, maxChars) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bullets = lines
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => `- ${line.slice(0, 140)}`);
  if (bullets.length === 0) {
    return '';
  }
  return bullets.join('\n').slice(0, maxChars);
}

async function maybeGenerateLlmSummary(cfg, payload, sectionCfg) {
  if (!sectionCfg.allowLlmSummary) {
    return { enabled: false, reason: 'section-disabled', content: '' };
  }

  const llmCfg = cfg.llm || {};
  const enabled = String(process.env[llmCfg.enabledEnvVar || 'DOCS_AGENT_ENABLE_LLM'] || '').toLowerCase();
  if (!['1', 'true', 'yes'].includes(enabled)) {
    return { enabled: false, reason: 'env-disabled', content: '' };
  }

  const apiKey = process.env[llmCfg.apiKeyEnvVar || 'DOCS_AGENT_LLM_API_KEY'] || '';
  if (!apiKey) {
    return { enabled: false, reason: 'missing-api-key', content: '' };
  }

  const promptTemplatePath = path.resolve(repoRoot, llmCfg.promptTemplateFile || 'scripts/prompts/docs-summary.md');
  if (!fs.existsSync(promptTemplatePath)) {
    return { enabled: false, reason: 'missing-prompt-template', content: '' };
  }
  const template = fs.readFileSync(promptTemplatePath, 'utf8');
  const prompt = interpolateTemplate(template, payload);

  const apiUrl = process.env[llmCfg.apiUrlEnvVar || 'DOCS_AGENT_LLM_API_URL'] || llmCfg.defaultApiUrl;
  const model = process.env[llmCfg.modelEnvVar || 'DOCS_AGENT_LLM_MODEL'] || llmCfg.defaultModel || 'gpt-4o-mini';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You write concise repo documentation summaries.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return { enabled: true, reason: `http-${response.status}`, content: '' };
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    const normalized = normalizeLlmBullets(raw, llmCfg.maxOutputChars || 900);
    if (!normalized) {
      return { enabled: true, reason: 'empty-output', content: '' };
    }
    return { enabled: true, reason: 'ok', content: normalized };
  } catch {
    return { enabled: true, reason: 'request-failed', content: '' };
  }
}

function buildDeterministicSection(sectionCfg, context, llmSummary) {
  const lines = [];
  const generationRef = context.range.head || 'unknown';
  lines.push(sectionCfg.header || '## Docs Agent Update');
  lines.push('');
  lines.push(`- Generated for ref: \`${generationRef}\``);
  lines.push(`- Diff source: \`${context.range.base}..${context.range.head}\` (${context.range.source})`);
  lines.push(`- Changed files detected: **${context.changedFiles.length}**`);

  const areaLabel = context.areas.length > 0
    ? context.areas.map((entry) => `\`${entry.area}\` (${entry.count})`).join(', ')
    : 'none';
  lines.push(`- Touched areas: ${areaLabel}`);
  lines.push('');

  if (sectionCfg.includeFileList) {
    const maxFiles = sectionCfg.maxFiles || 10;
    const shown = context.changedFiles.slice(0, maxFiles);
    lines.push('#### Files in scope');
    if (shown.length === 0) {
      lines.push('- No changed files were detected.');
    } else {
      for (const file of shown) {
        lines.push(`- \`${file}\``);
      }
      if (context.changedFiles.length > shown.length) {
        lines.push(`- ...and ${context.changedFiles.length - shown.length} more.`);
      }
    }
    lines.push('');
  }

  if (llmSummary) {
    lines.push(sectionCfg.llmSummaryHeader || '### AI Summary (Optional)');
    lines.push(llmSummary);
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function updateSection(content, sectionCfg, sectionBody) {
  const start = sectionCfg.startMarker;
  const end = sectionCfg.endMarker;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);

  const fullSection = `${start}\n${sectionBody}${end}`;
  if (startIndex >= 0 && endIndex > startIndex) {
    const before = content.slice(0, startIndex);
    const after = content.slice(endIndex + end.length);
    return `${before}${fullSection}${after}`;
  }

  const appendNeedsNewline = content.length > 0 && !content.endsWith('\n');
  return `${content}${appendNeedsNewline ? '\n' : ''}\n${fullSection}\n`;
}

function writeReport(filePath, report) {
  const absolutePath = path.resolve(repoRoot, filePath);
  ensureDirForFile(absolutePath);
  fs.writeFileSync(absolutePath, JSON.stringify(report, null, 2), 'utf8');
}

async function main() {
  const cfg = loadConfig();
  const { files, range, mode } = detectChangedFiles();
  const filteredFiles = files.filter((file) => !file.startsWith('docs/'));
  const changedFiles = uniq(filteredFiles.length > 0 ? filteredFiles : files);
  const areas = classifyAreas(changedFiles);
  const { matchedRules, targets } = resolveTargets(cfg, changedFiles);

  const updates = [];
  const llmEvents = [];

  for (const target of targets) {
    const sectionCfg = cfg.sections[target.sectionId];
    if (!sectionCfg) {
      updates.push({
        file: target.file,
        sectionId: target.sectionId,
        changed: false,
        reason: 'missing-section-config',
      });
      continue;
    }

    const targetPath = path.resolve(repoRoot, target.file);
    const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
    const payload = {
      targetSection: target.sectionId,
      changedFiles,
      touchedAreas: areas,
      matchedRules,
    };
    const llmResult = await maybeGenerateLlmSummary(cfg, payload, sectionCfg);
    llmEvents.push({
      target: `${target.file}#${target.sectionId}`,
      enabled: llmResult.enabled,
      reason: llmResult.reason,
      included: Boolean(llmResult.content),
    });

    const sectionBody = buildDeterministicSection(sectionCfg, { range, changedFiles, areas }, llmResult.content);
    const updated = updateSection(existing, sectionCfg, sectionBody);
    const changed = updated !== existing;

    if (changed && isApply) {
      ensureDirForFile(targetPath);
      fs.writeFileSync(targetPath, updated, 'utf8');
    }

    updates.push({
      file: toPosix(path.relative(repoRoot, targetPath)),
      sectionId: target.sectionId,
      changed,
      reason: changed ? 'updated' : 'no-diff',
    });
  }

  const changedCount = updates.filter((entry) => entry.changed).length;
  const report = {
    mode: isCheck ? 'check' : 'apply',
    config: toPosix(path.relative(repoRoot, configPath)),
    detectionMode: mode,
    range,
    changedFiles: changedFiles.slice(0, cfg.maxChangedFilesInReport || 60),
    changedFilesTotal: changedFiles.length,
    matchedRules,
    updates,
    llm: llmEvents,
    changed: changedCount > 0,
  };

  if (isApply) {
    const reportPath = explicitReportPath || cfg.reportFile || 'artifacts/docs-agent-report.json';
    writeReport(reportPath, report);
    report.reportFile = toPosix(reportPath);
  }

  console.log(JSON.stringify(report, null, 2));

  if (isCheck && changedCount > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`DevX Duo Docs Agent failed: ${error.message}`);
  process.exitCode = 1;
});
