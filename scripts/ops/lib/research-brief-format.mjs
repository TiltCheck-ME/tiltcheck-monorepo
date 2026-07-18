/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
 */

/**
 * @typedef {'yes'|'no'|'partial'|'unknown'} CellValue
 * @typedef {{ value: CellValue, url: string|null }} Cell
 * @typedef {Record<string, Record<string, Cell>>} Matrix
 * @typedef {{ competitor: string, axis: string, url: string|null }} Gap
 * @typedef {{ key: string, title: string, description: string, priority: number, labels: string[] }} ProposedTask
 */

const COPYRIGHT = '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17';
const FOOTER = 'Made for Degens. By Degens.';

/**
 * @param {string} value
 * @returns {string}
 */
function escapeTableCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

/**
 * @param {Matrix} matrix
 * @returns {string[]}
 */
function collectAxes(matrix) {
  /** @type {string[]} */
  const axes = [];
  const seen = new Set();

  for (const cells of Object.values(matrix || {})) {
    for (const axis of Object.keys(cells || {})) {
      if (!seen.has(axis)) {
        seen.add(axis);
        axes.push(axis);
      }
    }
  }

  return axes;
}

/**
 * @param {Matrix} matrix
 * @returns {string}
 */
function renderMatrixTable(matrix) {
  const axes = collectAxes(matrix);

  if (axes.length === 0) {
    return '| Competitor |\n| --- |\n| none |';
  }

  const header = ['Competitor', ...axes];
  const divider = header.map(() => '---');
  const rows = Object.entries(matrix || {}).map(([competitor, cells]) => {
    const values = axes.map((axis) => escapeTableCell(cells?.[axis]?.value ?? 'unknown'));
    return [escapeTableCell(competitor), ...values];
  });

  return [header, divider, ...rows]
    .map((columns) => `| ${columns.join(' | ')} |`)
    .join('\n');
}

/**
 * @param {{ date: string, slug: string, fetches?: Array<{ url: string, ok: boolean, status: number }>, matrix: Matrix, gaps?: Gap[], proposedTasks?: ProposedTask[], mode?: string }} input
 * @returns {string}
 */
export function formatBriefMarkdown(input) {
  const {
    date,
    slug,
    fetches = [],
    matrix = {},
    gaps = [],
    proposedTasks = [],
    mode = 'heuristic',
  } = input;

  const metaLines = [
    `- Date: ${date}`,
    `- Slug: ${slug}`,
    `- Mode: ${mode}`,
    `- Fetch count: ${fetches.length}`,
  ];

  if (fetches.length > 0) {
    metaLines.push('- Sources:');
    for (const fetchMeta of fetches) {
      const sourceState = fetchMeta.ok ? 'ok' : 'failed';
      metaLines.push(`  - ${fetchMeta.url} (${sourceState}, status ${fetchMeta.status})`);
    }
  }

  const gapLines =
    gaps.length > 0
      ? gaps.map((gap) => `- ${gap.competitor} / ${gap.axis}${gap.url ? ` - ${gap.url}` : ''}`)
      : ['- None.'];

  const taskLines =
    proposedTasks.length > 0
      ? proposedTasks.map(
          (task) => `- ${task.key} - ${task.title} (priority ${task.priority}; labels: ${task.labels.join(', ')})`,
        )
      : ['- None.'];

  const sidecar = formatSidecarJson({ date, slug, proposedTasks });
  const taskJson = JSON.stringify(sidecar, null, 2);

  return [
    COPYRIGHT,
    '',
    `# Research brief: ${slug}`,
    '',
    '## Meta',
    ...metaLines,
    '',
    '## Feature matrix',
    renderMatrixTable(matrix),
    '',
    '## Gaps',
    ...gapLines,
    '',
    '## Proposed tasks',
    ...taskLines,
    '',
    '```json',
    taskJson,
    '```',
    '',
    '---',
    FOOTER,
  ].join('\n');
}

/**
 * @param {{ date: string, slug: string, proposedTasks?: ProposedTask[] }} input
 * @returns {{ date: string, slug: string, proposedTasks: ProposedTask[] }}
 */
export function formatSidecarJson(input) {
  return {
    date: input.date,
    slug: input.slug,
    proposedTasks: Array.isArray(input.proposedTasks) ? input.proposedTasks : [],
  };
}
