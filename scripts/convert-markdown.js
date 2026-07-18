#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 *
 * GitHub Pages site builder for TiltCheck.
 * - `/` product landing twin
 * - `/extension|casinos|tools|operators.html` product pages
 * - `/docs/*` specs from markdown
 *
 * Project Pages require relative asset paths — never "/styles/...".
 *
 * Usage:
 *   node scripts/convert-markdown.js [sourceDir] [outDir]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SITE_URL,
  DISCORD_URL,
  KOFI_URL,
  EXTENSION_ZIP_URL,
  SITE_HERO_HEADLINE,
  SITE_ONE_LINER,
  CORE_JOBS,
  FEATURE_CARDS,
  EXTENSION_SIGNALS,
  OPERATOR_BULLETS,
  OPERATOR_BENEFITS,
  GRADING_STEPS,
  TOOL_REGISTRY,
  INSTALL_SURFACES,
} from './pages-product-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(process.argv[2] || 'docs/tiltcheck');
const outRoot = path.resolve(process.argv[3] || 'out/docs');
const FOOTER = 'Made for Degens. By Degens.';
const COPYRIGHT = '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.';
const CASINOS_JSON = path.join(repoRoot, 'apps/web/src/data/casinos.json');

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
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

/** @param {'root' | 'docs'} depth */
function href(depth, file) {
  return depth === 'root' ? file : `../${file}`;
}

/** @param {'root' | 'docs'} depth @param {string} current */
function navHtml(depth, current) {
  const links = [
    { id: 'extension', file: 'extension.html', label: 'Extension' },
    { id: 'casinos', file: 'casinos.html', label: 'Casinos' },
    { id: 'tools', file: 'tools.html', label: 'Tools' },
    { id: 'operators', file: 'operators.html', label: 'Operators' },
    { id: 'specs', file: null, label: 'Specs' },
  ];

  const linkHtml = links
    .map((l) => {
      const resolved =
        l.id === 'specs' ? (depth === 'root' ? 'docs/index.html' : 'index.html') : href(depth, l.file);
      const cur = current === l.id ? ' aria-current="page"' : '';
      return `<a href="${resolved}"${cur}>${l.label}</a>`;
    })
    .join('\n    ');

  return `<nav class="site-nav" aria-label="Primary">
  <a class="site-nav__brand" href="${href(depth, 'index.html')}"${current === 'home' ? ' aria-current="page"' : ''}><span class="site-nav__mark" aria-hidden="true">TC</span>TiltCheck</a>
  <div class="site-nav__links">
    ${linkHtml}
    <a href="${DISCORD_URL}" rel="noopener noreferrer">Discord</a>
  </div>
</nav>`;
}

function footerHtml(depth) {
  return `<footer class="site-footer">
  <span class="site-footer__tag">${FOOTER}</span>
  <div class="site-footer__links">
    <a href="${SITE_URL}">tiltcheck.me</a>
    <a href="${href(depth, 'tools.html')}">Tools</a>
    <a href="${depth === 'root' ? 'docs/index.html' : 'index.html'}">Specs</a>
    <a href="${KOFI_URL}" rel="noopener noreferrer">Support</a>
  </div>
  ${COPYRIGHT}
</footer>`;
}

