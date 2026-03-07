/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * workspace-status.ts
 *
 * Discovers all workspace packages and checks each one for:
 *   - dist/ directory presence
 *   - lint script passing (if defined)
 *   - test script passing (if defined)
 *
 * Usage:
 *   npx tsx scripts/workspace-status.ts
 *   npx tsx scripts/workspace-status.ts --filter apps
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckResult = 'pass' | 'fail' | 'skip' | 'error';

interface PackageStatus {
  name: string;
  location: string;
  dist: CheckResult;
  lint: CheckResult;
  test: CheckResult;
  lintDetail?: string;
  testDetail?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readWorkspaceGlobs(): string[] {
  // Prefer pnpm-workspace.yaml
  const yamlPath = path.join(ROOT, 'pnpm-workspace.yaml');
  if (fs.existsSync(yamlPath)) {
    const raw = fs.readFileSync(yamlPath, 'utf-8');
    // Minimal yaml parser: pull lines under "packages:"
    const globs: string[] = [];
    let inPackages = false;
    for (const line of raw.split('\n')) {
      if (/^packages\s*:/.test(line)) {
        inPackages = true;
        continue;
      }
      if (inPackages) {
        const match = line.match(/^\s+-\s+['"]?([^'"#\s]+)['"]?/);
        if (match) {
          globs.push(match[1]);
        } else if (/^\S/.test(line) && line.trim() !== '') {
          // New top-level key — stop
          break;
        }
      }
    }
    if (globs.length > 0) return globs;
  }

  // Fall back to package.json workspaces field
  const rootPkg = readJson(path.join(ROOT, 'package.json'));
  if (rootPkg && Array.isArray(rootPkg.workspaces)) {
    return rootPkg.workspaces as string[];
  }

  return [];
}

function expandGlob(pattern: string): string[] {
  // Pattern is like "apps/*" or "packages/*" — no deep wildcards needed here.
  // Strip trailing "/*" and list immediate children.
  const base = pattern.replace(/\/\*$/, '');
  const dir = path.join(ROOT, base);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name));
}

function discoverPackages(): Array<{ name: string; location: string; scripts: Record<string, string> }> {
  const globs = readWorkspaceGlobs();
  const packages: Array<{ name: string; location: string; scripts: Record<string, string> }> = [];

  for (const glob of globs) {
    const dirs = expandGlob(glob);
    for (const dir of dirs) {
      const pkgJsonPath = path.join(dir, 'package.json');
      const pkg = readJson(pkgJsonPath);
      if (!pkg) continue;
      const name = typeof pkg.name === 'string' ? pkg.name : path.basename(dir);
      const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
      packages.push({ name, location: dir, scripts });
    }
  }

  return packages;
}

function checkDist(location: string): CheckResult {
  return fs.existsSync(path.join(location, 'dist')) ? 'pass' : 'fail';
}

function runPnpmFilter(pkgName: string, scriptName: string): { result: CheckResult; detail: string } {
  try {
    execSync(`pnpm --filter "${pkgName}" run ${scriptName} --if-present`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 60_000,
    });
    return { result: 'pass', detail: '' };
  } catch (err: unknown) {
    const detail =
      err instanceof Error && 'stderr' in err
        ? String((err as NodeJS.ErrnoException & { stderr?: Buffer }).stderr ?? '').trim().slice(0, 200)
        : String(err).slice(0, 200);
    return { result: 'fail', detail };
  }
}

// ---------------------------------------------------------------------------
// Table renderer
// ---------------------------------------------------------------------------

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
};

function colorResult(r: CheckResult): string {
  switch (r) {
    case 'pass':
      return `${COLORS.green}PASS${COLORS.reset}`;
    case 'fail':
      return `${COLORS.red}FAIL${COLORS.reset}`;
    case 'skip':
      return `${COLORS.yellow}SKIP${COLORS.reset}`;
    case 'error':
      return `${COLORS.red}ERR ${COLORS.reset}`;
  }
}

