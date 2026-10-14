// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CTA_READY, SITE_KICKER } from '../scripts/pages-product-data.mjs';

const convertMarkdown = readFileSync(
  path.join(process.cwd(), 'scripts/convert-markdown.js'),
  'utf8',
);

describe('GitHub Pages launch twin', () => {
  it('keeps Pages hero copy in lockstep with the gated zip + degen retort', () => {
    expect(CTA_READY).toBe(false);
    expect(SITE_KICKER[0]).toBe('The house banks on your tilt.');
    expect(SITE_KICKER[1]).toMatch(/Harm reduction made for degens, by degens/i);
    expect(convertMarkdown).toContain('zipCtaHtml()');
    expect(convertMarkdown).toContain('CTA_GATED_LABEL');
    expect(convertMarkdown).toContain('landing-hero-retort');
  });

  it('does not emit a live zip download while the sideload is gated', () => {
    expect(convertMarkdown).toContain('btn-disabled');
    expect(convertMarkdown).not.toContain('href="downloads/tiltcheck-extension.zip" download>DOWNLOAD THE ZIP');
  });
});
