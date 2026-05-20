/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import {
  isInsideTiltcheckSafetyRoot,
  mutationsOnlyTouchSafetyRoots,
} from '../../src/pro/containment.js';

describe('containment safety roots', () => {
  it('detects nodes inside lockdown and local block overlays', () => {
    document.body.innerHTML = `
      <div id="tiltcheck-lockdown-root"><span id="inner">x</span></div>
      <div id="tiltcheck-local-game-block-overlay"></div>
    `;
    expect(isInsideTiltcheckSafetyRoot(document.getElementById('inner')!)).toBe(true);
    expect(isInsideTiltcheckSafetyRoot(document.getElementById('tiltcheck-local-game-block-overlay')!)).toBe(
      true
    );
    expect(isInsideTiltcheckSafetyRoot(document.body)).toBe(false);
  });

  it('treats mutations that only touch safety roots as ignorable', () => {
    const host = document.createElement('div');
    host.id = 'tiltcheck-lockdown-root';
    document.body.appendChild(host);
    const child = document.createElement('p');
    host.appendChild(child);

    const record: MutationRecord = {
      type: 'childList',
      target: host,
      addedNodes: [child] as unknown as NodeList,
      removedNodes: [] as unknown as NodeList,
      previousSibling: null,
      nextSibling: null,
      attributeName: null,
      attributeNamespace: null,
      oldValue: null,
    };

    expect(mutationsOnlyTouchSafetyRoots([record])).toBe(true);
  });
});
