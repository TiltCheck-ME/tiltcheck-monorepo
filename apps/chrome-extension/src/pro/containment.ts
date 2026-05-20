/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */

/**
 * DOM roots owned by Core / Pro safety surfaces. Mutation scanners must not
 * sanitize or redact nodes inside these hosts.
 */
export const TILTCHECK_SAFETY_ROOT_IDS = [
  'tiltcheck-lockdown-root',
  'tiltcheck-local-game-block-overlay',
  'tiltcheck-cooldown-overlay',
  'tiltcheck-game-block-overlay',
  'tiltcheck-redeem-nudge',
  'tiltcheck-sidebar',
  'tiltcheck-mobile-license-hud',
] as const;

export function isInsideTiltcheckSafetyRoot(node: Node | null): boolean {
  if (!node || typeof Element === 'undefined' || !(node instanceof Element)) {
    return false;
  }
  for (const id of TILTCHECK_SAFETY_ROOT_IDS) {
    if (node.closest(`#${id}`)) {
      return true;
    }
  }
  return false;
}

/** True when every added/changed node in the batch is inside a safety root. */
export function mutationsOnlyTouchSafetyRoots(mutations: MutationRecord[]): boolean {
  const nodes: Node[] = [];
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      nodes.push(n);
    }
    if (m.target) {
      nodes.push(m.target);
    }
  }
  if (nodes.length === 0) {
    return false;
  }
  return nodes.every((n) => {
    if (typeof Element === 'undefined' || !(n instanceof Element)) {
      return true;
    }
    return isInsideTiltcheckSafetyRoot(n);
  });
}
