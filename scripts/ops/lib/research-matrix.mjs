/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 */

/**
 * @typedef {'yes'|'no'|'partial'|'unknown'} CellValue
 * @typedef {{ value: CellValue, url: string|null }} Cell
 * @typedef {Record<string, Record<string, Cell>>} Matrix
 * @typedef {{ competitor: string, axis: string, url: string|null }} Gap
 * @typedef {{ key: string, title: string, description: string, priority: number, labels: string[] }} ProposedTask
 */

/**
 * @param {string[] | Record<string, string[]>} axisHints
 * @returns {string[]}
 */
function normalizeHints(axisHints) {
  if (Array.isArray(axisHints)) {
    return axisHints.filter(Boolean).map((hint) => String(hint));
  }

  if (!axisHints || typeof axisHints !== 'object') {
    return [];
  }

  return Object.values(axisHints)
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter(Boolean)
    .map((hint) => String(hint));
}

/**
 * @param {string} html
 * @param {string[] | Record<string, string[]>} axisHints
 * @returns {CellValue}
 */
export function scorePage(html, axisHints) {
  const text = String(html || '').toLowerCase();
  if (!text.trim()) {
    return 'unknown';
  }

  const hints = normalizeHints(axisHints).map((hint) => hint.toLowerCase());
  if (hints.length === 0) {
    return 'unknown';
  }

  const hits = hints.filter((hint) => text.includes(hint)).length;
  if (hits === 0) {
    return 'unknown';
  }

  if (hits === hints.length) {
    return 'yes';
  }

  return 'partial';
}

/**
 * @param {{ name: string, url: string|null, ok: boolean, html: string }[]} results
 * @param {string[]} axes
 * @param {Record<string, string[]>} axisHints
 * @returns {Matrix}
 */
export function buildMatrix(results, axes, axisHints) {
  /** @type {Matrix} */
  const matrix = {};

  for (const row of results) {
    matrix[row.name] = {};

    for (const axis of axes) {
      if (!row.ok || !row.html) {
        matrix[row.name][axis] = { value: 'unknown', url: row.url ?? null };
        continue;
      }

      matrix[row.name][axis] = {
        value: scorePage(row.html, axisHints?.[axis] ?? []),
        url: row.url ?? null,
      };
    }
  }

  return matrix;
}

/**
 * @param {Matrix} matrix
 * @returns {Gap[]}
 */
export function gapsFromMatrix(matrix) {
  /** @type {Gap[]} */
  const gaps = [];

  for (const [competitor, axes] of Object.entries(matrix)) {
    for (const [axis, cell] of Object.entries(axes)) {
      if (cell?.value === 'unknown') {
        gaps.push({
          competitor,
          axis,
          url: cell.url ?? null,
        });
      }
    }
  }

  return gaps;
}

/**
 * @param {string} value
 * @returns {string}
 */
function slugPart(value) {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * @param {Gap[]} gaps
 * @param {string} date
 * @param {number} [max=5]
 * @returns {ProposedTask[]}
 */
export function proposedTasksFromGaps(gaps, date, max = 5) {
  const limit = Math.max(0, Math.min(5, Number(max) || 5));

  return gaps.slice(0, limit).map((gap) => ({
    key: `RES-${date}-${slugPart(gap.competitor)}-${slugPart(gap.axis)}`,
    title: `Fill research gap: ${gap.competitor} / ${gap.axis}`,
    description: `Gap from research brief ${date}: ${gap.axis}=unknown. Source: ${gap.url || 'none'}.`,
    priority: 3,
    labels: ['RESEARCH'],
  }));
}
