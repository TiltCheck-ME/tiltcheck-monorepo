#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 *
 * Lightweight Markdown → HTML converter for TiltCheck docs / GitHub Pages.
 * No external deps; supports:
 *  - YAML frontmatter (skipped in body)
 *  - Headings (# .. ######)
 *  - Paragraphs / blank line separation
 *  - Unordered lists (-, *)
 *  - Inline code (`code`)
 *  - Code fences ```lang ... ``` (lang is optional)
 *  - Bold **text** and emphasis *text*
 *  - Links [text](url)
 *
 * Usage:
 *   node scripts/convert-markdown.js [sourceDir] [outDir]
 * Defaults:
 *   sourceDir = docs/tiltcheck
 *   outDir = out/docs
 *
 * Project Pages (github.io/<repo>/) require relative asset paths — never "/styles/...".
 */
import fs from 'fs';
import path from 'path';

const sourceRoot = path.resolve(process.argv[2] || 'docs/tiltcheck');
const outRoot = path.resolve(process.argv[3] || 'out/docs');
const FOOTER = 'Made for Degens. By Degens.';
const COPYRIGHT = '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.';
const SITE_URL = 'https://tiltcheck.me';
const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';
const KOFI_URL = 'https://ko-fi.com/jmenichole0';
const SITE_HERO_HEADLINE = 'STOP GIVING WINS BACK.';
const SITE_ONE_LINER =
  'Read-only browser guardrail. Watches pacing and tilt in real time — pulls you out before you rug yourself.';

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet"/>`;

function slugify(name) {
  return name
    .replace(/^\d+[a-z]?-/, '')
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function stripFrontmatter(md) {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  if (end === -1) return md;
  return md.slice(end + 4).replace(/^\s*\n/, '');
}

function renderMarkdown(md) {
  const lines = stripFrontmatter(md).split(/\r?\n/);
  const out = [];
  let inCode = false;
  let codeLang = '';
  let listOpen = false;

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '    ');
    const fenceMatch = line.match(/^```(.*)$/);
    if (fenceMatch) {
      if (!inCode) {
        inCode = true;
        codeLang = fenceMatch[1].trim();
        out.push(`<pre class="code-block" data-lang="${escapeHtml(codeLang)}"><code>`);
      } else {
        inCode = false;
        codeLang = '';
        out.push('</code></pre>');
      }
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }
    if (/^\s*$/.test(line)) {
      if (listOpen) {
        out.push('</ul>');
        listOpen = false;
      }
      out.push('');
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }
    const list = line.match(/^[-*]\s+(.*)$/);
    if (list) {
      if (!listOpen) {
        out.push('<ul>');
        listOpen = true;
      }
      out.push(`<li>${inline(list[1].trim())}</li>`);
      continue;
    }
    out.push(`<p>${inline(line.trim())}</p>`);
  }
  if (listOpen) out.push('</ul>');
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

function inline(str) {
  str = str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`);
  str = str.replace(/\*\*([^*]+)\*\*/g, (_, t) => `<strong>${escapeHtml(t)}</strong>`);
  str = str.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, (_, pre, t) => `${pre}<em>${escapeHtml(t)}</em>`);
  str = str.replace(/`([^`]+)`/g, (_, t) => `<code>${escapeHtml(t)}</code>`);
  return str;
}

function extractMeta(md) {
  let title = '';
  let description = '';
  const body = stripFrontmatter(md);
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) title = heading[1].trim();
  const plain = body.replace(/```[\s\S]*?```/g, '');
  for (const line of plain.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('<!--')) continue;
    if (/^©|^Copyright\b|^All Rights Reserved/i.test(trimmed)) continue;
    if (/^Last Updated:/i.test(trimmed)) continue;
    description = trimmed;
    break;
  }
  return { title: title || 'Untitled', description: description.slice(0, 180) };
}

function sortKey(file) {
  const base = path.basename(file, '.md');
  const match = base.match(/^(\d+)([a-z]?)/i);
  if (match) {
    return `${match[1].padStart(4, '0')}${match[2] || ' '}-${base}`;
  }
  return `9999-${base.toLowerCase()}`;
}

/** @param {'root' | 'docs'} depth */
function assetHref(depth, file) {
  return depth === 'root' ? `styles/${file}` : `../styles/${file}`;
}

/** @param {'root' | 'docs'} depth */
function navHtml(depth, current) {
  const home = depth === 'root' ? 'index.html' : '../index.html';
  const specs = depth === 'root' ? 'docs/index.html' : 'index.html';
  const homeCurrent = current === 'home' ? ' aria-current="page"' : '';
  const specsCurrent = current === 'specs' ? ' aria-current="page"' : '';
  return `<nav class="site-nav" aria-label="Primary">
  <a class="site-nav__brand" href="${home}"${homeCurrent}><span class="site-nav__mark" aria-hidden="true">TC</span>TiltCheck</a>
  <div class="site-nav__links">
    <a href="${SITE_URL}">tiltcheck.me</a>
    <a href="${specs}"${specsCurrent}>Specs</a>
    <a href="${DISCORD_URL}" rel="noopener noreferrer">Discord</a>
    <a href="${KOFI_URL}" rel="noopener noreferrer">Support</a>
  </div>
