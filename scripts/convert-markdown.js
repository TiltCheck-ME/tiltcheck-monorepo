#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 *
 * Lightweight Markdown → HTML converter for TiltCheck docs / GitHub Pages.
 * Root `/` is a static product twin of tiltcheck.me. Specs live under `/docs`.
 *
 * Project Pages (github.io/<repo>/) require relative asset paths — never "/styles/...".
 *
 * Usage:
 *   node scripts/convert-markdown.js [sourceDir] [outDir]
 * Defaults:
 *   sourceDir = docs/tiltcheck
 *   outDir = out/docs
 */
import fs from 'fs';
import path from 'path';

const sourceRoot = path.resolve(process.argv[2] || 'docs/tiltcheck');
const outRoot = path.resolve(process.argv[3] || 'out/docs');
const FOOTER = 'Made for Degens. By Degens.';
const COPYRIGHT = '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.';
const SITE_URL = 'https://tiltcheck.me';
const EXTENSION_URL = `${SITE_URL}/extension`;
const CASINOS_URL = `${SITE_URL}/casinos`;
const OPERATORS_URL = `${SITE_URL}/operators`;
const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';
const KOFI_URL = 'https://ko-fi.com/jmenichole0';
const SITE_HERO_HEADLINE = 'House always wins? FUCK THAT.';
const SITE_ONE_LINER =
  'Read-only browser guardrail. Watches pacing and tilt in real time — pulls you out before you rug yourself.';

const CORE_JOBS = [
  {
    step: '01',
    title: 'Kill the Auto-Pilot',
    description: 'Tracks click-speed and bet pacing. Wakes you up when you play like a bot.',
  },
  {
    step: '02',
    title: 'Read the Room',
    description: 'Flags sus pacing and pressure loops while you are still in the session.',
  },
  {
    step: '03',
    title: 'Enforce the Exit',
    description: 'Set your line. We enforce it — not passive warnings.',
  },
];

const OPERATOR_BULLETS = [
  'Trust scoring as a service — non-affiliated, evidence-backed.',
  'RGaaS API for session guardrails without custodial flows.',
  'Sandbox access for operators who want tilt signals, not affiliate spam.',
];

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
    description = trimmed
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1$2')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
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

/** @param {'root' | 'docs'} depth @param {'home' | 'specs'} current */
function navHtml(depth, current) {
  const home = depth === 'root' ? 'index.html' : '../index.html';
  const specs = depth === 'root' ? 'docs/index.html' : 'index.html';
  const homeCurrent = current === 'home' ? ' aria-current="page"' : '';
  const specsCurrent = current === 'specs' ? ' aria-current="page"' : '';
  return `<nav class="site-nav" aria-label="Primary">
  <a class="site-nav__brand" href="${home}"${homeCurrent}><span class="site-nav__mark" aria-hidden="true">TC</span>TiltCheck</a>
  <div class="site-nav__links">
    <a href="${EXTENSION_URL}">Extension</a>
    <a href="${CASINOS_URL}">Casinos</a>
    <a href="${DISCORD_URL}" rel="noopener noreferrer">Discord</a>
    <a href="${specs}"${specsCurrent}>Specs</a>
  </div>
</nav>`;
}

function footerHtml(depth) {
  const specs = depth === 'root' ? 'docs/index.html' : 'index.html';
  return `<footer class="site-footer">
  <span class="site-footer__tag">${FOOTER}</span>
  <div class="site-footer__links">
    <a href="${SITE_URL}">tiltcheck.me</a>
    <a href="${specs}">Specs</a>
    <a href="${KOFI_URL}" rel="noopener noreferrer">Support</a>
  </div>
  ${COPYRIGHT}
</footer>`;
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
${footerHtml(depth)}
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
<p class="lede">Static mirror of <code>docs/tiltcheck/</code>. The product lives at <a href="${SITE_URL}">tiltcheck.me</a>.</p>
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

function buildRootLanding() {
  const jobsHtml = CORE_JOBS.map(
    (job) => `<article class="public-page-card">
  <p class="public-page-card__eyebrow">Step ${escapeHtml(job.step)}</p>
  <h3 class="public-page-card__title">${escapeHtml(job.title)}</h3>
  <p class="public-page-card__copy">${escapeHtml(job.description)}</p>
</article>`,
  ).join('\n');

  const operatorList = OPERATOR_BULLETS.map((b) => `<li>${escapeHtml(b)}</li>`).join('\n');

  const content = `<main class="landing-page">
  <section class="hero-surface" aria-label="TiltCheck">
    <div class="landing-shell landing-hero-centered">
      <p class="brand-wordmark">Tilt<span>Check</span></p>
      <span class="brand-eyebrow">Built for Degens. By Degens.</span>
      <h1 class="landing-hero-title landing-hero-title--centered">${escapeHtml(SITE_HERO_HEADLINE)}</h1>
      <p class="landing-hero-subtitle landing-hero-subtitle--centered">${escapeHtml(SITE_ONE_LINER)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="${EXTENSION_URL}">Install the Extension</a>
        <a class="hero-actions__secondary-link" href="${CASINOS_URL}">Check Casino Trust</a>
      </div>
    </div>
  </section>

  <section class="public-page-section" aria-label="Three jobs">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Three jobs</span>
        <h2 class="public-page-section-heading__title">Protect the bankroll.</h2>
      </div>
      <div class="public-page-grid public-page-grid--3">
        ${jobsHtml}
      </div>
    </div>
  </section>

  <section class="public-page-section" aria-label="Operators">
    <div class="landing-shell">
      <article class="public-page-card">
        <span class="brand-eyebrow">For platforms / operators</span>
        <h2 class="public-page-section-heading__title">Trust scoring as a service. Non-affiliated. RGaaS API.</h2>
        <ul class="public-page-card__copy public-page-card__copy--list">
          ${operatorList}
        </ul>
        <div style="margin-top:1.5rem">
          <a class="btn btn-primary" href="${OPERATORS_URL}">Get Sandbox Access</a>
        </div>
      </article>
    </div>
  </section>

  <section class="public-page-section" aria-label="Responsible gambling">
    <div class="landing-shell">
      <p class="rg-disclaimer">
        Not a casino, not a bank, not financial advice. Problem gambling help:
        <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">NCPG.org</a>
        or <strong>1-800-GAMBLER</strong>.
      </p>
    </div>
  </section>
</main>`;

  return shell({
    title: 'TiltCheck | The Degen Audit Layer',
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
  fs.writeFileSync(path.join(siteRoot, 'index.html'), buildRootLanding());
  fs.writeFileSync(path.join(siteRoot, '.nojekyll'), '');

  console.log(`Converted ${files.length} markdown files to HTML in ${outRoot}`);
}

run();