function printTable(rows: PackageStatus[]): void {
  const COL_NAME = Math.max(20, ...rows.map((r) => r.name.length)) + 2;
  const COL_LOC = Math.max(20, ...rows.map((r) => r.location.replace(ROOT + path.sep, '').length)) + 2;
  const COL_CHECK = 6;

  const header =
    `${COLORS.bold}` +
    'Package'.padEnd(COL_NAME) +
    'Location'.padEnd(COL_LOC) +
    'dist/'.padEnd(COL_CHECK) +
    'lint'.padEnd(COL_CHECK) +
    'test'.padEnd(COL_CHECK) +
    `${COLORS.reset}`;

  const divider = '-'.repeat(COL_NAME + COL_LOC + COL_CHECK * 3);

  console.log();
  console.log(`${COLORS.cyan}${COLORS.bold}TiltCheck Workspace Health${COLORS.reset}`);
  console.log(divider);
  console.log(header);
  console.log(divider);

  for (const row of rows) {
    const loc = row.location.replace(ROOT + path.sep, '').replace(ROOT + '/', '');
    const line =
      row.name.padEnd(COL_NAME) +
      loc.padEnd(COL_LOC) +
      colorResult(row.dist).padEnd(COL_CHECK + 9) +  // +9 for ANSI escape codes
      colorResult(row.lint).padEnd(COL_CHECK + 9) +
      colorResult(row.test).padEnd(COL_CHECK + 9);
    console.log(line);

    // Show failure details inline, indented
    if (row.lintDetail) {
      console.log(`${COLORS.dim}  lint: ${row.lintDetail.split('\n')[0]}${COLORS.reset}`);
    }
    if (row.testDetail) {
      console.log(`${COLORS.dim}  test: ${row.testDetail.split('\n')[0]}${COLORS.reset}`);
    }
  }

  console.log(divider);

  // Summary counts
  const counts = { pass: 0, fail: 0, skip: 0 };
  for (const row of rows) {
    for (const check of [row.dist, row.lint, row.test] as CheckResult[]) {
      if (check === 'pass') counts.pass++;
      else if (check === 'fail') counts.fail++;
      else if (check === 'skip') counts.skip++;
    }
  }
  console.log(
    `${COLORS.bold}Summary:${COLORS.reset}  ` +
      `${COLORS.green}${counts.pass} pass${COLORS.reset}  ` +
      `${COLORS.red}${counts.fail} fail${COLORS.reset}  ` +
      `${COLORS.yellow}${counts.skip} skip${COLORS.reset}` +
      `  (${rows.length} packages)\n`,
  );
}

// ---------------------------------------------------------------------------
// Parallel check runner
// ---------------------------------------------------------------------------

async function checkPackage(
  pkg: { name: string; location: string; scripts: Record<string, string> },
  { runLint, runTest }: { runLint: boolean; runTest: boolean },
): Promise<PackageStatus> {
  // Run all three checks concurrently
  const [distResult, lintResult, testResult] = await Promise.all([
    // dist check is sync but wrap for consistency
    Promise.resolve(checkDist(pkg.location)),

    // lint
    (async (): Promise<{ result: CheckResult; detail: string }> => {
      if (!runLint || !('lint' in pkg.scripts)) {
        return { result: 'skip', detail: '' };
      }
      return runPnpmFilter(pkg.name, 'lint');
    })(),

    // test
    (async (): Promise<{ result: CheckResult; detail: string }> => {
      if (!runTest || !('test' in pkg.scripts)) {
        return { result: 'skip', detail: '' };
      }
      return runPnpmFilter(pkg.name, 'test');
    })(),
  ]);

  return {
    name: pkg.name,
    location: pkg.location,
    dist: distResult,
    lint: lintResult.result,
    test: testResult.result,
    lintDetail: lintResult.detail || undefined,
    testDetail: testResult.detail || undefined,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    filter: { type: 'string', short: 'f' },
    'skip-lint': { type: 'boolean', default: false },
    'skip-test': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
  strict: false,
});

if (args.help) {
  console.log(`
Usage: npx tsx scripts/workspace-status.ts [options]

Options:
  --filter, -f <pattern>  Only check packages whose name contains <pattern>
  --skip-lint             Do not run lint checks
  --skip-test             Do not run test checks
  --help, -h              Show this help message
`);
  process.exit(0);
}

const runLint = !args['skip-lint'];
const runTest = !args['skip-test'];
const filterPattern = typeof args.filter === 'string' ? args.filter : null;

console.log(`\nDiscovering workspace packages from ${path.relative(process.cwd(), path.join(ROOT, 'pnpm-workspace.yaml'))}...`);

const allPackages = discoverPackages();

const filtered = filterPattern
  ? allPackages.filter((p) => p.name.includes(filterPattern) || p.location.includes(filterPattern))
  : allPackages;

if (filtered.length === 0) {
  console.error('No packages matched. Check your --filter value or workspace config.');
  process.exit(1);
}

console.log(`Checking ${filtered.length} package(s) in parallel...`);
if (!runLint) console.log('  lint: skipped (--skip-lint)');
if (!runTest) console.log('  test: skipped (--skip-test)');

const statuses = await Promise.all(
  filtered.map((pkg) => checkPackage(pkg, { runLint, runTest })),
);

// Sort: failures first, then by name
statuses.sort((a, b) => {
  const aFail = [a.dist, a.lint, a.test].includes('fail') ? 0 : 1;
  const bFail = [b.dist, b.lint, b.test].includes('fail') ? 0 : 1;
  if (aFail !== bFail) return aFail - bFail;
  return a.name.localeCompare(b.name);
});

printTable(statuses);

// Exit with non-zero if any failures
const hasFail = statuses.some((s) => s.dist === 'fail' || s.lint === 'fail' || s.test === 'fail');
process.exit(hasFail ? 1 : 0);
