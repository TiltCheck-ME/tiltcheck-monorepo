/**
 * Testimonials Form Disabled State Tests
 * 
 * Tests to verify feedback form is properly disabled until Discord channel is live.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs/promises';
import path from 'path';

const TESTIMONIALS_PATH = path.join(process.cwd(), 'services/landing/public/testimonials.html');

describe('Testimonials Page', () => {
  let dom;
  let document;
  let html;

  beforeAll(async () => {
    html = await fs.readFile(TESTIMONIALS_PATH, 'utf8');
    dom = new JSDOM(html);
    document = dom.window.document;
  });

  describe('Feedback Form Disabled State', () => {
    it('should have disabled attribute on form', () => {
      const form = document.querySelector('#feedback-form');
      expect(form).toBeTruthy();
      expect(form.getAttribute('aria-disabled')).toBe('true');
    });

    it('should have disabled textarea', () => {
      const textarea = document.querySelector('#fb-message');
      
      expect(textarea).toBeTruthy();
      expect(textarea.hasAttribute('disabled')).toBe(true);
    });

    it('should have disabled submit button', () => {
      const submitBtn = document.querySelector('#feedback-form button[type="submit"]');
      expect(submitBtn).toBeTruthy();
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
    });

    it('should display notice about Discord channel requirement', () => {
      const formSection = document.querySelector('[aria-labelledby="feedback-heading"]');
      expect(formSection).toBeTruthy();
      
      const text = formSection.textContent.toLowerCase();
      expect(text).toContain('discord');
      expect(text).toContain('disabled');
    });

    it('should reference correct support channel ID', () => {
      // Should mention the TiltCheck support channel (not JustTheTip channel)
      expect(html).toContain('1441697360785834085');
      expect(html).not.toContain('1437295074856927363');
    });
  });

  describe('Transparency Policy', () => {
    it('should display transparency policy section', () => {
      const policy = document.querySelector('[aria-labelledby="transparency-heading"]');
      expect(policy).toBeTruthy();
    });

    it('should mention no fake testimonials', () => {
      const lowerHtml = html.toLowerCase();
      
      expect(
        lowerHtml.includes('no fabricated') || 
        lowerHtml.includes('authentic') || 
        lowerHtml.includes('no ai-generated') ||
        lowerHtml.includes('no paid endorsements')
      ).toBe(true);
    });

    it('should mention Discord community', () => {
      const lowerHtml = html.toLowerCase();
      expect(lowerHtml.includes('discord')).toBe(true);
    });
  });

  describe('Empty Testimonials Slots', () => {
    it('should have placeholder grid', () => {
      const container = document.querySelector('.placeholder-grid');
      expect(container).toBeTruthy();
    });

    it('should show placeholder cards', () => {
      const cards = document.querySelectorAll('.placeholder-card');
      expect(cards.length).toBeGreaterThan(0);
      
      // Check cards mention "reserved"
      const firstCard = cards[0];
      expect(firstCard.textContent.toLowerCase()).toContain('reserved');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const h1 = document.querySelector('h1');
      expect(h1).toBeTruthy();
      
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have main landmark', () => {
      const main = document.querySelector('main');
      expect(main).toBeTruthy();
    });

    it('should have breadcrumbs navigation', () => {
      const breadcrumbs = document.querySelector('nav[aria-label="Breadcrumb"], .breadcrumbs');
      expect(breadcrumbs).toBeTruthy();
    });

    it('should load breadcrumbs script', () => {
      expect(html).toContain('breadcrumbs.js');
    });
  });
});
