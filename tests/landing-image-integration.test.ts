import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const HTML_PATH = path.resolve(__dirname, '../services/landing/public/index.html');

describe('Landing page image integration', () => {
  const html = readFileSync(HTML_PATH, 'utf8');
  const dom = new JSDOM(html);
  const { document } = dom.window;

  it('renders 8 tool icons with alt text and lazy loading', () => {
    const toolIcons = Array.from(document.querySelectorAll('.tool-card img.tool-icon'));
    expect(toolIcons.length).toBe(8);
    toolIcons.forEach(img => {
      const alt = img.getAttribute('alt');
      expect(alt && alt.length).toBeGreaterThan(0);
      expect(img.getAttribute('loading')).toBe('lazy');
    });
  });

  it('renders feature icons with alt text and lazy loading', () => {
    const featureIcons = Array.from(document.querySelectorAll('.feature-item img.feature-icon'));
    expect(featureIcons.length).toBeGreaterThanOrEqual(8);
    featureIcons.forEach(img => {
      const alt = img.getAttribute('alt');
      expect(alt && alt.length).toBeGreaterThan(0);
      expect(img.getAttribute('loading')).toBe('lazy');
    });
  });

  it('has a decorative hero background image with empty alt (non-informational)', () => {
    const heroBg = document.querySelector('.hero img.hero-bg-img');
    expect(heroBg).toBeTruthy();
    expect(heroBg?.getAttribute('alt')).toBe('');
  });
});
