#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03
 *
 * GitHub Pages site builder for TiltCheck.
 * - `/` is the brakes homepage
 * - `/cooldown`, `/casinos`, `/nudges`, `/autovault` are real Pages routes
 * - `/tools/auto-vault` redirects to `/autovault` so the old footer href still lands
 * - `/touch-grass` redirects to `/nudges` so old links and the Pro overlay still land
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
  SITE_H1_LINES,
  SITE_DOPAMINE,
  SITE_KICKER,
  SITE_LEDE,
  SITE_ONE_LINER,
  SITE_META_DESCRIPTION,
  SITE_PRIVACY,
  CTA_READY,
  CTA_LABEL,
  CTA_GATED_LABEL,
  CTA_GATED_HINT,
  SECONDARY_CTAS,
  TERTIARY_LINK,
  INSTALL_EYEBROW,
  INSTALL_TITLE,
  INSTALL_STEPS,
  INSTALL_MOVES,
  INSTALL_NOTE,
  VAULT,
  AUTOVAULT_PAGE,
  LAUNCH_HONESTY,
  WHAT_IT_IS,
  HOW_IT_WORKS,
  CORE_JOBS,
  PROBLEM_SIGNALS,
  FEATURE_CARDS,
  FAQS,
  EXTENSION_SIGNALS,
  GRADING_STEPS,
  TOOL_REGISTRY,
  INSTALL_SURFACES,
  CORE_BRAKES,
} from './pages-product-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(process.argv[2] || 'docs/tiltcheck');
const outRoot = path.resolve(process.argv[3] || 'out/docs');
const FOOTER = 'Made for Degens. By Degens.';
const COPYRIGHT = '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.';
const DISCORD_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link href="https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet"/>`;

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
function dirHref(depth, folder) {
  return depth === 'root' ? `${folder}/` : `../${folder}/`;
}

function navHtml(depth, current) {
  const homeHref = href(depth, 'index.html');
  const homeCurrent = current === 'home' ? ' aria-current="page"' : '';
  const extensionCurrent = current === 'extension' ? ' aria-current="page"' : '';
  const casinosCurrent = current === 'casinos' ? ' aria-current="page"' : '';
  const cooldownCurrent = current === 'cooldown' ? ' aria-current="page"' : '';

  return `<nav class="site-nav" aria-label="Primary">
  <a class="site-nav__brand" href="${homeHref}"${homeCurrent}><span class="site-nav__mark" aria-hidden="true">TC</span>TiltCheck</a>
  <div class="site-nav__links">
    <a href="${href(depth, 'extension.html')}"${extensionCurrent}>Extension</a>
    <a href="${dirHref(depth, 'casinos')}"${casinosCurrent}>Casinos</a>
    <a href="${dirHref(depth, 'cooldown')}"${cooldownCurrent}>Cooldown</a>
    <a class="site-nav__discord" href="${DISCORD_URL}" rel="noopener noreferrer" aria-label="Discord" title="Discord">${DISCORD_ICON}</a>
  </div>
</nav>`;
}

function footerHtml(depth) {
  return `<footer class="site-footer">
  <nav class="site-footer__more" aria-label="More tools">
    <p class="site-footer__more-label">Also</p>
    <div class="site-footer__links">
      <a href="${dirHref(depth, 'autovault')}">AutoVault</a>
      <a href="${dirHref(depth, 'nudges')}">Nudges</a>
    </div>
  </nav>
  <p class="rg-disclaimer">TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call <strong>1-800-GAMBLER</strong> or visit <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">NCPG.org</a>.</p>
  <span class="site-footer__tag">${FOOTER}</span>
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
<p class="lede">Static mirror of <code>docs/tiltcheck/</code>. The public site is the homepage.</p>
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