</nav>`;
}

function footerHtml() {
  return `<footer class="site-footer"><span class="site-footer__tag">${FOOTER}</span>${COPYRIGHT}</footer>`;
}

function shell({ title, description, depth, current, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="theme-color" content="#06080b"/>
${FONT_LINKS}
<link rel="stylesheet" href="${assetHref(depth, 'base.css')}"/>
</head>
<body>
${navHtml(depth, current)}
${body}
${footerHtml()}
</body>
</html>`;
}

function buildPage({ title, description, body }) {
  const content = `<header class="doc-hero"><div class="doc-hero__inner">
<p class="doc-hero__crumb">Specs / ${escapeHtml(title)}</p>
<h1>${escapeHtml(title)}</h1>
<p class="lede">${escapeHtml(description)}</p>
</div></header>
<main class="doc-main" id="content">${body}</main>`;

  return shell({
    title: `${title} - TiltCheck`,
    description,
    depth: 'docs',
    current: 'specs',
    body: content,
  });
}

function buildIndexPage(entries) {
  const listHtml = entries
    .map(
      (e) =>
        `<li><a href="${e.slug}.html"><strong>${escapeHtml(e.title)}</strong><span class="spec-list__desc">${escapeHtml(e.description)}</span></a></li>`,
    )
    .join('\n');

  const content = `<header class="doc-hero"><div class="doc-hero__inner">
<p class="doc-hero__crumb">TiltCheck / Specs</p>
<h1>Ecosystem specs</h1>
<p class="lede">Static mirror of <code>docs/tiltcheck/</code>. Production product lives at <a href="${SITE_URL}">tiltcheck.me</a>.</p>
</div></header>
<main class="doc-main">
<ul class="spec-list">${listHtml}</ul>
</main>`;

  return shell({
    title: 'TiltCheck Specs',
    description: 'TiltCheck ecosystem specifications and architecture docs',
    depth: 'docs',
    current: 'specs',
    body: content,
  });
}

function buildRootLanding(entries) {
  const listHtml = entries
    .slice(0, 12)
    .map(
      (e) =>
        `<li><a href="docs/${e.slug}.html"><strong>${escapeHtml(e.title)}</strong><span class="spec-list__desc">${escapeHtml(e.description)}</span></a></li>`,
    )
    .join('\n');

  const moreLink =
    entries.length > 12
      ? `<p class="section__lede" style="margin-top:1.25rem"><a href="docs/index.html">See all ${entries.length} specs →</a></p>`
      : `<p class="section__lede" style="margin-top:1.25rem"><a href="docs/index.html">Browse all specs →</a></p>`;

  const content = `<section class="landing-hero" aria-label="TiltCheck">
  <div class="landing-hero__inner">
    <p class="brand-wordmark">Tilt<span>Check</span></p>
    <h1 class="landing-hero__headline">${escapeHtml(SITE_HERO_HEADLINE)}</h1>
    <p class="landing-hero__lede">${escapeHtml(SITE_ONE_LINER)}</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="${SITE_URL}">Open tiltcheck.me</a>
      <a class="btn btn-ghost" href="${DISCORD_URL}" rel="noopener noreferrer">Join Discord</a>
      <a class="btn btn-ghost" href="${KOFI_URL}" rel="noopener noreferrer">Support on Ko-fi</a>
    </div>
  </div>
</section>
<section class="section section--specs" id="specs" aria-label="Specs">
  <div class="section__inner">
    <span class="section__eyebrow">Docs mirror</span>
    <h2 class="section__title">Specs without Railway</h2>
    <p class="section__lede">Same brand chrome. Static HTML from the monorepo — share this link when the app host is down or you just need architecture notes.</p>
    <ul class="spec-list">${listHtml}</ul>
    ${moreLink}
  </div>
</section>`;

  return shell({
    title: 'TiltCheck | Specs Mirror',
    description: SITE_ONE_LINER,
    depth: 'root',
    current: 'home',
    body: content,
  });
}

function run() {
  if (!fs.existsSync(sourceRoot)) {
    console.error('Source directory missing:', sourceRoot);
    process.exit(1);
  }

  const siteRoot = path.dirname(outRoot);
  fs.mkdirSync(outRoot, { recursive: true });
  fs.mkdirSync(siteRoot, { recursive: true });

  const files = fs
    .readdirSync(sourceRoot)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  const indexEntries = [];

  for (const file of files) {
    const full = path.join(sourceRoot, file);
    const raw = fs.readFileSync(full, 'utf-8');
    const slug = slugify(file);
    const meta = extractMeta(raw);
    const body = renderMarkdown(raw);
    const html = buildPage({ title: meta.title, description: meta.description, body });
    fs.writeFileSync(path.join(outRoot, `${slug}.html`), html);
    indexEntries.push({ slug, title: meta.title, description: meta.description });
  }

  fs.writeFileSync(path.join(outRoot, 'index.html'), buildIndexPage(indexEntries));
  fs.writeFileSync(path.join(siteRoot, 'index.html'), buildRootLanding(indexEntries));
  fs.writeFileSync(path.join(siteRoot, '.nojekyll'), '');

  console.log(`Converted ${files.length} markdown files to HTML in ${outRoot}`);
}

run();
