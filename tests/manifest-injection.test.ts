import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const HTML_PATH = path.resolve(__dirname, '../services/landing/public/index.html');
const MANIFEST_PATH = path.resolve(__dirname, '../services/landing/public/images-manifest.json');

describe('Manifest-driven icon injection scaffolding', () => {
  const html = readFileSync(HTML_PATH, 'utf8');
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const dom = new JSDOM(html);
  const { document } = dom.window;

  it('has data-tool attributes matching manifest keys', () => {
    const cards = Array.from(document.querySelectorAll('.tool-card[data-tool]'));
    const keys = cards.map(c => c.getAttribute('data-tool'));
    keys.forEach(k => expect(Object.keys(manifest.tools)).toContain(k));
  });

  it('tool icons initially have no src (dynamic injection expected)', () => {
    const imgs = Array.from(document.querySelectorAll('.tool-card[data-tool] img.tool-icon'));
    imgs.forEach(img => {
      expect(img.getAttribute('src')).toBeNull();
    });
  });
});