function zipCtaHtml() {
  if (CTA_READY) {
    // Sideload ungated: href="downloads/tiltcheck-extension.zip" download>DOWNLOAD THE ZIP
    return `<a class="btn btn-primary" href="downloads/tiltcheck-extension.zip" download>${escapeHtml(CTA_LABEL)}</a>`;
  }
  return `<span class="gated-zip-cta"><button type="button" class="btn btn-primary btn-disabled" disabled aria-disabled="true" aria-describedby="gated-zip-why">${escapeHtml(CTA_GATED_LABEL)}</button><span id="gated-zip-why" class="gated-zip-cta__why">${escapeHtml(CTA_GATED_HINT)}</span></span>`;
}

function secondaryCtaHtml() {
  return SECONDARY_CTAS.map(
    (cta) =>
      `<a class="${cta.primary ? 'btn btn-primary' : 'btn btn-secondary'}" href="${escapeHtml(cta.href)}">${escapeHtml(cta.label)}</a>`,
  ).join('\n        ');
}

function buildRootLanding() {
  const moves = INSTALL_MOVES.map(
    (move, index) => `<li class="landing-move">
  <span class="landing-move__num">${String(index + 1).padStart(2, '0')}</span>
  <h3 class="landing-move__title">${escapeHtml(move.title)}</h3>
  <p>${escapeHtml(move.body)}</p>
</li>`,
  ).join('\n');
  const honesty = LAUNCH_HONESTY.map((line) => `<li>${escapeHtml(line)}</li>`).join('\n');
  const brakes = CORE_BRAKES.map(
    (b) => `<li class="landing-brake">
  <span class="landing-brake__num">${escapeHtml(b.num)}</span>
  <h3 class="landing-brake__title">${escapeHtml(b.title)}</h3>
  <p class="landing-brake__body">${escapeHtml(b.body)}</p>
  <span class="landing-brake__status">${escapeHtml(b.status)}</span>
</li>`,
  ).join('\n');

  const content = `<main class="landing-page">
  <section class="landing-hero" aria-label="TiltCheck">
    <div class="landing-hero__copy">
      <p class="brand-wordmark">Tilt<span>Check</span></p>
      <h1 class="landing-hero__title"><span class="landing-hero__title-q">${escapeHtml(SITE_H1_LINES[0])}</span><span class="landing-hero__title-a">${escapeHtml(SITE_H1_LINES[1])}</span></h1>
      <p class="landing-hero__dopamine">${escapeHtml(SITE_DOPAMINE)}</p>
      <p class="landing-hero__kicker">${escapeHtml(SITE_KICKER)}</p>
      <p class="landing-hero__lede">${escapeHtml(SITE_LEDE)}</p>
      <div class="hero-actions landing-hero__actions">
        ${zipCtaHtml()}
        ${secondaryCtaHtml()}
      </div>
      <a class="hero-actions__secondary-link" href="${escapeHtml(TERTIARY_LINK.href)}">${escapeHtml(TERTIARY_LINK.label)}</a>
      <p class="landing-hero__privacy">${escapeHtml(SITE_PRIVACY)}</p>
    </div>
  </section>
  <section class="landing-moves" id="install" aria-label="How it works">
    <p class="landing-moves__eyebrow">${escapeHtml(INSTALL_EYEBROW)}</p>
    <h2 class="landing-moves__title">${escapeHtml(INSTALL_TITLE)}</h2>
    <ol class="landing-moves__list">${moves}</ol>
  </section>
  <section class="landing-brakes" aria-label="The 4 In-Session Brakes">
    <p class="landing-brakes__eyebrow">ACTIVE IN-SESSION DEFENSE</p>
    <h2 class="landing-brakes__title">THE 4 IN-SESSION BRAKES</h2>
    <ul class="landing-brakes__list">${brakes}</ul>
    <div class="landing-calc">
      <div class="landing-calc__inputs">
        <div class="landing-calc__slider-row">
          <label class="landing-calc__label" for="wageSlider">Your Hourly Day-Job Wage: <strong id="wageVal">$25/hr</strong></label>
          <input type="range" id="wageSlider" class="landing-calc__slider" min="15" max="150" value="25" step="5" oninput="updateLandingWage()"/>
        </div>
        <div class="landing-calc__slider-row">
          <label class="landing-calc__label" for="lossSlider">Simulated Session Loss: <strong id="lossVal" style="color:#e63946;">-$300</strong></label>
          <input type="range" id="lossSlider" class="landing-calc__slider" min="50" max="2500" value="300" step="50" oninput="updateLandingWage()"/>
        </div>
      </div>
      <div class="landing-calc__banner">
        <span class="landing-calc__banner-tag">REALITY WAGE CLOCK INTERCEPT</span>
        <p class="landing-calc__banner-lead">Session Down: <span id="calcLossText">-$300.00</span> (<span id="calcHoursText" style="color:#f4a261;">12.0 hours</span> of labor torched)</p>
        <p class="landing-calc__banner-desc" id="calcDescText">That is an entire 8-hour shift plus a half day of hard labor gone. You spent all day working for the house. Close the tab.</p>
      </div>
    </div>
  </section>
  <section class="landing-vault" aria-label="AutoVault">
    <h2 class="landing-vault__title">${escapeHtml(VAULT.title)}</h2>
    <p class="landing-vault__body">${escapeHtml(VAULT.body)}</p>
    <a class="btn btn-secondary" href="${escapeHtml(VAULT.href)}">${escapeHtml(VAULT.ctaLabel)}</a>
  </section>
  <section class="landing-tape" aria-label="Honesty">
    <p class="landing-tape__label">THE FINE PRINT</p>
    <ul class="landing-tape__list">${honesty}</ul>
  </section>
</main>
<script>
function updateLandingWage() {
  var w = parseFloat(document.getElementById('wageSlider').value);
  var l = parseFloat(document.getElementById('lossSlider').value);
  document.getElementById('wageVal').textContent = '$' + w + '/hr';
  document.getElementById('lossVal').textContent = '-$' + l;
  var hrs = (l / w).toFixed(1);
  document.getElementById('calcLossText').textContent = '-$' + l.toFixed(2);
  document.getElementById('calcHoursText').textContent = hrs + ' hours';
  var desc = document.getElementById('calcDescText');
  if (hrs >= 16) {
    desc.textContent = 'That is two full 40-hour work weeks wiped out in one session. Walk away right now.';
  } else if (hrs >= 8) {
    desc.textContent = 'That is an entire 8-hour shift gone. You spent all day working for the house. Close the tab.';
  } else {
    desc.textContent = 'That is ' + hrs + ' hours of your hard labor torched. Respect your time and slow down.';
  }
}
</script>`;

  return shell({
    title: 'TiltCheck | House always wins? FUCK THAT.',
    description: SITE_META_DESCRIPTION,
    depth: 'root',
    current: 'home',
    body: content,
  });
}

