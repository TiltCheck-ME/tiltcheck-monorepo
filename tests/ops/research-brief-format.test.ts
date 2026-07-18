/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 */
import { describe, expect, it } from 'vitest';
import { formatBriefMarkdown, formatSidecarJson } from '../../scripts/ops/lib/research-brief-format.mjs';

describe('formatBriefMarkdown', () => {
  it('includes required sections and footer', () => {
    const md = formatBriefMarkdown({
      date: '2026-07-17',
      slug: 'competitor-matrix',
      fetches: [{ url: 'https://example.com', ok: true, status: 200 }],
      matrix: {
        AskGamblers: {
          trust_scoring: { value: 'unknown', url: 'https://example.com' },
        },
      },
      gaps: [{ competitor: 'AskGamblers', axis: 'trust_scoring', url: 'https://example.com' }],
      proposedTasks: [
        {
          key: 'RES-2026-07-17-ASKGAMBLERS-TRUST-SCORING',
          title: 'Fill research gap',
          description: 'Gap',
          priority: 3,
          labels: ['RESEARCH'],
        },
      ],
      mode: 'heuristic',
    });

    expect(md).toContain('## Meta');
    expect(md).toContain('## Feature matrix');
    expect(md).toContain('## Gaps');
    expect(md).toContain('## Proposed tasks');
    expect(md).toContain('Made for Degens. By Degens.');
  });
});

describe('formatSidecarJson', () => {
  it('emits proposedTasks array', () => {
    const side = formatSidecarJson({
      date: '2026-07-17',
      slug: 'competitor-matrix',
      proposedTasks: [{ key: 'RES-1', title: 't', description: 'd', priority: 3, labels: ['RESEARCH'] }],
    });

    expect(side.proposedTasks).toHaveLength(1);
  });
});