function shell({ title, description, depth, current, body, extraHead = '' }) {
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
${extraHead}
</head>
<body>
${navHtml(depth, current)}
${body}
${footerHtml(depth)}
</body>
</html>`;
}

function productHero({ eyebrow, title, lede, actionsHtml }) {
  return `<header class="product-hero">
  <div class="landing-shell">
    <span class="brand-eyebrow">${escapeHtml(eyebrow)}</span>
    <h1 class="product-hero__title">${escapeHtml(title)}</h1>
    <p class="product-hero__lede">${escapeHtml(lede)}</p>
    ${actionsHtml ? `<div class="hero-actions hero-actions--start">${actionsHtml}</div>` : ''}
  </div>
</header>`;
}

function buildDocPage({ title, description, body }) {
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

function buildDocsIndexPage(entries) {
  const listHtml = entries
    .map(
      (e) =>
        `<li><a href="${e.slug}.html"><strong>${escapeHtml(e.title)}</strong><span class="spec-list__desc">${escapeHtml(e.description)}</span></a></li>`,
    )
    .join('\n');

  const content = `<header class="doc-hero"><div class="doc-hero__inner">
<p class="doc-hero__crumb">TiltCheck / Specs</p>
<h1>Ecosystem specs</h1>
<p class="lede">Static mirror of <code>docs/tiltcheck/</code>. Product pages live on this same Pages site.</p>
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

  const featuresHtml = FEATURE_CARDS.map(
    (card) => `<article class="public-page-card feature-card">
  <p class="public-page-card__eyebrow">${escapeHtml(card.eyebrow)}</p>
  <h3 class="public-page-card__title">${escapeHtml(card.title)}</h3>
  <p class="public-page-card__copy">${escapeHtml(card.description)}</p>
  <a class="feature-card__link" href="${escapeHtml(card.href)}">${escapeHtml(card.cta)} →</a>
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
        <a class="btn btn-primary" href="extension.html">Install the Extension</a>
        <a class="hero-actions__secondary-link" href="casinos.html">Check Casino Trust</a>
      </div>
    </div>
  </section>

  <section class="public-page-section" aria-label="Three jobs">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Three jobs</span>
        <h2 class="public-page-section-heading__title">Protect the bankroll.</h2>
      </div>
      <div class="public-page-grid public-page-grid--3">${jobsHtml}</div>
    </div>
  </section>

  <section class="public-page-section" id="features" aria-label="Tools and features">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Tools / features</span>
        <h2 class="public-page-section-heading__title">What you can open here.</h2>
      </div>
      <div class="public-page-grid public-page-grid--2">${featuresHtml}</div>
    </div>
  </section>

  <section class="public-page-section" aria-label="Operators">
    <div class="landing-shell">
      <article class="public-page-card">
        <span class="brand-eyebrow">For platforms / operators</span>
        <h2 class="public-page-section-heading__title">Trust scoring as a service. Non-affiliated. RGaaS API.</h2>
        <ul class="public-page-card__copy public-page-card__copy--list">${operatorList}</ul>
        <div style="margin-top:1.5rem">
          <a class="btn btn-primary" href="operators.html">Get Sandbox Access</a>
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

function buildExtensionPage() {
  const signals = EXTENSION_SIGNALS.map(
    (s) => `<article class="public-page-card">
  <h2 class="public-page-card__title">${escapeHtml(s.title)}</h2>
  <p class="public-page-card__copy">${escapeHtml(s.body)}</p>
</article>`,
  ).join('\n');

  const actions = `
    <a class="btn btn-primary" href="${EXTENSION_ZIP_URL}">Download the zip</a>
    <a class="hero-actions__secondary-link" href="${SITE_URL}/extension">Open live setup</a>`;

  const content = `${productHero({
    eyebrow: 'Browser extension',
    title: 'TiltCheck lives in the casino tab.',
    lede: 'Runs inside your active session — blocks pressure loops before they cook your account. Sideload beta now; store listing later.',
    actionsHtml: actions,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <article class="public-page-card">
        <p class="public-page-card__eyebrow">Install</p>
        <h2 class="public-page-card__title">Two steps</h2>
        <ol class="public-page-list">
          <li>Download the zip, extract to a folder.</li>
          <li><code>chrome://extensions</code> → Developer mode → Load unpacked → select folder.</li>
        </ol>
        <p class="public-page-card__copy">Then open dashboard setup on tiltcheck.me before a live session.</p>
      </article>
    </div>
  </section>
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Core</span>
        <h2 class="public-page-section-heading__title">What it does.</h2>
      </div>
      <div class="public-page-grid public-page-grid--3">${signals}</div>
    </div>
  </section>
</main>`;

  return shell({
    title: 'Extension | TiltCheck',
    description: 'TiltCheck browser extension — read-only session guardrail in the casino tab.',
    depth: 'root',
    current: 'extension',
    body: content,
  });
}

function gradeClass(grade) {
  const g = String(grade || '').toUpperCase();
  if (g.startsWith('A')) return 'grade-a';
  if (g.startsWith('B')) return 'grade-b';
  if (g.startsWith('C')) return 'grade-c';
  if (g.startsWith('D')) return 'grade-d';
  return 'grade-f';
}

function buildCasinosPage(casinos) {
  const categories = [...new Set(casinos.map((c) => c.category))].sort();
  const cards = casinos
    .map((c) => {
      const slug = String(c.name)
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const live = `${SITE_URL}/casinos/${slug}`;
      return `<article class="casino-card" data-name="${escapeHtml(c.name.toLowerCase())}" data-category="${escapeHtml(c.category)}" data-grade="${escapeHtml(c.grade)}">
  <div class="casino-card__top">
    <span class="casino-card__grade ${gradeClass(c.grade)}">${escapeHtml(c.grade)}</span>
    <span class="casino-card__cat">${escapeHtml(c.category)}</span>
  </div>
  <h3 class="casino-card__name">${escapeHtml(c.name)}</h3>
  <p class="casino-card__risk">Risk: ${escapeHtml(c.risk)}</p>
  <a class="casino-card__link" href="${live}" rel="noopener noreferrer">Full audit on tiltcheck.me →</a>
</article>`;
    })
    .join('\n');

  const filters = ['All', ...categories]
    .map(
      (cat, i) =>
        `<button type="button" class="filter-chip${i === 0 ? ' is-active' : ''}" data-filter="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`,
    )
    .join('\n');

  const steps = GRADING_STEPS.map(
    (s) => `<li><strong>${escapeHtml(s.title)}</strong> — ${escapeHtml(s.body)}</li>`,
  ).join('\n');

  const script = `<script>
(function () {
  var input = document.getElementById('casino-search');
  var chips = document.querySelectorAll('.filter-chip');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.casino-card'));
  var count = document.getElementById('casino-count');
  var activeCat = 'All';
  function apply() {
    var q = (input.value || '').trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var name = card.getAttribute('data-name') || '';
      var cat = card.getAttribute('data-category') || '';
      var okCat = activeCat === 'All' || cat === activeCat;
      var okQ = !q || name.indexOf(q) !== -1;
      var show = okCat && okQ;
      card.hidden = !show;
      if (show) shown += 1;
    });
    if (count) count.textContent = shown + ' operators';
  }
  if (input) input.addEventListener('input', apply);
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      activeCat = chip.getAttribute('data-filter') || 'All';
      apply();
    });
  });
  apply();
})();
</script>`;

  const content = `${productHero({
    eyebrow: 'Casino trust',
    title: 'Look up the operator. Read the proof.',
    lede: `Curated grades for ${casinos.length} operators on this static mirror. Full proof lanes and live RGaaS overlays stay on tiltcheck.me.`,
    actionsHtml: `<a class="btn btn-primary" href="${SITE_URL}/casinos">Open live directory</a>
    <a class="hero-actions__secondary-link" href="tools.html">Related tools</a>`,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="casino-toolbar">
        <label class="casino-search">
          <span class="sr-only">Search casinos</span>
          <input id="casino-search" type="search" placeholder="Search operator name…" autocomplete="off"/>
        </label>
        <div class="filter-row" role="group" aria-label="Category filters">${filters}</div>
        <p class="casino-count" id="casino-count">${casinos.length} operators</p>
      </div>
      <div class="casino-grid">${cards}</div>
    </div>
  </section>
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Methodology</span>
        <h2 class="public-page-section-heading__title">How letter grades are built.</h2>
      </div>
      <ol class="method-list">${steps}</ol>
    </div>
  </section>
</main>
${script}`;

  return shell({
    title: 'Casino Trust | TiltCheck',
    description: 'Curated casino trust grades — static mirror of the TiltCheck directory.',
    depth: 'root',
    current: 'casinos',
    body: content,
  });
}

function buildToolsPage() {
  const install = INSTALL_SURFACES.map(
    (t) => `<article class="public-page-card">
  <p class="public-page-card__eyebrow">${escapeHtml(t.label)}</p>
  <h3 class="public-page-card__title">${escapeHtml(t.title)}</h3>
  <p class="public-page-card__copy">${escapeHtml(t.description)}</p>
  <a class="feature-card__link" href="${SITE_URL}${t.href}">Open install →</a>
</article>`,
  ).join('\n');

  const tools = TOOL_REGISTRY.map(
    (t) => `<article class="public-page-card tool-card">
  <div class="tool-card__meta">
    <p class="public-page-card__eyebrow">${escapeHtml(t.label)}</p>
    <span class="status-pill status-pill--${escapeHtml(t.status)}">${escapeHtml(t.status)}</span>
  </div>
  <h3 class="public-page-card__title">${escapeHtml(t.title)}</h3>
  <p class="public-page-card__copy">${escapeHtml(t.description)}</p>
  <a class="feature-card__link" href="${SITE_URL}${t.href}">Open on tiltcheck.me →</a>
</article>`,
  ).join('\n');

  const content = `${productHero({
    eyebrow: 'TiltCheck Toolkit',
    title: 'Install first. Tools second.',
    lede: 'Static catalog of the toolkit. Interactive verifiers and scanners run on tiltcheck.me — this page is the map.',
    actionsHtml: `<a class="btn btn-primary" href="extension.html">Install extension</a>
    <a class="hero-actions__secondary-link" href="${SITE_URL}/tools">Open live tools</a>`,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Install surfaces</span>
        <h2 class="public-page-section-heading__title">AutoVault setups.</h2>
      </div>
      <div class="public-page-grid public-page-grid--2">${install}</div>
    </div>
  </section>
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Features</span>
        <h2 class="public-page-section-heading__title">The toolkit.</h2>
      </div>
      <div class="public-page-grid public-page-grid--2">${tools}</div>
    </div>
  </section>
</main>`;

  return shell({
    title: 'Tools | TiltCheck',
    description: 'TiltCheck toolkit — verifiers, scanners, vault, and accountability tools.',
    depth: 'root',
    current: 'tools',
    body: content,
  });
}

function buildOperatorsPage() {
  const benefits = OPERATOR_BENEFITS.map(
    (b) => `<article class="public-page-card">
  <h3 class="public-page-card__title">${escapeHtml(b.title)}</h3>
  <p class="public-page-card__copy">${escapeHtml(b.body)}</p>
</article>`,
  ).join('\n');

  const content = `${productHero({
    eyebrow: 'Operators / RGaaS',
    title: 'Sandbox keys for trust signal — not vibes.',
    lede: 'Plug RGaaS into onboarding, trust, or review queues. Free sandbox on the live site. This Pages twin is marketing-only — no key form here.',
    actionsHtml: `<a class="btn btn-primary" href="${SITE_URL}/operators">Request sandbox keys</a>
    <a class="hero-actions__secondary-link" href="${SITE_URL}/operators/pricing">Pricing</a>`,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-grid public-page-grid--3">${benefits}</div>
    </div>
  </section>
  <section class="public-page-section">
    <div class="landing-shell">
      <article class="public-page-card">
        <p class="public-page-card__eyebrow">Pricing snapshot</p>
        <h2 class="public-page-card__title">Free sandbox. Production by review.</h2>
        <p class="public-page-card__copy">Sandbox: mocked responses, capped volume. Production: manual review. Request keys on tiltcheck.me — we do not collect partner emails on GitHub Pages.</p>
        <div style="margin-top:1.25rem">
          <a class="btn btn-primary" href="${SITE_URL}/operators">Go to live operators</a>
        </div>
      </article>
    </div>
  </section>
</main>`;

  return shell({
    title: 'Operators | TiltCheck',
    description: 'TiltCheck RGaaS sandbox — trust scoring API for platforms.',
    depth: 'root',
    current: 'operators',
    body: content,
  });
}

function run() {
  if (!fs.existsSync(sourceRoot)) {
    console.error('Source directory missing:', sourceRoot);
    process.exit(1);
  }
  if (!fs.existsSync(CASINOS_JSON)) {
    console.error('Casinos data missing:', CASINOS_JSON);
    process.exit(1);
  }

  const siteRoot = path.dirname(outRoot);
  fs.mkdirSync(outRoot, { recursive: true });
  fs.mkdirSync(siteRoot, { recursive: true });

  const casinos = JSON.parse(fs.readFileSync(CASINOS_JSON, 'utf-8'));

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
    const html = buildDocPage({ title: meta.title, description: meta.description, body });
    fs.writeFileSync(path.join(outRoot, `${slug}.html`), html);
    indexEntries.push({ slug, title: meta.title, description: meta.description });
  }

  fs.writeFileSync(path.join(outRoot, 'index.html'), buildDocsIndexPage(indexEntries));
  fs.writeFileSync(path.join(siteRoot, 'index.html'), buildRootLanding());
  fs.writeFileSync(path.join(siteRoot, 'extension.html'), buildExtensionPage());
  fs.writeFileSync(path.join(siteRoot, 'casinos.html'), buildCasinosPage(casinos));
  fs.writeFileSync(path.join(siteRoot, 'tools.html'), buildToolsPage());
  fs.writeFileSync(path.join(siteRoot, 'operators.html'), buildOperatorsPage());
  fs.writeFileSync(path.join(siteRoot, '.nojekyll'), '');

  console.log(
    `Built Pages site: ${files.length} specs + product pages (home, extension, casinos[${casinos.length}], tools, operators) → ${siteRoot}`,
  );
}

run();