function buildHomeRedirect(fileName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0; url=./"/>
<link rel="canonical" href="${SITE_URL}/"/>
<title>TiltCheck</title>
</head>
<body>
<p><a href="./">TiltCheck</a></p>
<!-- ${fileName} retired. Public site is the homepage. -->
</body>
</html>`;
}

function buildExtensionPage() {
  const signals = EXTENSION_SIGNALS.map(
    (s) => `<article class="public-page-card">
  <h2 class="public-page-card__title">${escapeHtml(s.title)}</h2>
  <p class="public-page-card__copy">${escapeHtml(s.body)}</p>
</article>`,
  ).join('\n');

  const actions = `
    ${zipCtaHtml()}
    <a class="hero-actions__secondary-link" href="cooldown/">Set a Cooldown lock</a>`;

  const content = `${productHero({
    eyebrow: 'Browser extension',
    title: 'TiltCheck lives in the casino tab.',
    lede: 'Chrome Core watches supported casino tabs: 2s spin brake, strategic game filters, reality wage HUD, and deposit barrier. Read-only. Zero custody. Download the zip directly.',
    actionsHtml: actions,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell explainer">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Why install</span>
        <h2 class="public-page-section-heading__title">You already know the spiral.</h2>
      </div>
      <p class="explainer__p">Three losses. Bet size climbs. “Im due.” Another deposit. The extension’s job is to notice that pacing while the tab is still open and push the exit you configured when you were still thinking straight.</p>
      <p class="explainer__p">It does not place bets for you. It does not “beat the house.” It is brakes — the same idea as a seatbelt, except for sessions that feel immortal at 2am.</p>
    </div>
  </section>
  <section class="public-page-section">
    <div class="landing-shell">
      <article class="public-page-card">
        <p class="public-page-card__eyebrow">${escapeHtml(INSTALL_EYEBROW)}</p>
        <h2 class="public-page-card__title">${escapeHtml(INSTALL_TITLE)}</h2>
        <ol class="public-page-list">${INSTALL_STEPS.map((step) => `<li>${escapeHtml(step)}</li>`).join('\n')}</ol>
        <p class="public-page-card__copy">${escapeHtml(INSTALL_NOTE)}</p>
      </article>
    </div>
  </section>
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Core</span>
        <h2 class="public-page-section-heading__title">What it does.</h2>
      </div>
      <div class="public-page-grid public-page-grid--2">${signals}</div>
    </div>
  </section>
</main>`;

  return shell({
    title: 'Extension | TiltCheck',
    description: 'Install the TiltCheck Chrome extension — read-only session guardrail that watches tilt and enforces your exit rules.',
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

function buildAuditedShowcase(auditedCasinos) {
  const showcaseCards = auditedCasinos
    .map((c) => {
      const evidenceList = (c.evidence || [])
        .map((e) => '<li>' + escapeHtml(e) + '</li>')
        .join('\n');

      return '<article class="audit-card">\n' +
        '  <div class="audit-card__header">\n' +
        '    <div class="audit-card__title-row">\n' +
        '      <h3 class="audit-card__name">' + escapeHtml(c.name) + '</h3>\n' +
        '      <div class="audit-card__tags">\n' +
        '        <span class="casino-card__grade ' + gradeClass(c.grade) + '">' + escapeHtml(c.grade) + '</span>\n' +
        '        <span class="audit-card__cat">' + escapeHtml(c.category) + '</span>\n' +
        '        <span class="audit-card__badge">Audited Intel</span>\n' +
        '      </div>\n' +
        '    </div>\n' +
        '    <p class="audit-card__risk">Risk: <strong>' + escapeHtml(c.risk) + '</strong></p>\n' +
        '  </div>\n' +
        '  <div class="audit-card__body">\n' +
        '    <dl class="audit-card__specs">\n' +
        '      <div class="audit-card__spec">\n' +
        '        <dt>License & Entity</dt>\n' +
        '        <dd>' + escapeHtml(c.license || 'Unlicensed / Unknown') + '</dd>\n' +
        '      </div>\n' +
        '      <div class="audit-card__spec">\n' +
        '        <dt>Originals RTP Math</dt>\n' +
        '        <dd class="spec-highlight">' + escapeHtml(c.rtpOriginals || 'Not reported') + '</dd>\n' +
        '      </div>\n' +
        '      <div class="audit-card__spec">\n' +
        '        <dt>Slot RTP Reality</dt>\n' +
        '        <dd>' + escapeHtml(c.rtpSlots || 'Variable / unverified') + '</dd>\n' +
        '      </div>\n' +
        '      <div class="audit-card__spec">\n' +
        '        <dt>Guardrail Compatibility</dt>\n' +
        '        <dd>' + escapeHtml(c.vaultSupport || 'None') + '</dd>\n' +
        '      </div>\n' +
        '      <div class="audit-card__spec">\n' +
        '        <dt>Cashout & Playthrough</dt>\n' +
        '        <dd>' + escapeHtml(c.playthrough || 'Standard') + '</dd>\n' +
        '      </div>\n' +
        '    </dl>\n' +
        '    <div class="audit-card__evidence-box">\n' +
        '      <h4 class="audit-card__evidence-title">Documented Receipts & Friction</h4>\n' +
        '      <ul class="audit-card__evidence-list">\n' +
        evidenceList + '\n' +
        '      </ul>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</article>';
    })
    .join('\n');

  return '<section class="public-page-section audited-showcase-section">\n' +
    '  <div class="landing-shell">\n' +
    '    <div class="public-page-section-heading">\n' +
    '      <span class="brand-eyebrow">Audited deep dives</span>\n' +
    '      <h2 class="public-page-section-heading__title">Stake, Roobet & BC.Game: The Receipts.</h2>\n' +
    '      <p class="public-page-section-heading__sub">Provably fair house edge, slot RTP downgrade reality, TiltCheck extension guardrail compatibility, and documented withdrawal friction.</p>\n' +
    '    </div>\n' +
    '    <div class="audited-grid">\n' +
    showcaseCards + '\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</section>';
}

function buildCasinosPage(casinos) {
  const auditedCasinos = casinos.filter((c) => Boolean(c.audited));
  const categories = [...new Set(casinos.map((c) => c.category))].sort();
  const cards = casinos
    .map((c) => {
      const isAudited = Boolean(c.audited);
      const keywords = [
        c.name,
        c.category,
        c.grade,
        c.risk,
        c.license,
        c.rtpSummary,
        ...(c.evidence || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      let extraContent = '';
      if (isAudited) {
        const evidenceItems = (c.evidence || [])
          .map((e) => '<li>' + escapeHtml(e) + '</li>')
          .join('');

        extraContent = '\n' +
          '  <div class="casino-card__meta-tags">\n' +
          '    <span class="badge-audited">Audited</span>\n' +
          (c.rtpSummary ? '    <span class="badge-rtp">' + escapeHtml(c.rtpSummary) + '</span>\n' : '') +
          '  </div>\n' +
          '  <p class="casino-card__license">' + escapeHtml(c.license || '') + '</p>\n' +
          '  <details class="casino-card__details">\n' +
          '    <summary class="casino-card__details-toggle">View verified evidence (' + (c.evidence || []).length + ')</summary>\n' +
          '    <div class="casino-card__details-body">\n' +
          '      <div class="casino-card__stat">\n' +
          '        <span class="stat-label">Originals RTP</span>\n' +
          '        <span class="stat-value text-accent">' + escapeHtml(c.rtpOriginals || 'N/A') + '</span>\n' +
          '      </div>\n' +
          '      <div class="casino-card__stat">\n' +
          '        <span class="stat-label">Slot Tiers</span>\n' +
          '        <span class="stat-value">' + escapeHtml(c.rtpSlots || 'N/A') + '</span>\n' +
          '      </div>\n' +
          '      <div class="casino-card__stat">\n' +
          '        <span class="stat-label">Guardrail Support</span>\n' +
          '        <span class="stat-value">' + escapeHtml(c.vaultSupport || 'N/A') + '</span>\n' +
          '      </div>\n' +
          '      <div class="casino-card__stat">\n' +
          '        <span class="stat-label">Playthrough</span>\n' +
          '        <span class="stat-value">' + escapeHtml(c.playthrough || 'N/A') + '</span>\n' +
          '      </div>\n' +
          '      <h4 class="evidence-subheading">Verified Receipts</h4>\n' +
          '      <ul class="casino-card__evidence-list">' + evidenceItems + '</ul>\n' +
          '    </div>\n' +
          '  </details>';
      }

      return '<article class="casino-card' + (isAudited ? ' casino-card--audited' : '') + '" data-name="' + escapeHtml(c.name.toLowerCase()) + '" data-category="' + escapeHtml(c.category) + '" data-grade="' + escapeHtml(c.grade) + '" data-audited="' + (isAudited ? 'true' : 'false') + '" data-keywords="' + escapeHtml(keywords) + '">\n' +
        '  <div class="casino-card__top">\n' +
        '    <span class="casino-card__grade ' + gradeClass(c.grade) + '">' + escapeHtml(c.grade) + '</span>\n' +
        '    <span class="casino-card__cat">' + escapeHtml(c.category) + '</span>\n' +
        '  </div>\n' +
        '  <h3 class="casino-card__name">' + escapeHtml(c.name) + '</h3>\n' +
        '  <p class="casino-card__risk">Risk: ' + escapeHtml(c.risk) + '</p>' + extraContent + '\n' +
        '</article>';
    })
    .join('\n');

  const filters = ['All', 'Audited', ...categories]
    .map(
      (cat, i) =>
        '<button type="button" class="filter-chip' + (i === 0 ? ' is-active' : '') + '" data-filter="' + escapeHtml(cat) + '">' + escapeHtml(cat) + (cat === 'Audited' ? ' (' + auditedCasinos.length + ')' : '') + '</button>',
    )
    .join('\n');

  const steps = GRADING_STEPS.map(
    (s) => '<li><strong>' + escapeHtml(s.title) + '</strong> — ' + escapeHtml(s.body) + '</li>',
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
      var audited = card.getAttribute('data-audited') === 'true';
      var keywords = card.getAttribute('data-keywords') || '';
      var okCat = activeCat === 'All' || (activeCat === 'Audited' ? audited : cat === activeCat);
      var okQ = !q || name.indexOf(q) !== -1 || keywords.indexOf(q) !== -1;
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
<\/script>`;

  const content = `${productHero({
    eyebrow: 'Casino trust directory',
    title: 'Look up the operator. Read the proof.',
    lede: 'Before you deposit, check who you are playing. This page audits ' + casinos.length + ' curated operators with letter grades, verified RTP data, regulatory licenses, and documented red flags. Deep-dive evidence is published below for Stake.us, Stake.com, Roobet, and BC.Game.',
    actionsHtml: '<a class="btn btn-primary" href="' + href('docs', 'index.html') + '">Back home</a>',
  })}
<main class="product-main">
  ${buildAuditedShowcase(auditedCasinos)}
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="casino-toolbar">
        <label class="casino-search">
          <span class="sr-only">Search casinos</span>
          <input id="casino-search" type="search" placeholder="Search operator name, license, RTP, or provider…" autocomplete="off"/>
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
    description: 'Curated casino trust grades and verified RTP evidence — static mirror of the TiltCheck directory.',
    depth: 'docs',
    current: 'casinos',
    body: content,
  });
}

function buildCooldownPage() {
  const content = `<main class="cooldown-page">
  <div class="cooldown-panel">
    <h1>Cooldown</h1>
    <p class="cooldown-punch">Sign a lock so 3am-you cannot put the stack back.</p>
    <p class="cooldown-fine">Not a deposit. No keys. Solana wallet. Devnet. Casinos do not have to honor it. You do. Stronger only.</p>
    <ol class="cooldown-steps">
      <li>Connect a Solana wallet you hold. Exodus is out.</li>
      <li>Pick the scope: everything, a category, or one game.</li>
      <li>Pick how long. Stronger locks only. No SOL moves.</li>
    </ol>
    <p class="cooldown-host">tiltcheck.me is GitHub Pages. This host is static HTML, so it cannot pop a wallet signer. The homepage button needed a real page instead of a 404. The lock itself still needs a Solana Wallet Standard signer in an app host.</p>
  </div>
</main>`;

  return shell({
    title: 'Cooldown | On-chain wallet lock | TiltCheck',
    description:
      'Sign a lock so 3am-you cannot put the stack back. Not a deposit. Solana wallet. Devnet.',
    depth: 'docs',
    current: 'cooldown',
    body: content,
  });
}

function mapPublicHref(depth, target) {
  if (String(target).startsWith('http')) return target;
  if (target === '/extension') return href(depth, 'extension.html');
  const folder = String(target).replace(/^\//, '').split('/')[0];
  return dirHref(depth, folder);
}

function loadNudges() {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'apps/web/src/data/nudges.json'), 'utf8'));
}

function buildNudgesPage() {
  const nudges = loadNudges();
  const groups = nudges.groups
    .map((group) => {
      const cards = group.items
        .map(
          (item) => `<article class="public-page-card nudge-toast">
  <p class="public-page-card__eyebrow">${escapeHtml(item.fire)}</p>
  <p class="nudge-toast__text">${escapeHtml(item.text)}</p>
</article>`,
        )
        .join('\n');
      return `<section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Toast</span>
        <h2 class="public-page-section-heading__title">${escapeHtml(group.when)}</h2>
      </div>
      <div class="public-page-grid public-page-grid--2">${cards}</div>
    </div>
  </section>`;
    })
    .join('\n');
  const content = `${productHero({
    eyebrow: nudges.eyebrow,
    title: nudges.title,
    lede: nudges.lede,
  })}
<main class="product-main">
  ${groups}
  <p class="nudge-honesty">${escapeHtml(nudges.honesty)}</p>
</main>`;

  return shell({
    title: 'Nudges | The toasts | TiltCheck',
    description: nudges.metaDescription,
    depth: 'docs',
    current: 'nudges',
    body: content,
  });
}

function buildAutovaultPage() {
  const steps = AUTOVAULT_PAGE.steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join('\n');
  const content = `<main class="cooldown-page">
  <div class="cooldown-panel">
    <p class="brand-eyebrow">${escapeHtml(AUTOVAULT_PAGE.eyebrow)}</p>
    <h1>${escapeHtml(AUTOVAULT_PAGE.title)}</h1>
    <p class="cooldown-punch">${escapeHtml(AUTOVAULT_PAGE.punch)}</p>
    <ol class="cooldown-steps">${steps}</ol>
    <p class="cooldown-fine">${escapeHtml(AUTOVAULT_PAGE.fine)}</p>
  </div>
</main>`;

  return shell({
    title: 'AutoVault | Skim the hit | TiltCheck',
    description: AUTOVAULT_PAGE.punch,
    depth: 'docs',
    current: 'autovault',
    body: content,
  });
}

function buildAutovaultRedirect() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0; url=../../autovault/"/>
<link rel="canonical" href="${SITE_URL}/autovault/"/>
<title>AutoVault | TiltCheck</title>
</head>
<body>
<p><a href="../../autovault/">AutoVault lives here</a></p>
</body>
</html>`;
}

function buildNudgesRedirect() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0; url=../nudges/"/>
<link rel="canonical" href="${SITE_URL}/nudges/"/>
<title>Nudges | TiltCheck</title>
</head>
<body>
<p><a href="../nudges/">The toasts live here now</a></p>
</body>
</html>`;
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
    lede: 'The extension is the session brakes. These tools are the homework: verify a bet from seeds, compare claimed payout vs what you got, check if a domain is sus, look up geo rules, track bonus timers. Interactive versions run on tiltcheck.me — this page tells you what each tool is for.',
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

function buildLoginPage() {
  const discordHref = `https://api.tiltcheck.me/auth/discord/login?source=web&redirect=${encodeURIComponent(`${SITE_URL}/dashboard`)}`;
  const content = `${productHero({
    eyebrow: 'Access Portal',
    title: 'Log in without the scavenger hunt',
    lede: 'Web still owns login. Discord is the founder lane. After auth lands, the canonical dashboard is the control surface.',
    actionsHtml: `<a class="btn btn-primary" href="${discordHref}" data-provider="discord">Login with Discord</a>
    <a class="hero-actions__secondary-link" href="${href('docs', 'index.html')}">Back home</a>`,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <p id="login-error" class="error" role="alert" hidden>Discord login failed. Try again or use email login.</p>
      <p class="public-page-card__copy">If you have not linked Discord yet, this is the button you wanted to find in the first place.</p>
    </div>
  </section>
</main>
<script>
(function () {
  var params = new URLSearchParams(window.location.search);
  if (!params.get('error')) return;
  var el = document.getElementById('login-error');
  if (el) el.hidden = false;
})();
</script>`;

  return shell({
    title: 'Log in | TiltCheck',
    description: 'Log in with Discord. Non-custodial. Web owns login; dashboard is after auth lands.',
    depth: 'docs',
    current: 'login',
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
    const html = buildDocPage({ title: meta.title, description: meta.description, body });
    fs.writeFileSync(path.join(outRoot, `${slug}.html`), html);
    indexEntries.push({ slug, title: meta.title, description: meta.description });
  }

  fs.writeFileSync(path.join(outRoot, 'index.html'), buildDocsIndexPage(indexEntries));
  fs.writeFileSync(path.join(siteRoot, 'index.html'), buildRootLanding());
  fs.writeFileSync(path.join(siteRoot, 'extension.html'), buildExtensionPage());
  const loginDir = path.join(siteRoot, 'login');
  fs.mkdirSync(loginDir, { recursive: true });
  fs.writeFileSync(path.join(loginDir, 'index.html'), buildLoginPage());
  const casinos = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'apps/web/src/data/casinos.json'), 'utf8'),
  );
  const casinosDir = path.join(siteRoot, 'casinos');
  fs.mkdirSync(casinosDir, { recursive: true });
  fs.writeFileSync(path.join(casinosDir, 'index.html'), buildCasinosPage(casinos));
  const cooldownDir = path.join(siteRoot, 'cooldown');
  fs.mkdirSync(cooldownDir, { recursive: true });
  fs.writeFileSync(path.join(cooldownDir, 'index.html'), buildCooldownPage());
  const nudgesDir = path.join(siteRoot, 'nudges');
  fs.mkdirSync(nudgesDir, { recursive: true });
  fs.writeFileSync(path.join(nudgesDir, 'index.html'), buildNudgesPage());
  const autovaultDir = path.join(siteRoot, 'autovault');
  fs.mkdirSync(autovaultDir, { recursive: true });
  fs.writeFileSync(path.join(autovaultDir, 'index.html'), buildAutovaultPage());
  const legacyVaultDir = path.join(siteRoot, 'tools', 'auto-vault');
  fs.mkdirSync(legacyVaultDir, { recursive: true });
  fs.writeFileSync(path.join(legacyVaultDir, 'index.html'), buildAutovaultRedirect());
  const grassDir = path.join(siteRoot, 'touch-grass');
  fs.mkdirSync(grassDir, { recursive: true });
  fs.writeFileSync(path.join(grassDir, 'index.html'), buildNudgesRedirect());
  fs.writeFileSync(
    path.join(siteRoot, 'casinos.html'),
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0; url=casinos/"/>
<link rel="canonical" href="${SITE_URL}/casinos/"/>
<title>Casino Trust | TiltCheck</title>
</head>
<body>
<p><a href="casinos/">Casino trust directory</a></p>
</body>
</html>`,
  );
  fs.writeFileSync(path.join(siteRoot, 'tools.html'), buildHomeRedirect('tools.html'));

  const zipSource = path.join(repoRoot, 'apps/web/public/downloads/tiltcheck-extension.zip');
  const zipDestDir = path.join(siteRoot, 'downloads');
  fs.mkdirSync(zipDestDir, { recursive: true });
  fs.copyFileSync(zipSource, path.join(zipDestDir, 'tiltcheck-extension.zip'));

  const glitterSrc = path.join(repoRoot, 'apps/web/public/assets/backgroundglitter.png');
  const assetsDir = path.join(siteRoot, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  if (fs.existsSync(glitterSrc)) {
    fs.copyFileSync(glitterSrc, path.join(assetsDir, 'backgroundglitter.png'));
  }

  fs.writeFileSync(path.join(siteRoot, '.nojekyll'), '');
  fs.writeFileSync(path.join(siteRoot, 'CNAME'), 'tiltcheck.me\n');

  console.log(`Built Pages site: ${files.length} specs + single-page home → ${siteRoot}`);
}

run();
