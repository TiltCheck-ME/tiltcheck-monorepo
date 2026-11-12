// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
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
import { calculateCasinoTrust } from '@tiltcheck/intel-tools';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGatePageBody } from './build-gate-page.mjs';
import {
  SITE_URL,
  API_URL,
  DISCORD_URL,
  DISCORD_INVITE_URL,
  DISCORD_OAUTH_LOGIN_URL,
  KOFI_URL,
  SOLANA_TIP_WALLET,
  SOLSCAN_TIP_URL,
  SITE_H1_LINES,
  SITE_DOPAMINE,
  SITE_KICKER,
  SITE_LEDE,
  SITE_ONE_LINER,
  SITE_META_DESCRIPTION,
  CTA_READY,
  CTA_LABEL,
  CTA_GATED_LABEL,
  CTA_GATED_HINT,
  SECONDARY_CTAS,
  TERTIARY_LINK,
  INSTALL_EYEBROW,
  INSTALL_TITLE,
  INSTALL_MOVES,
  INSTALL_NOTE,
  AUTOVAULT_PAGE,
  LAUNCH_HONESTY,
  EXTENSION_SIGNALS,
  GRADING_STEPS,
  TOOL_REGISTRY,
  CORE_BRAKES,
  RTP_SCANNER_PAGE,
  VERIFY_PAGE,
  HOUSE_EDGE_PAGE,
} from './pages-product-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const masterRtpPath = path.join(repoRoot, 'data/provider-master-rtp.json');
const masterRtp = JSON.parse(fs.readFileSync(masterRtpPath, 'utf8'));
const sourceRoot = path.resolve(process.argv[2] || 'docs/tiltcheck');
const outRoot = path.resolve(process.argv[3] || 'out/docs');
const FOOTER = 'Made for Degens. By Degens.';
const COPYRIGHT = '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.';
const DISCORD_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet"/>`;

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
    // File copyright headers repeat the site footer's copyright line. Skip them outside code.
    if (!inCode && /^©\s*20\d\d.*All Rights Reserved/i.test(raw.trim())) continue;
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

/**
 * How many folders below the site root a page sits.
 * 'root' = /index.html, 'docs' = one folder down (/docs/x.html, /cooldown/),
 * 'nested' = two folders down (/tools/verify/, /tools/house-edge-scanner/).
 * @param {'root' | 'docs' | 'nested'} depth
 */
function depthPrefix(depth) {
  if (depth === 'root') return '';
  if (depth === 'nested') return '../../';
  return '../';
}

/** @param {'root' | 'docs' | 'nested'} depth */
function assetHref(depth, file) {
  return `${depthPrefix(depth)}styles/${file}`;
}

/** @param {'root' | 'docs' | 'nested'} depth */
function href(depth, file) {
  return `${depthPrefix(depth)}${file}`;
}

/** @param {'root' | 'docs' | 'nested'} depth @param {string} folder */
function dirHref(depth, folder) {
  return `${depthPrefix(depth)}${folder}/`;
}

function navHtml(depth, current) {
  const homeHref = href(depth, 'index.html');
  const homeCurrent = current === 'home' ? ' aria-current="page"' : '';
  const extensionCurrent = current === 'extension' ? ' aria-current="page"' : '';
  const toolsCurrent = current === 'tools' ? ' aria-current="page"' : '';
  const casinosCurrent = current === 'casinos' ? ' aria-current="page"' : '';
  const cooldownCurrent = current === 'cooldown' ? ' aria-current="page"' : '';
  const tipCurrent = current === 'tip' ? ' aria-current="page"' : '';

  const shieldLogoSvg = `<svg class="site-nav__logo" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:#17c3b2; flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(23,195,178,0.18)" stroke="#17c3b2"/><path d="m9 12 2 2 4-4" stroke="#17c3b2"/></svg>`;

  return `<nav class="site-nav" aria-label="Primary">
  <a class="site-nav__brand" href="${homeHref}"${homeCurrent}>${shieldLogoSvg}TiltCheck<span class="site-nav__beta">Beta</span></a>
  <div class="site-nav__links">
    <a href="${dirHref(depth, 'gate')}"${current === 'gate' ? ' aria-current="page"' : ''} style="color:#17c3b2; font-weight:700;">TimeCheck</a>
    <a href="${href(depth, 'extension.html')}"${extensionCurrent}>Extension</a>
    <a href="${dirHref(depth, 'tools')}"${toolsCurrent}>Tools</a>
    <a href="${dirHref(depth, 'casinos')}"${casinosCurrent}>TrustCheck</a>
    <a href="${dirHref(depth, 'cooldown')}"${cooldownCurrent}>RealityCheck</a>
    <a class="site-nav__discord" data-tc-nav-auth data-account-href="${dirHref(depth, 'dashboard')}" href="${dirHref(depth, 'login')}"${current === 'login' ? ' aria-current="page"' : ''} aria-label="Sign in with Discord" title="Sign in with Discord">${DISCORD_ICON}<span>Sign in</span></a>
  </div>
</nav>`;
}

function footerHtml(depth) {
  return `<footer class="site-footer">
  <nav class="site-footer__more" aria-label="More tools">
    <p class="site-footer__more-label">Tools &amp; Resources</p>
    <div class="site-footer__links">
      <a href="${dirHref(depth, 'tools')}">All Tools</a>
      <a href="${dirHref(depth, 'gate')}">TimeCheck</a>
      <a href="${dirHref(depth, 'cooldown')}">RealityCheck</a>
      <a href="${dirHref(depth, 'rtp-scanner')}">RTP Scanner</a>
      <a href="${dirHref(depth, 'house-edge-scanner')}">House Edge Scanner</a>
      <a href="${dirHref(depth, 'verify')}">Fairness Verifier</a>
      <a href="${dirHref(depth, 'wincheck')}">Win Skim</a>
      <a href="${dirHref(depth, 'casinos')}">TrustCheck</a>
      <a href="${dirHref(depth, 'tip')}">Tip Jar</a>
      <a href="${dirHref(depth, 'login')}" data-tc-footer-auth data-signed-in-href="${dirHref(depth, 'dashboard')}" data-signed-in-text="Your dashboard">Discord Sign In</a>
      <a href="${DISCORD_INVITE_URL}" target="_blank" rel="noopener noreferrer">Discord Server</a>
      <a href="${dirHref(depth, 'privacy')}">Privacy Policy</a>
    </div>
  </nav>
  <p class="rg-disclaimer">TiltCheck is not a casino and not a bank. This is not financial advice. If gambling has stopped being fun, call <strong>1-800-GAMBLER</strong> or visit <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">NCPG.org</a>.</p>
  <span class="site-footer__tag">${FOOTER}</span>
  ${COPYRIGHT}
</footer>`;
}

/**
 * Staff-only block for the static site. Hidden by default (fail closed); the staff script
 * below reveals it only when api.tiltcheck.me/auth/me says isStaff === true
 * (Discord "TiltCheck Team" role). Hidden, not secret: never put real secrets in here.
 */
function staffOnly(innerHtml, label = 'Staff only') {
  return `<div class="staff-only" data-staff-only hidden>
  <span class="staff-only__label">${escapeHtml(label)}</span>
  ${innerHtml}
</div>`;
}

const STAFF_REVEAL_SCRIPT = `<script>
(function () {
  var blocks = document.querySelectorAll('[data-staff-only]');
  if (!blocks.length || !window.fetch) return;
  var headers = {};
  try {
    var t = window.localStorage.getItem('tc_token');
    if (t) headers.Authorization = 'Bearer ' + t;
  } catch (e) {}
  fetch('${API_URL}/auth/me', { credentials: 'include', headers: headers })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (me) {
      if (!me || me.isStaff !== true) return;
      for (var i = 0; i < blocks.length; i++) blocks[i].hidden = false;
    })
    .catch(function () {});
})();
</script>`;

/**
 * Signed-in state for the static site. Reads tc_token / tc_user (Discord /users/@me JSON)
 * from localStorage, which /login/ writes after Discord sign-in. Cosmetic only: the avatar,
 * name and STAFF badge are display, never access control. Real staff gating stays on the API.
 */
// Discord user IDs that get the cosmetic STAFF badge. Jamie (jmenichole) = 1153034319271559328.
const STAFF_DISCORD_IDS = ['1153034319271559328'];

// Runs in <head> so signed-in pages don't flash the signed-out header first.
const AUTH_HEAD_SCRIPT = `<script>
(function () {
  try {
    var exp = Number(localStorage.getItem('tc_token_exp') || 0);
    if (exp && exp < Date.now()) {
      localStorage.removeItem('tc_token');
      localStorage.removeItem('tc_user');
      localStorage.removeItem('tc_token_exp');
    }
    if (localStorage.getItem('tc_token') && localStorage.getItem('tc_user')) {
      document.documentElement.classList.add('tc-signed-in');
    }
  } catch (e) {}
})();
</script>`;

const AUTH_NAV_SCRIPT = `<script>
(function () {
  var STAFF = ${JSON.stringify(STAFF_DISCORD_IDS)};
  function readUser() {
    try {
      if (!localStorage.getItem('tc_token')) return null;
      var exp = Number(localStorage.getItem('tc_token_exp') || 0);
      if (exp && exp < Date.now()) return null;
      var u = JSON.parse(localStorage.getItem('tc_user') || 'null');
      return u && /^[0-9]{5,25}$/.test(String(u.id)) ? u : null;
    } catch (e) { return null; }
  }
  function avatarUrl(u) {
    if (u.avatar && /^(a_)?[0-9a-f]{16,64}$/.test(String(u.avatar))) {
      return 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.png?size=64';
    }
    var i = 0;
    try {
      i = (u.discriminator && u.discriminator !== '0')
        ? Number(u.discriminator) % 5
        : Number((BigInt(u.id) >> BigInt(22)) % BigInt(6));
    } catch (e) {}
    return 'https://cdn.discordapp.com/embed/avatars/' + i + '.png';
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function render() {
    var u = readUser();
    document.documentElement.classList.toggle('tc-signed-in', !!u);
    var staff = !!u && STAFF.indexOf(String(u.id)) !== -1;
    var name = u ? String(u.global_name || u.username || 'you') : '';
    var links = document.querySelectorAll('[data-tc-nav-auth]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (!a.getAttribute('data-signed-out-html')) {
        a.setAttribute('data-signed-out-html', a.innerHTML);
        a.setAttribute('data-signed-out-href', a.getAttribute('href') || '');
      }
      if (!u) {
        a.innerHTML = a.getAttribute('data-signed-out-html');
        a.setAttribute('href', a.getAttribute('data-signed-out-href'));
        a.classList.remove('site-nav__account');
        a.setAttribute('aria-label', 'Sign in with Discord');
        a.setAttribute('title', 'Sign in with Discord');
        continue;
      }
      a.textContent = '';
      a.classList.add('site-nav__account');
      a.setAttribute('href', a.getAttribute('data-account-href') || a.getAttribute('data-signed-out-href'));
      a.setAttribute('aria-label', 'Signed in as ' + name + (staff ? ' (staff)' : '') + '. Open your dashboard');
      a.setAttribute('title', 'Signed in as ' + name);
      var wrap = el('span', 'site-nav__avatar');
      var img = el('img');
      img.src = avatarUrl(u);
      img.alt = '';
      img.width = 28;
      img.height = 28;
      img.referrerPolicy = 'no-referrer';
      wrap.appendChild(img);
      if (staff) wrap.appendChild(el('span', 'site-nav__staff', 'Staff'));
      a.appendChild(wrap);
      a.appendChild(el('span', 'site-nav__name', name));
    }
    // Footer "Discord Sign In" becomes "Your dashboard" while signed in.
    var foot = document.querySelectorAll('[data-tc-footer-auth]');
    for (var f = 0; f < foot.length; f++) {
      var fa = foot[f];
      if (!fa.getAttribute('data-signed-out-text')) {
        fa.setAttribute('data-signed-out-text', fa.textContent);
        fa.setAttribute('data-signed-out-href', fa.getAttribute('href') || '');
      }
      if (u) {
        fa.textContent = fa.getAttribute('data-signed-in-text') || 'Your dashboard';
        fa.setAttribute('href', fa.getAttribute('data-signed-in-href') || fa.getAttribute('data-signed-out-href'));
      } else {
        fa.textContent = fa.getAttribute('data-signed-out-text');
        fa.setAttribute('href', fa.getAttribute('data-signed-out-href'));
      }
    }
    var nameSlots = document.querySelectorAll('[data-tc-user-name]');
    for (var j = 0; j < nameSlots.length; j++) nameSlots[j].textContent = name;
    var avSlots = document.querySelectorAll('img[data-tc-user-avatar]');
    for (var k = 0; k < avSlots.length; k++) { if (u) avSlots[k].src = avatarUrl(u); }
    var staffSlots = document.querySelectorAll('[data-tc-staff-badge]');
    for (var m = 0; m < staffSlots.length; m++) staffSlots[m].hidden = !staff;
  }
  window.tcAuth = {
    render: render,
    signOut: function () {
      try {
        localStorage.removeItem('tc_token');
        localStorage.removeItem('tc_user');
        localStorage.removeItem('tc_token_exp');
      } catch (e) {}
      render();
    }
  };
  render();
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key === 'tc_token' || e.key === 'tc_user' || e.key === 'tc_token_exp') render();
  });
})();
</script>`;

function shell({ title, description, depth, current, body, extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="theme-color" content="#06080b"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta name="apple-mobile-web-app-title" content="TimeCheck"/>
<link rel="manifest" href="${href(depth, 'manifest.webmanifest')}"/>
${FONT_LINKS}
<link rel="icon" type="image/png" href="${href(depth, 'icon.png')}"/>
<link rel="apple-touch-icon" href="${href(depth, 'icon.png')}"/>
<link rel="stylesheet" href="${assetHref(depth, 'base.css')}"/>
${AUTH_HEAD_SCRIPT}
${extraHead}
</head>
<body>
${navHtml(depth, current)}
${body}
${footerHtml(depth)}
${AUTH_NAV_SCRIPT}
${body.includes('data-staff-only') ? STAFF_REVEAL_SCRIPT : ''}
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
    extraHead: '<meta name="robots" content="noindex, follow"/>',
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
    extraHead: '<meta name="robots" content="noindex, follow"/>',
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
      <h1 class="landing-hero__title"><span class="landing-hero__title-q">${escapeHtml(SITE_H1_LINES[0])}</span><span class="landing-hero__title-a">${escapeHtml(SITE_H1_LINES[1])}</span></h1>
      <p class="landing-hero__dopamine">${escapeHtml(SITE_DOPAMINE)}</p>
      <p class="landing-hero__kicker">${escapeHtml(SITE_KICKER)}</p>
      <p class="landing-hero__lede">${escapeHtml(SITE_LEDE)}</p>
      <div class="hero-actions landing-hero__actions">
        ${zipCtaHtml()}
        ${secondaryCtaHtml()}
      </div>
      <a class="hero-actions__secondary-link" href="${escapeHtml(TERTIARY_LINK.href)}">${escapeHtml(TERTIARY_LINK.label)}</a>
    </div>
  </section>
  <section class="landing-moves" id="install" aria-label="How it works">
    <p class="landing-moves__eyebrow">${escapeHtml(INSTALL_EYEBROW)}</p>
    <h2 class="landing-moves__title">${escapeHtml(INSTALL_TITLE)}</h2>
    <ol class="landing-moves__list">${moves}</ol>
  </section>
  <section class="landing-brakes" aria-label="What the extension does">
    <p class="landing-brakes__eyebrow">ON THE CASINO TAB</p>
    <h2 class="landing-brakes__title">THE ANNOYING STUFF. ON PURPOSE.</h2>
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
        <span class="landing-calc__banner-tag">REALITY WAGE CLOCK</span>
        <p class="landing-calc__banner-lead">Session Down: <span id="calcLossText">-$300.00</span> (<span id="calcHoursText" style="color:#f4a261;">12.0 hours</span> of labor torched)</p>
        <p class="landing-calc__banner-desc" id="calcDescText">That is an entire 8-hour shift plus a half day of hard labor gone. You spent all day working for the house. Close the tab.</p>
      </div>
    </div>
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
    title: 'TiltCheck | House always wins? Not today.',
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
    <a class="hero-actions__cta" href="/downloads/tiltcheck-extension.zip" download style="border-radius:var(--radius-pill); font-weight:800;">DOWNLOAD EXTENSION (ZIP)</a>
    <a class="hero-actions__secondary-link" href="gate/">Use TimeCheck Mobile App</a>`;

  const content = `${productHero({
    eyebrow: 'Desktop Companion',
    title: 'TiltCheck Browser Extension',
    lede: 'Free brakes for your casino tab. Add it in 30 seconds, then pick which ones run.',
    actionsHtml: actions,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <article class="public-page-card" style="border: 1px solid rgba(23,195,178,0.35); background: rgba(23,195,178,0.04);">
        <h2 class="public-page-card__title">How to install</h2>
        <ol style="color:var(--text-secondary); line-height:1.75; padding-left:1.25rem; margin:1rem 0;">
          <li><strong>Download and extract</strong> the <a href="/downloads/tiltcheck-extension.zip" download style="color:#17c3b2; text-decoration:underline;">tiltcheck-extension.zip</a> file to your computer.</li>
          <li>Open Chrome, Brave, or Edge and go to <code>chrome://extensions</code> in your address bar.</li>
          <li>Turn on <strong>Developer mode</strong> (toggle top right), click <strong>Load unpacked</strong>, and select the unzipped folder.</li>
        </ol>
        <p class="public-page-card__copy" style="font-size:0.85rem; color:var(--text-muted); margin-top:0.75rem;">100% client-side. No tracking, no wallet keys, no store dependencies.</p>
      </article>
    </div>
  </section>
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Features</span>
        <h2 class="public-page-section-heading__title">What it does on your casino tab.</h2>
      </div>
      <div class="public-page-grid public-page-grid--2">${signals}</div>
    </div>
  </section>
</main>`;

  return shell({
    title: 'Direct Extension Download | TiltCheck',
    description: 'Download the TiltCheck desktop extension: 2-second spin pause, custom game block lists, and cashier cooldowns from 24 hours to 30 days.',
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

function buildAuditedShowcase(auditedCasinos, toolbarHtml) {
  const showcaseCards = auditedCasinos
    .map((c) => {
      const trust = calculateCasinoTrust(c);
      const evidenceList = (c.evidence || [])
        .map((e) => '<li>' + escapeHtml(e) + '</li>')
        .join('\n');

      const keywords = [c.name, c.category, trust.grade, trust.risk, c.license, c.rtpSummary, ...(c.evidence || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return '<article class="audit-card" data-casino-card data-name="' + escapeHtml(c.name.toLowerCase()) + '" data-category="' + escapeHtml(c.category) + '" data-grade="' + escapeHtml(trust.grade) + '" data-audited="true" data-keywords="' + escapeHtml(keywords) + '">\n' +
        '  <div class="audit-card__header">\n' +
        '    <div class="audit-card__title-row">\n' +
        '      <h3 class="audit-card__name">' + escapeHtml(c.name) + '</h3>\n' +
        '      <div class="audit-card__tags">\n' +
        '        <span class="casino-card__grade ' + gradeClass(trust.grade) + '">' + escapeHtml(trust.grade) + '</span>\n' +
        '        <span class="audit-card__score">' + trust.score + '/100</span>\n' +
        '        <span class="audit-card__cat">' + escapeHtml(c.category) + '</span>\n' +
        '        <span class="audit-card__badge">Audited Intel</span>\n' +
        '      </div>\n' +
        '    </div>\n' +
        '    <p class="audit-card__risk">Risk: <strong>' + escapeHtml(trust.risk) + '</strong></p>\n' +
        '  </div>\n' +
        '  <div class="audit-card__body">\n' +
        '    <div class="audit-card__pillars-row">\n' +
        '      <div class="audit-pillar"><span class="pillar-lbl">Financial</span><span class="pillar-val">' + trust.pillars.financialPayouts + '/100</span></div>\n' +
        '      <div class="audit-pillar"><span class="pillar-lbl">Proof Quality</span><span class="pillar-val">' + trust.pillars.fairnessTransparency + '/100</span></div>\n' +
        '      <div class="audit-pillar"><span class="pillar-lbl">Promo Honesty</span><span class="pillar-val">' + trust.pillars.promotionalHonesty + '/100</span></div>\n' +
        '      <div class="audit-pillar"><span class="pillar-lbl">Operations</span><span class="pillar-val">' + trust.pillars.operationalSupport + '/100</span></div>\n' +
        '      <div class="audit-pillar"><span class="pillar-lbl">Community</span><span class="pillar-val">' + trust.pillars.communityReputation + '/100</span></div>\n' +
        '    </div>\n' +
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
        '        <dt>Extension Support</dt>\n' +
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
    '      <span class="brand-eyebrow">The directory</span>\n' +
    '      <h2 class="public-page-section-heading__title">Every operator, graded.</h2>\n' +
    '    </div>\n' +
    (toolbarHtml || '') + '\n' +
    '    <div class="audited-grid">\n' +
    showcaseCards + '\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</section>';
}

function buildCasinosPage(casinos) {
  const auditedCasinos = casinos.filter((c) => Boolean(c.audited));
  const categories = [...new Set(auditedCasinos.map((c) => c.category))].sort();
  const filters = ['All', ...categories]
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
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-casino-card]'));
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
    if (count) count.textContent = shown + ' audited operators';
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
    eyebrow: 'TrustCheck',
    title: 'Audit the operator. Read the receipts.',
    lede: 'Before you deposit, check who you are playing. TrustCheck audits ' + auditedCasinos.length + ' operators with letter grades, verified RTP data, regulatory licenses, and documented red flags.',
    actionsHtml: '<a class="btn btn-primary" href="' + href('docs', 'index.html') + '">Back home</a>',
  })}
<main class="product-main">
  ${buildAuditedShowcase(auditedCasinos, `      <div class="casino-toolbar">
        <label class="casino-search">
          <span class="sr-only">Search casinos</span>
          <input id="casino-search" type="search" placeholder="Search operator name, license, RTP, or provider…" autocomplete="off"/>
        </label>
        <div class="filter-row" role="group" aria-label="Category filters">${filters}</div>
        <p class="casino-count" id="casino-count">${auditedCasinos.length} audited operators</p>
      </div>`)}
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Methodology</span>
        <h2 class="public-page-section-heading__title">How letter grades are built.</h2>
      </div>
      <p class="method-summary">Grades are built from payout speed, license verification, and terms review.</p>
      ${staffOnly('<ol class="method-list">' + steps + '</ol>', 'TrustCheck Team — Grading Methodology')}
    </div>
  </section>
</main>
${script}`;

  return shell({
    title: 'TrustCheck — Casino Directory & Payout Audits | TiltCheck',
    description: 'Search casino trust scores, verified payout speeds, licenses, and documented player red flags.',
    depth: 'docs',
    current: 'casinos',
    body: content,
  });
}


function buildGatePage() {
  const staffDevNotes = staffOnly(
    '<p style="margin:0 0 6px 0; font-size:0.85rem; color:#fde68a;"><strong>Staff Dev Note:</strong> TimeCheck PWA runs client-side on GitHub Pages. Session timers survive tab navigation via localStorage (key: <code>tc_active_session</code>).</p><p style="margin:0; font-size:0.8rem; color:#cbd5e1;">Worker target: <code>https://collectclock-api.j-chapman7.workers.dev</code>.</p>',
    'TiltCheck Team Dev Note'
  );

  return shell({
    title: 'TimeCheck — Mobile Casino Session Timer & Limits',
    description: 'Pre-session limit setter and timer for casino players. 100% free web app with zero downloads required.',
    depth: 1,
    current: 'gate',
    body: getGatePageBody(staffDevNotes),
  });
}

function buildCooldownPage() {
  const depth = 'docs';
  const extensionHref = href(depth, 'extension.html');
  const content = `<main class="cooldown-page">
  <div class="cooldown-panel">
    <p class="brand-eyebrow">RealityCheck</p>
    <h1>Take a break</h1>
    <p class="cooldown-punch">TiltCheck blocks casino deposit buttons until your break is over.</p>

    <div id="auto-tilt-alert-banner" class="cooldown-banner" style="display:none;">
      <p class="cooldown-banner__title">Tilt check</p>
      <p class="cooldown-banner__text">Fast spins and faster losses. The extension slowed things down. Want a real break? Pick a length below.</p>
      <div id="auto-tilt-wallet" class="cooldown-banner__wallet"></div>
    </div>
    <script>
      (function() {
        if (typeof window === 'undefined') return;
        var p = new URLSearchParams(window.location.search);
        if (p.get('source') === 'auto_tilt') {
          var b = document.getElementById('auto-tilt-alert-banner');
          if (b) b.style.display = 'block';
          var w = p.get('wallet');
          if (w) {
            var el = document.getElementById('auto-tilt-wallet');
            if (el) el.textContent = 'Wallet: ' + w;
          }
        }
      })();
    </script>

    <div class="cooldown-lock" id="cooldown-length">
      <p class="cooldown-label" id="cooldown-dur-label">How long?</p>
      <div class="cooldown-durs" role="group" aria-labelledby="cooldown-dur-label">
        <button type="button" class="cooldown-dur-btn" data-hours="24" aria-pressed="false">24h</button>
        <button type="button" class="cooldown-dur-btn" data-hours="72" aria-pressed="false">3 Days</button>
        <button type="button" class="cooldown-dur-btn active" data-hours="168" aria-pressed="true">7 Days</button>
        <button type="button" class="cooldown-dur-btn" data-hours="720" aria-pressed="false">30 Days</button>
      </div>
      <button type="button" class="btn btn-primary cooldown-lock-btn" id="btn-cooldown-lock">Lock me out for 7 days</button>
      <p id="cooldown-lock-status" class="cooldown-lock-status" role="status" aria-live="polite" hidden></p>
      <p id="cooldown-mobile-note" class="cooldown-note" hidden>Heads up: the block runs in the TiltCheck browser extension on a computer, so a lock set here won't block anything on this phone. <a href="${extensionHref}">About the extension</a></p>
      <p class="cooldown-fine">No account, no wallet, no money moves. You can't cancel it early.</p>
    </div>

    <button type="button" class="cooldown-optional-toggle" id="btn-wallet-toggle" aria-expanded="false" aria-controls="cooldown-wallet-panel">Add a wallet signature (optional)</button>
    <div id="cooldown-wallet-panel" class="cooldown-wallet" hidden>
      <p class="cooldown-wallet__intro">Sign your lock with a Solana wallet for a signed receipt. Free. Nothing gets sent or spent.</p>
      <div id="wallet-connected-row" class="cooldown-wallet__row" style="display:none;">
        <div>
          <span class="cooldown-wallet__label">Connected</span>
          <div id="wallet-address-display" class="cooldown-wallet__addr"></div>
        </div>
        <button type="button" id="btn-wallet-disconnect" class="cooldown-wallet__disconnect">Disconnect</button>
      </div>
      <button type="button" class="btn btn-secondary cooldown-wallet__btn" id="btn-wallet-connect">Connect wallet</button>
      <div id="wallet-connect-notice" class="cooldown-note" hidden></div>
      <div id="cooldown-sign-feedback" class="cooldown-note" role="status" aria-live="polite" hidden></div>
    </div>

    <script>
      (function() {
        var selectedHours = 168;
        var currentWallet = null;
        var lockedUntilMs = 0;

        var ua = navigator.userAgent || '';
        var isMobile = /iPhone|iPad|iPod|Android/i.test(ua) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        var durBtns = Array.prototype.slice.call(document.querySelectorAll('.cooldown-dur-btn'));
        var btnLock = document.getElementById('btn-cooldown-lock');
        var lockStatus = document.getElementById('cooldown-lock-status');
        var mobileNote = document.getElementById('cooldown-mobile-note');
        var toggle = document.getElementById('btn-wallet-toggle');
        var walletPanel = document.getElementById('cooldown-wallet-panel');
        var btnWallet = document.getElementById('btn-wallet-connect');
        var btnDisconnect = document.getElementById('btn-wallet-disconnect');
        var connectNotice = document.getElementById('wallet-connect-notice');
        var connectedRow = document.getElementById('wallet-connected-row');
        var addressDisplay = document.getElementById('wallet-address-display');
        var feedback = document.getElementById('cooldown-sign-feedback');

        if (isMobile && mobileNote) mobileNote.hidden = false;

        function durationWords(h) {
          if (h < 24) return h + ' hours';
          if (h === 24) return '24 hours';
          var d = Math.round(h / 24);
          return d + (d === 1 ? ' day' : ' days');
        }

        function fmtDate(ms) {
          try {
            return new Date(ms).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          } catch (e) {
            return new Date(ms).toString();
          }
        }

        function setNote(el, html) {
          if (!el) return;
          if (html) { el.innerHTML = html; el.hidden = false; }
          else { el.innerHTML = ''; el.hidden = true; }
        }

        function refreshLockButton() {
          if (!btnLock) return;
          if (lockedUntilMs > Date.now()) {
            btnLock.disabled = true;
            btnLock.textContent = 'Locked until ' + fmtDate(lockedUntilMs);
          } else {
            btnLock.disabled = false;
            btnLock.textContent = 'Lock me out for ' + durationWords(selectedHours);
          }
        }

        function selectDuration(b) {
          durBtns.forEach(function(x) {
            x.classList.remove('active');
            x.setAttribute('aria-pressed', 'false');
          });
          b.classList.add('active');
          b.setAttribute('aria-pressed', 'true');
          selectedHours = parseInt(b.getAttribute('data-hours') || '168', 10);
          refreshLockButton();
        }

        durBtns.forEach(function(b) {
          b.addEventListener('click', function() { selectDuration(b); });
        });

        function showLocked(endMs) {
          lockedUntilMs = endMs;
          durBtns.forEach(function(x) { x.disabled = true; });
          refreshLockButton();
          if (lockStatus) {
            lockStatus.textContent = 'Locked until ' + fmtDate(endMs) + '. Go touch grass.';
            lockStatus.hidden = false;
          }
          if (btnWallet && currentWallet) btnWallet.textContent = 'Sign lock';
        }

        function postLock(wallet, endTimeSec, lockSource) {
          window.postMessage({
            source: 'TILTCHECK_COOLDOWN_PAGE',
            type: 'LOCK_UPDATED',
            wallet: wallet,
            endTime: endTimeSec,
            lockSource: lockSource
          }, '*');
        }

        function applyLocalLock() {
          if (lockedUntilMs > Date.now()) return;
          var endTimeSec = Math.floor(Date.now() / 1000) + (selectedHours * 3600);
          postLock('in_browser_lockout', endTimeSec, 'local_browser_session');
          try {
            localStorage.setItem('tiltcheck_cooldown_active_until', String(endTimeSec * 1000));
            localStorage.setItem('tiltcheck_cooldown_source', 'local_browser_session');
          } catch (e) {}
          showLocked(endTimeSec * 1000);
        }

        btnLock && btnLock.addEventListener('click', applyLocalLock);

        // Optional wallet section
        toggle && toggle.addEventListener('click', function() {
          var open = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
          if (walletPanel) walletPanel.hidden = open;
          if (!open && !currentWallet) {
            resolveProvider(600).then(function(p) { if (!p) showNoWallet(); });
          }
        });

        function getProvider() {
          if (window.phantom && window.phantom.solana) return window.phantom.solana;
          if (window.solflare && window.solflare.isSolflare) return window.solflare;
          if (window.backpack && window.backpack.isBackpack) return window.backpack;
          if (window.coinbaseSolana) return window.coinbaseSolana;
          if (window.solana) return window.solana;
          if (window.solflare) return window.solflare;
          if (window.backpack) return window.backpack;
          return null;
        }

        async function resolveProvider(timeoutMs) {
          var p = getProvider();
          if (p) return p;
          var start = Date.now();
          while (Date.now() - start < (timeoutMs || 800)) {
            await new Promise(function(r) { setTimeout(r, 60); });
            p = getProvider();
            if (p) return p;
          }
          return null;
        }

        function walletLinks() {
          var u = encodeURIComponent(location.href);
          var ref = encodeURIComponent(location.origin);
          return [
            { id: 'btn-open-phantom-app', name: 'Phantom', url: 'https://phantom.com/ul/browse/' + u + '?ref=' + ref },
            { id: 'btn-open-solflare-app', name: 'Solflare', url: 'https://solflare.com/ul/v1/browse/' + u + '?ref=' + ref },
            { id: 'btn-open-backpack-app', name: 'Backpack', url: 'https://backpack.app/ul/v1/browse/' + u + '?ref=' + ref }
          ];
        }

        function showNoWallet() {
          if (currentWallet) return;
          var html;
          if (isMobile) {
            html = 'No wallet in this browser. Open this page in your wallet app:' +
              '<span class="cooldown-wallet__links">' +
              walletLinks().map(function(l) {
                return '<a id="' + l.id + '" class="cooldown-wallet__link" href="' + l.url + '" rel="noopener noreferrer">' + l.name + '</a>';
              }).join('') +
              '</span>';
          } else {
            html = 'No Solana wallet found in this browser. ' +
              '<a id="btn-install-phantom" class="cooldown-wallet__link" href="https://phantom.app/download" target="_blank" rel="noopener noreferrer">Install Phantom</a>';
          }
          setNote(connectNotice, html);
        }

        function updateConnectedUI(pubkey) {
          currentWallet = pubkey;
          setNote(connectNotice, '');
          if (pubkey) {
            if (connectedRow) connectedRow.style.display = 'flex';
            if (addressDisplay) addressDisplay.textContent = pubkey.substring(0, 4) + '...' + pubkey.substring(pubkey.length - 4);
            if (btnWallet) { btnWallet.disabled = false; btnWallet.textContent = 'Sign lock'; }
            window.postMessage({ source: 'TILTCHECK_COOLDOWN_PAGE', type: 'WALLET_CONNECTED', wallet: pubkey }, '*');
          } else {
            if (connectedRow) connectedRow.style.display = 'none';
            if (addressDisplay) addressDisplay.textContent = '';
            if (btnWallet) { btnWallet.disabled = false; btnWallet.textContent = 'Connect wallet'; }
          }
        }

        async function connectWallet() {
          btnWallet.disabled = true;
          btnWallet.textContent = 'Looking for a wallet...';
          setNote(connectNotice, '');
          var provider = await resolveProvider(900);
          if (!provider) {
            btnWallet.disabled = false;
            btnWallet.textContent = 'Connect wallet';
            showNoWallet();
            return;
          }
          try {
            btnWallet.textContent = 'Approve in your wallet...';
            var resp = await provider.connect();
            var pubKey = (resp && resp.publicKey) ? resp.publicKey : (provider.publicKey || null);
            var key = null;
            if (pubKey) {
              if (typeof pubKey.toBase58 === 'function') key = pubKey.toBase58();
              else if (typeof pubKey.toString === 'function') key = pubKey.toString();
              else key = String(pubKey);
            }
            if (!key) throw new Error('Wallet connected but no public address returned.');
            updateConnectedUI(key);
            setNote(feedback, '');
          } catch (err) {
            btnWallet.disabled = false;
            btnWallet.textContent = 'Connect wallet';
            setNote(connectNotice, 'Connection cancelled. No problem: the lock button above works without a wallet.');
          }
        }

        async function signLock() {
          var provider = getProvider();
          if (!provider || !currentWallet) return;
          var nowMs = Date.now();
          var endTimeSec = lockedUntilMs > nowMs ? Math.floor(lockedUntilMs / 1000) : Math.floor(nowMs / 1000) + (selectedHours * 3600);
          var hours = Math.max(1, Math.round((endTimeSec * 1000 - nowMs) / 3600000));
          var expiryDateStr = new Date(endTimeSec * 1000).toUTCString();
          var messageText = 'TiltCheck Voluntary Touch Grass Lock\\n' +
            'Wallet: ' + currentWallet + '\\n' +
            'Duration: ' + hours + ' Hours\\n' +
            'Expires: ' + expiryDateStr + '\\n' +
            'Nonce: ' + Math.random().toString(36).substring(2, 10) + '\\n' +
            'Standard: tiltcheck-cooldown-v1';
          try {
            btnWallet.disabled = true;
            btnWallet.textContent = 'Sign in your wallet...';
            if (typeof provider.signMessage !== 'function') {
              throw new Error('This wallet cannot sign messages. Try Phantom, Solflare, or Backpack.');
            }
            var encoded = new TextEncoder().encode(messageText);
            try {
              await provider.signMessage(encoded, 'utf8');
            } catch (e1) {
              await provider.signMessage(encoded);
            }
            postLock(currentWallet, endTimeSec, 'solana_web_wallet');
            try {
              localStorage.setItem('tiltcheck_cooldown_active_until', String(endTimeSec * 1000));
              localStorage.setItem('tiltcheck_cooldown_wallet', currentWallet);
            } catch (e) {}
            showLocked(endTimeSec * 1000);
            btnWallet.disabled = true;
            btnWallet.textContent = 'Signed';
            setNote(feedback, 'Signed by ' + currentWallet.substring(0, 4) + '...' + currentWallet.substring(currentWallet.length - 4) + '. Lock runs until ' + fmtDate(endTimeSec * 1000) + '.');
          } catch (err) {
            btnWallet.disabled = false;
            btnWallet.textContent = 'Sign lock';
            if (feedback) {
              feedback.textContent = 'Signature cancelled: ' + ((err && err.message) || 'request rejected') + (lockedUntilMs > Date.now() ? ' Your lock still stands.' : '');
              feedback.hidden = false;
            }
          }
        }

        btnWallet && btnWallet.addEventListener('click', function() {
          if (currentWallet) signLock(); else connectWallet();
        });

        btnDisconnect && btnDisconnect.addEventListener('click', function() {
          var provider = getProvider();
          if (provider && provider.disconnect) provider.disconnect().catch(function() {});
          updateConnectedUI(null);
        });

        // ?extend=30 preselects a length
        var params = new URLSearchParams(window.location.search);
        var ext = params.get('extend');
        if (ext) {
          var hrs = parseInt(ext, 10) * 24;
          durBtns.forEach(function(b) {
            if (b.getAttribute('data-hours') === String(hrs)) selectDuration(b);
          });
        }

        // A lock that is already running shows as active
        try {
          var stored = Number(localStorage.getItem('tiltcheck_cooldown_active_until') || 0);
          if (stored > Date.now()) showLocked(stored);
        } catch (e) {}
        refreshLockButton();

        // Wallet already connected (e.g. inside a wallet's in-app browser)
        setTimeout(function() {
          var p = getProvider();
          if (p && p.publicKey) {
            var pk = p.publicKey;
            var key = typeof pk.toBase58 === 'function' ? pk.toBase58() : (typeof pk.toString === 'function' ? pk.toString() : String(pk));
            if (key) updateConnectedUI(key);
          }
        }, 350);
      })();
    </script>

    <div class="cooldown-how">
      <h2>How it works</h2>
      <div class="cooldown-how__grid">
        <div class="cooldown-how__card">
          <h3>1. The extension</h3>
          <p>While your lock runs, the TiltCheck extension greys out cashier and deposit buttons on casino sites and deadens spins on the games you blocked. It runs in a desktop browser.</p>
          <a class="btn btn-primary" href="${extensionHref}">What the extension does</a>
        </div>
        ${staffOnly(`<div class="cooldown-how__card">
          <h3>Terminal break timer</h3>
          <p>Set a local break timer from your terminal:</p>
          <code class="cooldown-how__code">npx @tiltcheck/cli cooldown --days 7</code>
          <p class="cooldown-how__small">Saves a break receipt on your machine. No wallet, no account.</p>
        </div>`, 'Staff only: CLI')}
        <div class="cooldown-how__card">
          <h3>2. Cancel-withdrawal blocker</h3>
          <p>Cashing out on Stake, Roobet, or a sweeps site? The extension hides 'Cancel Withdrawal' while the payout clears, so undoing it takes real effort.</p>
        </div>
        <div class="cooldown-how__card">
          <h3>3. The fine print</h3>
          <p>Casinos don't have to honor your lock. You do. The optional wallet signature just adds a signed note with your lock's end time, for your own records.</p>
        </div>
      </div>
    </div>
  </div>
</main>`;

  return shell({
    title: 'RealityCheck — Take a break | TiltCheck',
    description:
      'Pick 24 hours, 3, 7 or 30 days. The TiltCheck extension blocks casino deposit buttons until it is over. No wallet, no account, no deposit.',
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
  const depth = 'docs';
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
    <div style="margin-top: 1.5rem;">
      <a class="btn btn-primary" href="${href(depth, 'extension.html')}">THE EXTENSION</a>
    </div>
  </div>
</main>`;

  return shell({
    title: 'Win Skim | Profit Skimmer | TiltCheck',
    description: AUTOVAULT_PAGE.punch,
    depth: 'docs',
    current: 'wincheck',
    body: content,
  });
}

function buildDashboardPage() {
  const depth = 'docs';
  // Each card points at the tool's real controls, not its explainer page.
  // Web tools: deep link to the form on the tool page. Extension tools: the
  // settings live in the extension popup (gear icon opens Guards), which a web
  // link can't open, so those cards say where to look and carry no link.
  const webTools = [
    { name: 'TimeCheck', href: dirHref(depth, 'gate') + '#timecheck-setup-card', body: 'Pick your site, session timer and stop-loss.' },
    { name: 'RealityCheck', href: dirHref(depth, 'cooldown') + '#cooldown-length', body: 'Pick 24 hours, 3, 7 or 30 days, then lock.' },
    { name: 'Fairness Verifier', href: dirHref(depth, 'tools/verify') + '#verify-seeds', body: 'Paste the seeds and nonce. Check the bet yourself.' },
  ];
  const extensionTools = [
    { id: 'clickcheck', name: 'ClickCheck', body: 'Guards: switch the 2-second spin pause on or off.' },
    { id: 'nope-list', name: 'Nope List', body: 'Guards: pick the game types and titles that stop clicking.' },
    { id: 'sneaky-bet-alert', name: 'Sneaky Bet Alert', body: 'Guards: switch it on and set the stake that counts as sneaky.' },
    { id: 'keep-the-win', name: 'Keep the Win', body: 'Guards: switch the cancel-withdrawal blocker on or off.' },
    { id: 'win-skim', name: 'Win Skim', body: 'Guards: pick how much of a win to keep. Skim rules sit in the Vault tab.' },
  ];
  const webCards = webTools
    .map((t) => `<a class="dash-card dash-card--link" href="${t.href}">
        <h3 class="dash-card__name">${escapeHtml(t.name)} &rarr;</h3>
        <p class="dash-card__body">${escapeHtml(t.body)}</p>
      </a>`)
    .join('\n      ');
  const extCards = extensionTools
    .map((t) => `<div class="dash-card" id="${t.id}">
        <h3 class="dash-card__name">${escapeHtml(t.name)}</h3>
        <p class="dash-card__body">${escapeHtml(t.body)}</p>
        <span class="dash-card__tag">In the extension</span>
      </div>`)
    .join('\n      ');

  const content = `<main class="cooldown-page">
  <div class="cooldown-panel dash-panel">
    <p class="brand-eyebrow">DASHBOARD</p>
    <h1>Your TiltCheck stuff</h1>
    <p class="cooldown-punch">Where each tool's settings live.</p>

    <h2 class="dash-heading">Set it here</h2>
    <div class="dash-grid">
      ${webCards}
    </div>

    <h2 class="dash-heading" id="in-the-extension">Set in the extension</h2>
    <p class="dash-note">Open the TiltCheck extension and tap the gear. That opens Guards.</p>
    <div class="dash-grid">
      ${extCards}
      <div class="dash-card dash-card--soon" id="nudges">
        <h3 class="dash-card__name">Nudges</h3>
        <p class="dash-card__body">No settings yet. They pop up on their own.</p>
        <span class="dash-card__tag">Coming soon</span>
      </div>
    </div>

    <p class="dash-note">No extension yet? <a href="${href(depth, 'extension.html')}">Get it here</a>.</p>
  </div>
  <script>
    (function() {
      // Old links (and the extension's block screen) use ?tab=. Land on the matching card.
      var tab = new URLSearchParams(window.location.search).get('tab');
      var target = { safety: 'nope-list', vault: 'win-skim' }[tab];
      var el = target && document.getElementById(target);
      if (!el) return;
      el.classList.add('dash-card--focus');
      if (!window.location.hash && history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.search + '#' + target);
      if (el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    })();
  </script>
</main>`;

  return shell({
    title: 'Dashboard | TiltCheck',
    description: 'Where each TiltCheck tool is set up.',
    depth: 'docs',
    current: 'dashboard',
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

function buildRtpScannerPage() {
  const depth = "docs";
  let gameOptions = "";
  masterRtp.providers.forEach(function(prov) {
    prov.games.forEach(function(g) {
      gameOptions += "<option value=\"" + escapeHtml(g.gameSlug) + "\">" + escapeHtml(g.gameTitle) + " (" + escapeHtml(prov.providerName) + ") - Max " + g.maxRtp.toFixed(2) + "%</option>";
    });
  });

  const gamesJson = JSON.stringify(
    masterRtp.providers.flatMap(function(p) {
      return p.games.map(function(g) {
        return {
          slug: g.gameSlug,
          title: g.gameTitle,
          provider: p.providerName,
          maxRtp: g.maxRtp,
          tiers: g.certifiedTiers,
        };
      });
    })
  );

  const content = `<main class="cooldown-page">
  <div class="cooldown-panel" style="max-width: 840px; text-align: left;">
    <p class="brand-eyebrow">${escapeHtml(RTP_SCANNER_PAGE.eyebrow)}</p>
    <h1>${escapeHtml(RTP_SCANNER_PAGE.title)}</h1>
    <p class="cooldown-punch">${escapeHtml(RTP_SCANNER_PAGE.punch)}</p>
    
    <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); padding: 1.25rem; border-radius: 6px; margin: 1.5rem 0;">
      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 11px; font-family: monospace; text-transform: uppercase; color: #a0afbe; margin-bottom: 0.25rem;">Select Slot Title</label>
        <select id="slotSelect" style="width: 100%; background: #000; border: 1px solid #283347; color: #fff; padding: 0.5rem; font-family: monospace;" onchange="onSlotChange()">
          ${gameOptions}
        </select>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label style="display: block; font-size: 11px; font-family: monospace; text-transform: uppercase; color: #a0afbe; margin-bottom: 0.25rem;">Bet Per Spin (\$)</label>
          <input id="scanBet" type="number" step="0.5" value="1.0" min="0.1" style="width: 100%; background: #000; border: 1px solid #283347; color: #fff; padding: 0.5rem; font-family: monospace;" oninput="updateScanCalc()"/>
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-family: monospace; text-transform: uppercase; color: #a0afbe; margin-bottom: 0.25rem;">Spin Count</label>
          <input id="scanSpins" type="number" step="100" value="1000" min="10" style="width: 100%; background: #000; border: 1px solid #283347; color: #fff; padding: 0.5rem; font-family: monospace;" oninput="updateScanCalc()"/>
        </div>
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 11px; font-family: monospace; text-transform: uppercase; color: #a0afbe; margin-bottom: 0.25rem;">Selected Deployed Tier</label>
        <select id="tierSelect" style="width: 100%; background: #000; border: 1px solid #283347; color: #f4a261; padding: 0.5rem; font-family: monospace;" onchange="updateScanCalc()">
        </select>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-top: 1rem; border-top: 1px solid #283347; padding-top: 1rem;">
        <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 10px; font-family: monospace; color: #a0afbe; text-transform: uppercase;">Wager Volume</div>
          <div id="resWager" style="font-size: 1.1rem; font-family: monospace; font-weight: bold; color: #fff;">\$1,000.00</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 10px; font-family: monospace; color: #17c3b2; text-transform: uppercase;">Loss at Max RTP</div>
          <div id="resMaxLoss" style="font-size: 1.1rem; font-family: monospace; font-weight: bold; color: #17c3b2;">-\$35.00</div>
        </div>
        <div style="background: rgba(230,57,70,0.1); padding: 0.75rem; border: 1px solid rgba(230,57,70,0.3);">
          <div style="font-size: 10px; font-family: monospace; color: #e63946; text-transform: uppercase; font-weight: bold;">Hidden Greed Tax</div>
          <div id="resTax" style="font-size: 1.25rem; font-family: monospace; font-weight: 800; color: #e63946;">-\$20.00</div>
        </div>
      </div>
    </div>

    <div style="font-family: monospace; font-size: 12px; color: #a0afbe; line-height: 1.6; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 1rem; border-radius: 6px;">
      <strong style="color: #17c3b2;">HOW TO VERIFY LIVE IN-GAME:</strong> Open the slot on your casino tab. Click the (i) or (?) menu button and navigate to the final rules page. Gaming regulators legally mandate that the game declare its specific active return-to-player percentage on that rules slide.
    </div>

    <div style="margin-top: 1.5rem;">
      <a class="btn btn-primary" href="${href(depth, "extension.html")}">THE EXTENSION</a>
    </div>
  </div>
</main>
<script>
var gamesData = ` + gamesJson + `;

function onSlotChange() {
  var sel = document.getElementById("slotSelect");
  var slug = sel.value;
  var game = gamesData.find(function(g) { return g.slug === slug; });
  if (!game) return;
  var tierSelect = document.getElementById("tierSelect");
  tierSelect.innerHTML = "";
  game.tiers.forEach(function(t, idx) {
    var opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t.toFixed(2) + "%" + (idx === 0 ? " (Max Certified)" : " (Lowered Tier)");
    tierSelect.appendChild(opt);
  });
  if (game.tiers.length > 1) {
    tierSelect.selectedIndex = 1;
  }
  updateScanCalc();
}

function updateScanCalc() {
  var sel = document.getElementById("slotSelect");
  var slug = sel.value;
  var game = gamesData.find(function(g) { return g.slug === slug; });
  if (!game) return;

  var bet = parseFloat(document.getElementById("scanBet").value) || 1.0;
  var spins = parseInt(document.getElementById("scanSpins").value) || 1000;
  var tierSelect = document.getElementById("tierSelect");
  var deployedRtp = parseFloat(tierSelect.value) || game.maxRtp;

  var wager = bet * spins;
  var maxEdge = (100 - game.maxRtp) / 100;
  var depEdge = (100 - deployedRtp) / 100;

  var maxLoss = wager * maxEdge;
  var depLoss = wager * depEdge;
  var greedTax = depLoss - maxLoss;

  document.getElementById("resWager").textContent = "$" + wager.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById("resMaxLoss").textContent = "-$" + maxLoss.toFixed(2);
  document.getElementById("resTax").textContent = greedTax > 0 ? "-$" + greedTax.toFixed(2) : "$0.00";
}
window.addEventListener("DOMContentLoaded", onSlotChange);
</script>`;

  return shell({
    title: "Slot RTP Downgrade Scanner | TiltCheck",
    description: "Inspect multi-tier RTP downgrades and calculate the hidden casino Greed Tax per session.",
    depth: "docs",
    current: "rtp-scanner",
    body: content,
  });
}

function buildRtpScannerRedirect() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0; url=../../rtp-scanner/"/>
<link rel="canonical" href="${SITE_URL}/rtp-scanner/"/>
<title>Slot RTP Downgrade Scanner | TiltCheck</title>
</head>
<body>
<p><a href="../../rtp-scanner/">Slot RTP Downgrade Scanner lives here</a></p>
</body>
</html>`;
}

function buildVerifyPage() {
  const depth = "nested";
  const presetsJson = "[{\"id\":\"stake\",\"tag\":\"STAKE DICE/LIMBO\",\"serverSeed\":\"d01247ff421a9fbdf4ee920fb62d22a7f5a11c8cb404c278072d62ee5d7a6e13\",\"committedHash\":\"8556eca62c36f651bb268841e99356e0db84d6f5609fb2c19753f3876593e551\",\"clientSeed\":\"stake_session_verifier_audit\",\"nonce\":1,\"edge\":1},{\"id\":\"roobet\",\"tag\":\"ROOBET CRASH\",\"serverSeed\":\"7b52009b64fd0a2a49e6d8a939753077792b0554372452856d7bdaf446022906\",\"committedHash\":\"06b34d05f70bfdfdd0e114a1f14d4a32435634279595a3f6c9857b4732bf29c3\",\"clientSeed\":\"roobet_verifier_audit_alpha\",\"nonce\":42,\"edge\":1},{\"id\":\"bcgame\",\"tag\":\"BC.GAME LIMBO\",\"serverSeed\":\"fe8b4172776c5b96791e0a296b79743c988b4ef84ebda3f789069d30c5e7b57b\",\"committedHash\":\"1a5d0fbf55362cc1d231b1e5a9550ee47bf3a9912a2a35ae3b007a6e00dcc578\",\"clientSeed\":\"bcgame_high_roller_verifier\",\"nonce\":100,\"edge\":1}]";

  const content = `<main class="cooldown-page">
  <div class="cooldown-panel" style="max-width: 920px; text-align: left;">
    <p class="brand-eyebrow">${escapeHtml(VERIFY_PAGE.eyebrow)}</p>
    <h1>${escapeHtml(VERIFY_PAGE.title)}</h1>
    <p class="cooldown-punch">${escapeHtml(VERIFY_PAGE.punch)}</p>

    <div id="verify-seeds" style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); padding: 1.25rem; border-radius: 6px; margin: 1.5rem 0;">
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid #283347; padding-bottom: 0.75rem;">
        <span style="font-size: 11px; font-family: monospace; text-transform: uppercase; color: #a0afbe;">Sample Presets:</span>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" onclick="loadVerifyPreset(0)" style="background: #000; border: 1px solid #283347; color: #17c3b2; padding: 0.35rem 0.65rem; font-family: monospace; font-size: 10px; font-weight: bold; cursor: pointer;">[STAKE DICE]</button>
          <button type="button" onclick="loadVerifyPreset(1)" style="background: #000; border: 1px solid #283347; color: #17c3b2; padding: 0.35rem 0.65rem; font-family: monospace; font-size: 10px; font-weight: bold; cursor: pointer;">[ROOBET CRASH]</button>
          <button type="button" onclick="loadVerifyPreset(2)" style="background: #000; border: 1px solid #283347; color: #17c3b2; padding: 0.35rem 0.65rem; font-family: monospace; font-size: 10px; font-weight: bold; cursor: pointer;">[BC.GAME LIMBO]</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label style="display: block; font-size: 10px; font-family: monospace; text-transform: uppercase; color: #17c3b2; margin-bottom: 0.25rem; font-weight: bold;">Revealed Server Seed</label>
          <input id="vfServerSeed" type="text" style="width: 100%; background: #000; border: 1px solid #283347; color: #fff; padding: 0.5rem; font-family: monospace; font-size: 12px;" oninput="runVerifyCalc()"/>
        </div>

        <div>
          <label style="display: block; font-size: 10px; font-family: monospace; text-transform: uppercase; color: #17c3b2; margin-bottom: 0.25rem; font-weight: bold;">Committed Server Seed Hash (SHA-256)</label>
          <input id="vfCommittedHash" type="text" style="width: 100%; background: #000; border: 1px solid #283347; color: #fff; padding: 0.5rem; font-family: monospace; font-size: 12px;" oninput="runVerifyCalc()"/>
          <div id="vfPreCommitStatus" style="margin-top: 0.35rem; font-family: monospace; font-size: 11px; padding: 0.35rem 0.5rem; border: 1px solid #283347; background: rgba(0,0,0,0.4); color: #a0afbe;"></div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.75rem;">
          <div>
            <label style="display: block; font-size: 10px; font-family: monospace; text-transform: uppercase; color: #17c3b2; margin-bottom: 0.25rem; font-weight: bold;">Client Seed</label>
            <input id="vfClientSeed" type="text" style="width: 100%; background: #000; border: 1px solid #283347; color: #fff; padding: 0.5rem; font-family: monospace; font-size: 12px;" oninput="runVerifyCalc()"/>
          </div>
          <div>
            <label style="display: block; font-size: 10px; font-family: monospace; text-transform: uppercase; color: #17c3b2; margin-bottom: 0.25rem; font-weight: bold;">Nonce</label>
            <input id="vfNonce" type="number" min="0" step="1" value="1" style="width: 100%; background: #000; border: 1px solid #283347; color: #fff; padding: 0.5rem; font-family: monospace; font-size: 12px;" oninput="runVerifyCalc()"/>
          </div>
          <div>
            <label style="display: block; font-size: 10px; font-family: monospace; text-transform: uppercase; color: #17c3b2; margin-bottom: 0.25rem; font-weight: bold;">House Edge %</label>
            <input id="vfEdge" type="number" min="0" max="10" step="0.1" value="1.0" style="width: 100%; background: #000; border: 1px solid #283347; color: #fff; padding: 0.5rem; font-family: monospace; font-size: 12px;" oninput="runVerifyCalc()"/>
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid #283347; padding-top: 1rem; margin-top: 1rem;">
        <div style="margin-bottom: 0.75rem; background: rgba(0,0,0,0.7); border: 1px solid #283347; padding: 0.75rem;">
          <div style="font-size: 10px; font-family: monospace; color: #a0afbe; text-transform: uppercase;">HMAC-SHA256 Signature</div>
          <div id="vfHash" style="font-size: 11px; font-family: monospace; color: #17c3b2; word-break: break-all; margin-top: 0.25rem;"></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
          <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <div style="font-size: 9px; font-family: monospace; color: #17c3b2; text-transform: uppercase; font-weight: bold;">Dice (0-100)</div>
            <div id="vfDice" style="font-size: 1.25rem; font-family: monospace; font-weight: bold; color: #fff;">--</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <div style="font-size: 9px; font-family: monospace; color: #17c3b2; text-transform: uppercase; font-weight: bold;">Limbo / Crash</div>
            <div id="vfCrash" style="font-size: 1.25rem; font-family: monospace; font-weight: bold; color: #fff;">--</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <div style="font-size: 9px; font-family: monospace; color: #17c3b2; text-transform: uppercase; font-weight: bold;">Roulette Pocket</div>
            <div id="vfRoulette" style="font-size: 1.25rem; font-family: monospace; font-weight: bold; color: #fff;">--</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <div style="font-size: 9px; font-family: monospace; color: #17c3b2; text-transform: uppercase; font-weight: bold;">Plinko Slot (12)</div>
            <div id="vfPlinko" style="font-size: 1.25rem; font-family: monospace; font-weight: bold; color: #fff;">--</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 0.65rem; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <div style="font-size: 9px; font-family: monospace; color: #17c3b2; text-transform: uppercase; font-weight: bold;">Normalized Float</div>
            <div id="vfFloat" style="font-size: 1.1rem; font-family: monospace; font-weight: bold; color: #fff;">--</div>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.4); border: 1px solid #283347; padding: 0.75rem; text-align: center;">
          <div style="font-size: 10px; font-family: monospace; color: #a0afbe; text-transform: uppercase; margin-bottom: 0.35rem;">Mines Positions (3 Mines in 25 Tiles)</div>
          <div id="vfMines" style="font-size: 12px; font-family: monospace; color: #ef4444; font-weight: bold;">--</div>
        </div>
      </div>
    </div>

    <div style="font-family: monospace; font-size: 12px; color: #a0afbe; line-height: 1.6; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 1rem; border-radius: 6px;">
      <strong style="color: #17c3b2;">PROVABLY FAIR GUARANTEE:</strong> Single-round HMAC-SHA256 mathematical derivation confirms that round outcomes were deterministic and could not be altered once seeds were committed. It does not measure long-term RTP drops or platform solvency.
    </div>

    <div style="margin-top: 1.5rem;">
      <a class="btn btn-primary" href="${href(depth, "extension.html")}">THE EXTENSION</a>
    </div>
  </div>
</main>
<script>
var presets = [{"id":"stake","tag":"STAKE DICE/LIMBO","serverSeed":"d01247ff421a9fbdf4ee920fb62d22a7f5a11c8cb404c278072d62ee5d7a6e13","committedHash":"8556eca62c36f651bb268841e99356e0db84d6f5609fb2c19753f3876593e551","clientSeed":"stake_session_verifier_audit","nonce":1,"edge":1},{"id":"roobet","tag":"ROOBET CRASH","serverSeed":"7b52009b64fd0a2a49e6d8a939753077792b0554372452856d7bdaf446022906","committedHash":"06b34d05f70bfdfdd0e114a1f14d4a32435634279595a3f6c9857b4732bf29c3","clientSeed":"roobet_verifier_audit_alpha","nonce":42,"edge":1},{"id":"bcgame","tag":"BC.GAME LIMBO","serverSeed":"fe8b4172776c5b96791e0a296b79743c988b4ef84ebda3f789069d30c5e7b57b","committedHash":"1a5d0fbf55362cc1d231b1e5a9550ee47bf3a9912a2a35ae3b007a6e00dcc578","clientSeed":"bcgame_high_roller_verifier","nonce":100,"edge":1}];
var RED_ROULETTE = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

async function sha256Hex(str) {
  var enc = new TextEncoder();
  var buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
}

async function hmacSha256Hex(keyStr, msgStr) {
  var enc = new TextEncoder();
  var keyData = enc.encode(keyStr);
  var key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  var sig = await crypto.subtle.sign("HMAC", key, enc.encode(msgStr));
  return Array.from(new Uint8Array(sig)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
}

function loadVerifyPreset(idx) {
  var p = presets[idx];
  if (!p) return;
  document.getElementById("vfServerSeed").value = p.serverSeed;
  document.getElementById("vfCommittedHash").value = p.committedHash;
  document.getElementById("vfClientSeed").value = p.clientSeed;
  document.getElementById("vfNonce").value = p.nonce;
  document.getElementById("vfEdge").value = p.edge;
  runVerifyCalc();
}

async function runVerifyCalc() {
  var sSeed = (document.getElementById("vfServerSeed").value || "").trim();
  var cHash = (document.getElementById("vfCommittedHash").value || "").trim().toLowerCase();
  var cSeed = (document.getElementById("vfClientSeed").value || "").trim();
  var nonce = parseInt(document.getElementById("vfNonce").value, 10) || 0;
  var edge = parseFloat(document.getElementById("vfEdge").value) || 1.0;

  var statusEl = document.getElementById("vfPreCommitStatus");
  if (!sSeed) {
    statusEl.textContent = "Awaiting Server Seed input...";
    statusEl.style.color = "#a0afbe";
    statusEl.style.borderColor = "#283347";
    return;
  }

  var calcHash = await sha256Hex(sSeed);
  if (!cHash) {
    statusEl.textContent = "[PRE-COMMITMENT] Calculated SHA-256: " + calcHash + " (Paste pre-bet hash to verify)";
    statusEl.style.color = "#a0afbe";
    statusEl.style.borderColor = "#283347";
  } else if (calcHash === cHash) {
    statusEl.textContent = "[MATCH] Verified: Server Seed strictly matches pre-bet commitment hash.";
    statusEl.style.color = "#17c3b2";
    statusEl.style.borderColor = "#17c3b2";
  } else {
    statusEl.textContent = "[ALERT] Hash mismatch! Calculated: " + calcHash + " != Committed: " + cHash;
    statusEl.style.color = "#ef4444";
    statusEl.style.borderColor = "#ef4444";
  }

  if (!cSeed) return;

  var msg = cSeed + ":" + nonce;
  var hmac = await hmacSha256Hex(sSeed, msg);
  document.getElementById("vfHash").textContent = hmac;

  var sub = hmac.substring(0, 8);
  var intVal = parseInt(sub, 16);
  var flt = intVal / 0xffffffff;
  document.getElementById("vfFloat").textContent = flt.toFixed(8);

  var dice = Math.min(100.0, Math.floor(flt * 10001) / 100);
  document.getElementById("vfDice").textContent = dice.toFixed(2);

  var crash = flt === 1 ? 1000000 : Math.floor(((1 - (edge / 100)) / (1 - flt)) * 100) / 100;
  document.getElementById("vfCrash").textContent = crash.toFixed(2) + "x";

  var pocket = Math.floor(flt * 37);
  var pColor = pocket === 0 ? "Green" : (RED_ROULETTE.indexOf(pocket) !== -1 ? "Red" : "Black");
  document.getElementById("vfRoulette").textContent = pocket + " (" + pColor + ")";

  var rights = 0;
  for (var i = 0; i < 12; i++) {
    var b = parseInt(hmac.substring(i * 2, i * 2 + 2), 16) || 0;
    if (b % 2 !== 0) rights++;
  }
  document.getElementById("vfPlinko").textContent = "Slot " + rights + " / 12";

  var tiles = [];
  for (var t = 0; t < 25; t++) tiles.push(t + 1);
  var mines = [];
  for (var m = 0; m < 3; m++) {
    var mb = parseInt(hmac.substring(m * 2, m * 2 + 2), 16) || 0;
    var idx = mb % tiles.length;
    mines.push(tiles.splice(idx, 1)[0]);
  }
  mines.sort(function(a, b) { return a - b; });
  document.getElementById("vfMines").textContent = "Tiles: #" + mines.join(", #");
}

window.addEventListener("DOMContentLoaded", function() {
  loadVerifyPreset(0);
});
</script>`;

  return shell({
    title: "Provably Fair HMAC-SHA256 Seed Verifier | TiltCheck",
    description: "Recompute and audit casino outcomes (Dice, Limbo, Crash, Roulette, Plinko, Mines) client-side.",
    depth,
    current: "verify",
    body: content,
  });
}

function buildVerifyDirectRedirect() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0; url=../tools/verify/"/>
<link rel="canonical" href="${SITE_URL}/tools/verify/"/>
<title>Provably Fair HMAC-SHA256 Seed Verifier | TiltCheck</title>
</head>
<body>
<p><a href="../tools/verify/">Provably Fair Bet Verifier lives here</a></p>
</body>
</html>`;
}

function buildHouseEdgePage() {
  const depth = "nested";

  const content = `${productHero({
    eyebrow: "House Edge Scanner",
    title: "VIP Churn & House Edge Scanner",
    lede: "Calculate the mathematical cost of casino VIP ladders, wagering requirements, and comp rewards. Progress bars are psychological sunk-cost hooks designed to disguise expected negative EV.",
    actionsHtml: `<a class="btn btn-primary" href="${href(depth, "extension.html")}">The Extension</a>
    <a class="hero-actions__secondary-link" href="${dirHref(depth, "tools")}">All Tools</a>`,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="mathcheck-tabs-bar">
        <span class="mathcheck-tabs-label">Loyalty Model Preset:</span>
        <div class="mathcheck-tabs-group" role="tablist">
          <button type="button" class="mathcheck-tab is-active" data-casino="stake" role="tab" aria-selected="true" onclick="selectVipCasino('stake')">Stake VIP</button>
          <button type="button" class="mathcheck-tab" data-casino="roobet" role="tab" aria-selected="false" onclick="selectVipCasino('roobet')">Roobet Roowards</button>
          <button type="button" class="mathcheck-tab" data-casino="bcgame" role="tab" aria-selected="false" onclick="selectVipCasino('bcgame')">BC.Game VIP</button>
          <button type="button" class="mathcheck-tab" data-casino="sweeps" role="tab" aria-selected="false" onclick="selectVipCasino('sweeps')">Sweepstakes VIP</button>
        </div>
      </div>

      <div class="mathcheck-grid">
        <div class="mathcheck-card mathcheck-inputs-card">
          <div class="mathcheck-card-header">
            <span class="mathcheck-section-badge">Input Parameters</span>
            <h2 class="mathcheck-card-title">Wagering Configuration</h2>
          </div>

          <div class="mathcheck-form-group">
            <label class="mathcheck-label" for="heTierSelect">Milestone Tier Target</label>
            <select id="heTierSelect" class="mathcheck-select" onchange="onVipTierChange()"></select>
            <span class="mathcheck-form-hint">Presets populate standard tier turnover thresholds and unlock rewards.</span>
          </div>

          <div class="mathcheck-form-group">
            <label class="mathcheck-label" for="heGameSelect">Game Category &amp; House Edge</label>
            <select id="heGameSelect" class="mathcheck-select" onchange="onVipGameChange()">
              <option value="1.0:100">Casino Originals (1.0% Edge - 100% Contribution)</option>
              <option value="3.5:100" selected>Certified Slots (3.5% Edge - 100% Contribution)</option>
              <option value="4.5:100">Average Industry Slots (4.5% Edge - 100% Contribution)</option>
              <option value="6.0:100">Downgraded Slots (6.0% Edge - 100% Contribution)</option>
              <option value="10.0:100">Severe Downgrade Slots (10.0% Edge - 100% Contribution)</option>
              <option value="0.5:20">Live Blackjack (0.5% Edge - 20% Throttled Weight)</option>
              <option value="2.7:50">European Roulette (2.7% Edge - 50% Throttled Weight)</option>
            </select>
            <span class="mathcheck-form-hint">Notice: Table games throttled to 20% contribution multiply required turnover 5x.</span>
          </div>

          <div class="mathcheck-form-grid-2x2">
            <div class="mathcheck-form-group">
              <label class="mathcheck-label" for="heCurrentWager">Current Wager ($)</label>
              <input id="heCurrentWager" class="mathcheck-input" type="number" min="0" value="100000" oninput="updateVipCalc()"/>
            </div>
            <div class="mathcheck-form-group">
              <label class="mathcheck-label" for="heTargetWager">Target Tier ($)</label>
              <input id="heTargetWager" class="mathcheck-input" type="number" min="0" value="250000" oninput="updateVipCalc()"/>
            </div>
            <div class="mathcheck-form-group">
              <label class="mathcheck-label" for="heReward">Tier Reward ($)</label>
              <input id="heReward" class="mathcheck-input" type="number" min="0" value="220" oninput="updateVipCalc()"/>
            </div>
            <div class="mathcheck-form-group">
              <label class="mathcheck-label" for="heBetSize">Bet Size ($)</label>
              <input id="heBetSize" class="mathcheck-input" type="number" step="0.5" min="0.1" value="2.0" oninput="updateVipCalc()"/>
            </div>
          </div>
        </div>

        <div class="mathcheck-card mathcheck-results-card">
          <div class="mathcheck-results-header">
            <div>
              <span class="mathcheck-section-badge">Live Audit</span>
              <h2 class="mathcheck-card-title">Mathematical Reality</h2>
            </div>
            <span id="heSeverityBadge" class="mathcheck-badge">PREDATORY CHURN</span>
          </div>

          <div id="heDeficitContainer" class="mathcheck-deficit-box">
            <div class="mathcheck-deficit-label">Net Statistical Deficit (True Cost to Unlock)</div>
            <div id="heNetDeficit" class="mathcheck-deficit-value">-$5,030.00</div>
            <div class="mathcheck-deficit-sub">Expected loss incurred during wagering minus the unlocked reward value.</div>
          </div>

          <div class="mathcheck-stats-grid">
            <div class="mathcheck-stat-tile">
              <span class="mathcheck-stat-label">Effective Turnover</span>
              <div id="heTurnover" class="mathcheck-stat-value">$150,000</div>
              <span class="mathcheck-stat-hint">Adjusted for game weighting</span>
            </div>
            <div class="mathcheck-stat-tile">
              <span class="mathcheck-stat-label">Expected House Loss</span>
              <div id="heExpLoss" class="mathcheck-stat-value mathcheck-val--loss">-$5,250.00</div>
              <span class="mathcheck-stat-hint">Statistical EV at chosen edge</span>
            </div>
            <div class="mathcheck-stat-tile">
              <span class="mathcheck-stat-label">Comp Return Ratio</span>
              <div id="heCompRatio" class="mathcheck-stat-value mathcheck-val--accent">4.19%</div>
              <span class="mathcheck-stat-hint">Reward value vs expected loss</span>
            </div>
            <div class="mathcheck-stat-tile">
              <span class="mathcheck-stat-label">House Retained</span>
              <div id="heHouseKeep" class="mathcheck-stat-value">95.81%</div>
              <span class="mathcheck-stat-hint">Casino retains the difference</span>
            </div>
            <div class="mathcheck-stat-tile">
              <span class="mathcheck-stat-label">Spins Required</span>
              <div id="heSpins" class="mathcheck-stat-value">75,000</div>
              <span class="mathcheck-stat-hint">At chosen bet size</span>
            </div>
            <div class="mathcheck-stat-tile">
              <span class="mathcheck-stat-label">Play Duration</span>
              <div id="heDuration" class="mathcheck-stat-value">~72.9 hrs</div>
              <span class="mathcheck-stat-hint">At ~3.5s per spin</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mathcheck-callout">
        <div class="mathcheck-callout-icon">!</div>
        <div>
          <h3 class="mathcheck-callout-title">The VIP Ladder Illusion</h3>
          <p class="mathcheck-callout-text">VIP progress bars exploit the <strong>sunk cost fallacy</strong> and goal gradient effect. In over 95% of tier grinds, the mathematical expected loss to level up dwarfs the cash reward by 10x to 40x. Never wager additional volume solely to unlock a VIP milestone.</p>
        </div>
      </div>

      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Mechanics Audit</span>
        <h2 class="public-page-section-heading__title">Why VIP ladders are mathematically predatory.</h2>
      </div>

      <div class="public-page-grid public-page-grid--3" style="margin-top: 1.5rem;">
        <article class="public-page-card">
          <span class="public-page-card__eyebrow">CONTRIBUTION CUTS</span>
          <h3 class="public-page-card__title">The Game Weighting Trap</h3>
          <p class="public-page-card__copy">Table games like Blackjack (0.5% edge) and Roulette (2.7% edge) are throttled to 10%–20% wager contribution. Reaching a $100,000 tier requires $500,000 to $1,000,000 in actual bets, multiplying your dollar loss by 5x to 10x.</p>
        </article>
        <article class="public-page-card">
          <span class="public-page-card__eyebrow">ASYMMETRIC RETURNS</span>
          <h3 class="public-page-card__title">The 90%+ Retention Trap</h3>
          <p class="public-page-card__copy">Even with rakeback and tier bonuses factored in, casinos retain between 85% and 97% of expected house loss. Players spend $3,000 to $15,000 in statistical negative EV to unlock a $100 to $300 milestone bonus.</p>
        </article>
        <article class="public-page-card">
          <span class="public-page-card__eyebrow">COGNITIVE BIAS</span>
          <h3 class="public-page-card__title">The Goal Gradient Hook</h3>
          <p class="public-page-card__copy">As your progress bar passes 80%, loss aversion and urgency spike. Players increase bet sizes and session velocity to "finish the level", driving tilt, drawdown velocity, and inevitable bankroll bustout.</p>
        </article>
      </div>

      <div style="margin-top: 2.5rem; background: #090d13; border: 1px solid var(--border-default); border-radius: 12px; padding: 1.75rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.25rem;">
        <div>
          <span class="brand-eyebrow">On-Device Protection</span>
          <h3 style="color: #f6fbff; margin: 0.25rem 0 0.5rem; font-size: 1.25rem;">Kill the churn in real-time.</h3>
          <p style="color: #94a3b8; margin: 0; font-size: 0.9rem; max-width: 34rem; line-height: 1.5;">Install the TiltCheck browser extension. Our client-side spotter detects hidden RTP drops, limits bet velocity, and enforces non-custodial session cooldowns.</p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <a class="btn btn-primary" href="${href(depth, "extension.html")}">The Extension</a>
          <a class="btn btn-secondary" href="${dirHref(depth, "cooldown")}">Touch Grass</a>
        </div>
      </div>
    </div>
  </section>
</main>
<script>
var vipData = {
  stake: [
    { name: "Bronze ($10k Wager)", target: 10000, reward: 15 },
    { name: "Silver ($50k Wager)", target: 50000, reward: 50 },
    { name: "Gold ($100k Wager)", target: 100000, reward: 110 },
    { name: "Platinum I ($250k Wager)", target: 250000, reward: 220 },
    { name: "Platinum II ($500k Wager)", target: 500000, reward: 440 },
    { name: "Platinum III ($1.0M Wager)", target: 1000000, reward: 880 },
    { name: "Platinum IV ($2.5M Wager)", target: 2500000, reward: 1600 }
  ],
  roobet: [
    { name: "Level 1 ($1k Wager)", target: 1000, reward: 2 },
    { name: "Level 5 ($25k Wager)", target: 25000, reward: 35 },
    { name: "Level 10 ($100k Wager)", target: 100000, reward: 120 },
    { name: "VIP Elite ($500k Wager)", target: 500000, reward: 650 }
  ],
  bcgame: [
    { name: "Bronze VIP 8 ($4k Wager)", target: 4000, reward: 6 },
    { name: "Silver VIP 22 ($50k Wager)", target: 50000, reward: 60 },
    { name: "Gold VIP 38 ($200k Wager)", target: 200000, reward: 240 },
    { name: "Platinum VIP 56 ($1.0M Wager)", target: 1000000, reward: 1100 }
  ],
  sweeps: [
    { name: "Bronze Tier (5,000 SC)", target: 5000, reward: 10 },
    { name: "Silver Tier (25,000 SC)", target: 25000, reward: 50 },
    { name: "Gold Tier (100,000 SC)", target: 100000, reward: 180 },
    { name: "Platinum Tier (500,000 SC)", target: 500000, reward: 900 }
  ]
};

var currentVipKey = "stake";

function selectVipCasino(key) {
  currentVipKey = key;
  var btns = document.querySelectorAll('.mathcheck-tab');
  btns.forEach(function(btn) {
    var match = btn.getAttribute('data-casino') === key;
    btn.classList.toggle('is-active', match);
    btn.setAttribute('aria-selected', match ? 'true' : 'false');
  });
  var sel = document.getElementById("heTierSelect");
  sel.innerHTML = "";
  var list = vipData[key] || vipData.stake;
  list.forEach(function(item, idx) {
    var opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = item.name + " - $" + item.reward.toLocaleString() + " reward";
    sel.appendChild(opt);
  });
  sel.selectedIndex = list.length > 3 ? 3 : 0;
  onVipTierChange();
}

function onVipTierChange() {
  var sel = document.getElementById("heTierSelect");
  var list = vipData[currentVipKey] || vipData.stake;
  var item = list[sel.selectedIndex] || list[0];
  document.getElementById("heTargetWager").value = item.target;
  document.getElementById("heReward").value = item.reward;
  document.getElementById("heCurrentWager").value = Math.floor(item.target * 0.4);
  updateVipCalc();
}

function onVipGameChange() {
  updateVipCalc();
}

function updateVipCalc() {
  var cur = parseFloat(document.getElementById("heCurrentWager").value) || 0;
  var tgt = parseFloat(document.getElementById("heTargetWager").value) || 0;
  var rew = parseFloat(document.getElementById("heReward").value) || 0;
  var bet = parseFloat(document.getElementById("heBetSize").value) || 1.0;

  var gameParts = (document.getElementById("heGameSelect").value || "3.5:100").split(":");
  var edge = parseFloat(gameParts[0]) || 3.5;
  var weight = parseFloat(gameParts[1]) || 100;

  var nominal = Math.max(0, tgt - cur);
  var effective = nominal / (weight / 100);
  var expLoss = effective * (edge / 100);
  var deficit = Math.max(0, expLoss - rew);

  var compRatio = expLoss > 0 ? Math.min(100, (rew / expLoss) * 100) : 0;
  var houseRetained = Math.max(0, 100 - compRatio);
  var spins = Math.ceil(effective / bet);
  var hrs = (spins * 3.5) / 3600;

  document.getElementById("heNetDeficit").textContent = "-$" + deficit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById("heTurnover").textContent = "$" + Math.round(effective).toLocaleString();
  document.getElementById("heExpLoss").textContent = "-$" + expLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById("heCompRatio").textContent = compRatio.toFixed(2) + "%";
  document.getElementById("heHouseKeep").textContent = houseRetained.toFixed(2) + "%";
  document.getElementById("heSpins").textContent = spins.toLocaleString();
  document.getElementById("heDuration").textContent = "~" + hrs.toFixed(1) + " hrs";

  var badge = document.getElementById("heSeverityBadge");
  var box = document.getElementById("heDeficitContainer");
  if (compRatio >= 25) {
    badge.textContent = "MILD CHURN";
    badge.style.color = "#22c55e";
    badge.style.borderColor = "#22c55e";
    badge.style.background = "rgba(34,197,94,0.12)";
    if (box) {
      box.style.background = "rgba(34,197,94,0.06)";
      box.style.borderColor = "rgba(34,197,94,0.25)";
    }
  } else if (compRatio >= 10) {
    badge.textContent = "MODERATE CHURN";
    badge.style.color = "#ffd700";
    badge.style.borderColor = "#ffd700";
    badge.style.background = "rgba(255,215,0,0.12)";
    if (box) {
      box.style.background = "rgba(255,215,0,0.06)";
      box.style.borderColor = "rgba(255,215,0,0.25)";
    }
  } else if (compRatio >= 3) {
    badge.textContent = "PREDATORY CHURN";
    badge.style.color = "#ef4444";
    badge.style.borderColor = "#ef4444";
    badge.style.background = "rgba(239,68,68,0.12)";
    if (box) {
      box.style.background = "rgba(239,68,68,0.08)";
      box.style.borderColor = "rgba(239,68,68,0.28)";
    }
  } else {
    badge.textContent = "EXTREME CHURN";
    badge.style.color = "#ef4444";
    badge.style.borderColor = "#ef4444";
    badge.style.background = "rgba(239,68,68,0.22)";
    if (box) {
      box.style.background = "rgba(239,68,68,0.14)";
      box.style.borderColor = "rgba(239,68,68,0.4)";
    }
  }
}

window.addEventListener("DOMContentLoaded", function() {
  selectVipCasino("stake");
});
</script>`;

  return shell({
    title: "House Edge Scanner — VIP Churn & House Edge | TiltCheck",
    description: "Calculate what chasing VIP tier bonuses actually costs in statistical expected loss, true wagering volume, and comp return ratios.",
    depth,
    current: "tools",
    body: content,
  });
}

function buildHouseEdgeRedirect() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0; url=../tools/house-edge-scanner/"/>
<link rel="canonical" href="${SITE_URL}/tools/house-edge-scanner/"/>
<title>VIP Churn & House Edge Scanner | TiltCheck</title>
</head>
<body>
<p><a href="../tools/house-edge-scanner/">VIP Churn & House Edge Scanner lives here</a></p>
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
  const depth = 'docs';
  const tools = TOOL_REGISTRY.map(
    (t) => `<article class="public-page-card tool-card">
  <div class="tool-card__meta">
    <h3 class="public-page-card__title">${escapeHtml(t.title)}</h3>
    <span class="status-pill status-pill--${escapeHtml(t.status)}">${escapeHtml(t.status)}</span>
  </div>
  <p class="public-page-card__copy">${escapeHtml(t.description)}</p>
  <a class="feature-card__link" href="${mapPublicHref(depth, t.href)}">${t.href === '/extension' ? 'In the extension' : 'Launch tool'} &rarr;</a>
</article>`,
  ).join('\n');

  const content = `${productHero({
    eyebrow: 'Degen-built tools',
    title: 'The Anti-Tilt Toolkit',
    lede: 'Friction, receipts, and a little trash talk. Every tool we built, in one place. No login. We never hold your money. The willpower part is still on you.',
    actionsHtml: `<a class="btn btn-primary" href="${href(depth, 'extension.html')}">The Extension</a>`,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Everything</span>
        <h2 class="public-page-section-heading__title">Pick your poison.</h2>
      </div>
      <div class="public-page-grid public-page-grid--2">${tools}</div>
    </div>
  </section>
</main>`;

  return shell({
    title: 'Tools | The Anti-Tilt Toolkit | TiltCheck',
    description: 'Every TiltCheck tool: two-second spin pause, cancel-withdrawal blocker, loss speed meter, RTP downgrade scanner, and bet verifier.',
    depth: 'docs',
    current: 'tools',
    body: content,
  });
}

function buildLoginPage() {
  const discordHref = DISCORD_OAUTH_LOGIN_URL;
  const content = `<header class="product-hero">
  <div class="landing-shell">
    <span class="brand-eyebrow">Access Portal</span>
    <div data-tc-signed-out>
      <h1 class="product-hero__title">Sign in with Discord</h1>
      <p class="product-hero__lede">Sign in to access your saved settings, sync vault rules, and check staff verifications. 100% non-custodial.</p>
      <div class="hero-actions hero-actions--start">
        <a class="btn btn-primary" href="${discordHref}" data-provider="discord" style="display:inline-flex; align-items:center; gap:8px;">${DISCORD_ICON}<span>Sign in with Discord</span></a>
        <a class="hero-actions__secondary-link" href="${href('docs', 'index.html')}">Back home</a>
      </div>
    </div>
    <div data-tc-signed-in>
      <h1 class="product-hero__title">You're in.</h1>
      <div id="login-status-box" class="login-card">
        <img class="login-card__avatar" data-tc-user-avatar src="https://cdn.discordapp.com/embed/avatars/0.png" alt="" width="56" height="56" referrerpolicy="no-referrer"/>
        <div class="login-card__text">
          <span class="login-card__label">Signed In with Discord</span>
          <span id="login-username" class="login-card__name">Welcome, <span data-tc-user-name></span></span>
          <span class="login-card__staff" data-tc-staff-badge hidden>Staff</span>
        </div>
      </div>
      <div class="hero-actions hero-actions--start">
        <a class="btn btn-primary" href="${dirHref('docs', 'dashboard')}">Your dashboard</a>
        <a class="hero-actions__secondary-link" href="${dirHref('docs', 'login')}" id="login-signout">Sign out</a>
      </div>
    </div>
  </div>
</header>
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <p id="login-error" class="error" role="alert" hidden>Discord sign-in failed or was cancelled. Try again.</p>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid #1e293b; border-radius: 8px; padding: 1.25rem; max-width: 540px; margin-top: 1rem;">
        <h3 style="font-size: 0.95rem; color: #fff; margin-bottom: 0.5rem;">Looking for the Community Server?</h3>
        <p class="public-page-card__copy" style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">
          To chat with other players, report bugs, or get live support, join the official TiltCheck Discord server.
        </p>
        <a href="${DISCORD_INVITE_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="font-size: 0.85rem;">Join TiltCheck Server &rarr;</a>
      </div>
    </div>
  </section>
</main>
<script>
(function () {
  function refresh() { if (window.tcAuth) window.tcAuth.render(); }
  var params = new URLSearchParams(window.location.search);
  if (params.get('error')) {
    var el = document.getElementById('login-error');
    if (el) el.hidden = false;
  }
  var out = document.getElementById('login-signout');
  if (out) {
    out.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.tcAuth) window.tcAuth.signOut();
      else {
        try { localStorage.removeItem('tc_token'); localStorage.removeItem('tc_user'); localStorage.removeItem('tc_token_exp'); } catch (err) {}
        document.documentElement.classList.remove('tc-signed-in');
      }
    });
  }
  var hash = window.location.hash.substring(1);
  if (hash) {
    var hashParams = new URLSearchParams(hash);
    var token = hashParams.get('access_token') || hashParams.get('token');
    if (token) {
      var expiresIn = Number(hashParams.get('expires_in') || 0);
      // Keep the token out of the address bar and history.
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
      try {
        localStorage.setItem('tc_token', token);
        if (expiresIn > 0) localStorage.setItem('tc_token_exp', String(Date.now() + expiresIn * 1000));
        else localStorage.removeItem('tc_token_exp');
      } catch (e) {}
      fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: 'Bearer ' + token }
      })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(user) {
          if (user && user.id) {
            try {
              localStorage.setItem('tc_user', JSON.stringify(user));
            } catch (e) {}
          } else {
            try { localStorage.removeItem('tc_token'); localStorage.removeItem('tc_token_exp'); } catch (e) {}
            var err = document.getElementById('login-error');
            if (err) err.hidden = false;
          }
          refresh();
        })
        .catch(function() {});
    }
  }
})();
</script>`;

  return shell({
    title: 'Sign in with Discord | TiltCheck',
    description: 'Sign in with Discord. Non-custodial. Web owns login; dashboard is after auth lands.',
    depth: 'docs',
    current: 'login',
    body: content,
  });
}

function buildPrivacyPage() {
  const content = `${productHero({
    eyebrow: 'Legal / Privacy',
    title: 'Privacy Policy',
    lede: 'Minimum data to run the product. Strictly non-custodial. No private keys, no ad-tech, no resale. Version 1.2.',
    actionsHtml: '<a class="hero-actions__secondary-link" href="' + href('docs', 'index.html') + '">Back to Home</a>',
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-card" style="margin-bottom: 1.5rem;">
        <h2 class="public-page-card__title">01. What we collect</h2>
        <ul class="public-page-list">
          <li><strong>Discord ID and username</strong> if you voluntarily connect your Discord account for community identity and role sync.</li>
          <li><strong>Solana wallet public address</strong> only when you voluntarily link a wallet to set on-chain cooldown timelocks.</li>
          <li><strong>Local session metrics:</strong> Bet frequencies, spin pace timestamps, and profit thresholds processed locally in your browser memory for tilt detection and speed braking.</li>
          <li><strong>Crash and error telemetry:</strong> Sanitized error logs (without PII) to diagnose extension performance and stability.</li>
        </ul>
      </div>

      <div class="public-page-card" style="margin-bottom: 1.5rem;">
        <h2 class="public-page-card__title">02. What we never collect</h2>
        <ul class="public-page-list">
          <li><strong>Private keys, wallet recovery phrases, or wallet passwords.</strong> TiltCheck is 100% non-custodial.</li>
          <li><strong>Payment card numbers, banking details, or financial credentials.</strong></li>
          <li><strong>Government ID, KYC documents, or legal names.</strong></li>
          <li><strong>Browsing history:</strong> We never track tabs or navigation outside supported online gaming domains.</li>
          <li><strong>Keystrokes, passwords, or unrelated page content.</strong></li>
        </ul>
      </div>

      <div class="public-page-card" style="margin-bottom: 1.5rem;">
        <h2 class="public-page-card__title">03. Chrome Extension Sandbox & Single Purpose</h2>
        <div class="public-page-card__copy">
          <p>The TiltCheck browser extension operates strictly within the browser sandbox with zero external local daemons or terminal requirements.</p>
          <p>Its single purpose is responsible gaming harm reduction: enforcing a configurable 2-second spin delay, providing client-side entropy verification for provably fair seeds, blocking accidental withdrawal cancellations, and enforcing voluntary cooldown timelocks.</p>
          <p>All bet pacing and tilt analysis run locally on-device. No gameplay session logs are sold, rented, or transmitted to third parties.</p>
        </div>
      </div>

      <div class="public-page-card" style="margin-bottom: 1.5rem;">
        <h2 class="public-page-card__title">04. How we use data</h2>
        <p class="public-page-card__copy">Data is used solely to provide and power TiltCheck safety features (tilt scoring, session pacing, auto-vault rules, and voluntary timelocks). We do not sell data to third parties, ad networks, data brokers, or casino operators. We never use data to determine creditworthiness or for lending.</p>
      </div>

      <div class="public-page-card" style="margin-bottom: 1.5rem;">
        <h2 class="public-page-card__title">05. Data retention and deletion</h2>
        <ul class="public-page-list">
          <li><strong>Local extension storage:</strong> Cleared immediately upon clicking "Reset Data" in settings or uninstalling the extension.</li>
          <li><strong>On-chain cooldowns:</strong> Public Solana blockchain transactions are immutable and permanent by design.</li>
          <li><strong>Account data:</strong> Retained until deletion is requested. Send deletion requests to <a href="mailto:privacy@tiltcheck.me" style="color:var(--teal)">privacy@tiltcheck.me</a> with subject line "Delete My Data".</li>
        </ul>
      </div>

      <div class="public-page-card" style="margin-bottom: 1.5rem;">
        <h2 class="public-page-card__title">06. Third-party integrations</h2>
        <div class="public-page-card__copy">
          <p>Discord handles voluntary OAuth identity. The Solana network records trustless cooldown transactions. We do not use Google Analytics, Meta Pixel, or commercial advertising SDKs.</p>
        </div>
      </div>

      <div class="public-page-card" style="margin-bottom: 1.5rem;">
        <h2 class="public-page-card__title">07. Contact</h2>
        <div class="public-page-card__copy">
          <p>For privacy inquiries, security audits, or data rights requests, email <a href="mailto:privacy@tiltcheck.me" style="color:var(--teal)">privacy@tiltcheck.me</a>.</p>
        </div>
      </div>
    </div>
  </section>
</main>`;

  return shell({
    title: 'Privacy Policy | TiltCheck',
    description: 'TiltCheck Privacy Policy. Non-custodial, client-side responsible gaming harm reduction. Zero ad-tech, zero data sales.',
    depth: 'docs',
    current: 'privacy',
    body: content,
  });
}



function buildTipPage() {
  const content = `${productHero({
    eyebrow: 'Non-Custodial Tip Jar',
    title: 'Keep TiltCheck Free',
    lede: 'TiltCheck is free. Hit a heater? Toss a tip to keep the servers on and the tools free for every degen. Totally optional.',
    actionsHtml: `<button type="button" class="btn btn-primary" id="btn-copy-sol" onclick="copySolTip()">Copy Solana Address</button>
    <a class="hero-actions__secondary-link" href="${SOLSCAN_TIP_URL}" target="_blank" rel="noopener noreferrer">View on Solscan &rarr;</a>`,
  })}
<main class="product-main">
  <section class="public-page-section">
    <div class="landing-shell">
      <div class="public-page-section-heading">
        <span class="brand-eyebrow">Solana Network</span>
        <h2 class="public-page-section-heading__title">Tip via Any Solana Wallet</h2>
      </div>

      <div style="background:#0c0f14; border:1px solid rgba(23,195,178,0.25); border-radius:12px; padding:24px; max-width:640px; margin:0 auto 32px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="font-size:12px; font-weight:700; color:#17c3b2; text-transform:uppercase; letter-spacing:0.08em;">Solana (SOL / USDC / SPL)</span>
          <span style="font-size:11px; color:#64748b; font-family:ui-monospace, monospace;">Mainnet-Beta</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <input type="text" id="sol-address-input" readonly value="${SOLANA_TIP_WALLET}" style="font-family:ui-monospace, monospace; font-size:12px; background:#141822; color:#e2e8f0; border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:10px 12px; flex:1; min-width:0;" />
          <button type="button" class="btn btn-primary" onclick="copySolTip()" style="white-space:nowrap; padding:10px 18px; font-size:12px;">Copy</button>
        </div>
        <div id="copy-status" style="font-size:12px; color:#17c3b2; min-height:18px; font-weight:600;"></div>

        <div style="border-top:1px solid rgba(255,255,255,0.08); margin-top:16px; padding-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <span style="font-size:12px; color:#94a3b8;">Prefer card or fiat?</span>
          <a href="${KOFI_URL}" target="_blank" rel="noopener noreferrer" style="color:#17c3b2; font-size:12px; font-weight:600; text-decoration:none;">Support on Ko-fi &rarr;</a>
        </div>
      </div>

      <div style="max-width:760px; margin:0 auto;">
        <article class="public-page-card">
          <h3 class="public-page-card__title">Your money stays yours</h3>
          <p class="public-page-card__copy">We never hold bankrolls, deposits or private keys. A tip goes straight from your wallet to ours.</p>
        </article>
      </div>
    </div>
  </section>
</main>
<script>
function copySolTip() {
  var input = document.getElementById('sol-address-input');
  var status = document.getElementById('copy-status');
  if (input) {
    input.select();
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(input.value).then(function() {
        if (status) status.textContent = 'Address copied to clipboard!';
        setTimeout(function() { if (status) status.textContent = ''; }, 3000);
      }).catch(function() {
        input.select();
        document.execCommand('copy');
        if (status) status.textContent = 'Address copied to clipboard!';
        setTimeout(function() { if (status) status.textContent = ''; }, 3000);
      });
    } else {
      input.select();
      document.execCommand('copy');
      if (status) status.textContent = 'Address copied to clipboard!';
      setTimeout(function() { if (status) status.textContent = ''; }, 3000);
    }
  }
}
</script>`;

  return shell({
    title: 'Tip Jar | TiltCheck',
    description: 'Tip TiltCheck in SOL. Optional. Keeps the tools free for every degen.',
    depth: 'docs',
    current: 'tip',
    body: content,
  });
}

function buildPagesSitemapXml() {
  const today = '2026-11-08';
  const pages = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/gate/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/extension`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${SITE_URL}/tools/`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${SITE_URL}/casinos/`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${SITE_URL}/cooldown/`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/rtp-scanner/`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/house-edge-scanner/`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/verify/`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/wincheck/`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/autovault/`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${SITE_URL}/tip/`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/nudges/`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${SITE_URL}/dashboard/`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${SITE_URL}/privacy/`, changefreq: 'monthly', priority: '0.5' },
  ];

  const urls = pages
    .map(
      (p) => `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildPagesRobotsTxt() {
  return `# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Host: ${SITE_URL}
`;
}

function run() {
  if (!fs.existsSync(sourceRoot)) {
    console.error('Source directory missing:', sourceRoot);
    process.exit(1);
  }

  const siteRoot = path.dirname(outRoot);
  const assetsDir = path.join(siteRoot, 'assets');
  fs.mkdirSync(outRoot, { recursive: true });
  fs.mkdirSync(siteRoot, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

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
  const privacyDir = path.join(siteRoot, 'privacy');
  fs.mkdirSync(privacyDir, { recursive: true });
  fs.writeFileSync(path.join(privacyDir, 'index.html'), buildPrivacyPage());

  const gateDir = path.join(siteRoot, 'gate');
  fs.mkdirSync(gateDir, { recursive: true });
  fs.writeFileSync(path.join(gateDir, 'index.html'), buildGatePage());

  // Copy PWA manifest and service worker
  const manifestSrc = path.join(__dirname, 'pages-assets/manifest.webmanifest');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, path.join(siteRoot, 'manifest.webmanifest'));
  }
  const swSrc = path.join(__dirname, 'pages-assets/sw.js');
  if (fs.existsSync(swSrc)) {
    fs.copyFileSync(swSrc, path.join(siteRoot, 'sw.js'));
  }

  // Ensure base stylesheet is synchronized
  const stylesSrc = path.join(__dirname, 'pages-assets/styles/base.css');
  const stylesDestDir = path.join(siteRoot, 'styles');
  fs.mkdirSync(stylesDestDir, { recursive: true });
  if (fs.existsSync(stylesSrc)) {
    fs.copyFileSync(stylesSrc, path.join(stylesDestDir, 'base.css'));
  }

  // Ensure downloads folder has latest extension zip
  const downloadsDir = path.join(siteRoot, 'downloads');
  fs.mkdirSync(downloadsDir, { recursive: true });
  const extZipSrc = path.join(repoRoot, 'apps/chrome-extension/tiltcheck-extension.zip');
  if (fs.existsSync(extZipSrc)) {
    fs.copyFileSync(extZipSrc, path.join(downloadsDir, 'tiltcheck-extension.zip'));
  }

  const tipDir = path.join(siteRoot, 'tip');
  fs.mkdirSync(tipDir, { recursive: true });
  fs.writeFileSync(path.join(tipDir, 'index.html'), buildTipPage());

  const toolsDir = path.join(siteRoot, 'tools');
  fs.mkdirSync(toolsDir, { recursive: true });
  fs.writeFileSync(path.join(toolsDir, 'index.html'), buildToolsPage());


  const iconSrc = path.join(repoRoot, 'apps/chrome-extension/src/icons/icon128.png');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(assetsDir, 'icon.png'));
    fs.copyFileSync(iconSrc, path.join(siteRoot, 'icon.png'));
    fs.copyFileSync(iconSrc, path.join(siteRoot, 'favicon.ico'));
  }

  const casinosDir = path.join(siteRoot, 'casinos');
  fs.mkdirSync(casinosDir, { recursive: true });
  fs.writeFileSync(path.join(casinosDir, 'index.html'), buildCasinosPage(casinos));
  const cooldownDir = path.join(siteRoot, 'cooldown');
  fs.mkdirSync(cooldownDir, { recursive: true });
  fs.writeFileSync(path.join(cooldownDir, 'index.html'), buildCooldownPage());
  const nudgesDir = path.join(siteRoot, 'nudges');
  fs.mkdirSync(nudgesDir, { recursive: true });
  fs.writeFileSync(path.join(nudgesDir, 'index.html'), buildNudgesPage());
  const rtpScannerDir = path.join(siteRoot, "rtp-scanner");
  fs.mkdirSync(rtpScannerDir, { recursive: true });
  fs.writeFileSync(path.join(rtpScannerDir, "index.html"), buildRtpScannerPage());
  const toolsRtpDir = path.join(siteRoot, "tools", "rtp-scanner");
  fs.mkdirSync(toolsRtpDir, { recursive: true });
  fs.writeFileSync(path.join(toolsRtpDir, "index.html"), buildRtpScannerRedirect());

  const toolsHouseEdgeDir = path.join(siteRoot, "tools", "house-edge-scanner");
  fs.mkdirSync(toolsHouseEdgeDir, { recursive: true });
  fs.writeFileSync(path.join(toolsHouseEdgeDir, "index.html"), buildHouseEdgePage());

  const houseEdgeDir = path.join(siteRoot, "house-edge-scanner");
  fs.mkdirSync(houseEdgeDir, { recursive: true });
  fs.writeFileSync(path.join(houseEdgeDir, "index.html"), buildHouseEdgeRedirect());

  const toolsVerifyDir = path.join(siteRoot, "tools", "verify");
  fs.mkdirSync(toolsVerifyDir, { recursive: true });
  fs.writeFileSync(path.join(toolsVerifyDir, "index.html"), buildVerifyPage());

  const verifyDir = path.join(siteRoot, "verify");
  fs.mkdirSync(verifyDir, { recursive: true });
  fs.writeFileSync(path.join(verifyDir, "index.html"), buildVerifyDirectRedirect());

  const dashboardDir = path.join(siteRoot, 'dashboard');
  fs.mkdirSync(dashboardDir, { recursive: true });
  fs.writeFileSync(path.join(dashboardDir, 'index.html'), buildDashboardPage());

  const vaultDir = path.join(siteRoot, 'vault');
  fs.mkdirSync(vaultDir, { recursive: true });
  fs.writeFileSync(path.join(vaultDir, 'index.html'), buildAutovaultRedirect());
  const autovaultDir = path.join(siteRoot, 'autovault');
  fs.mkdirSync(autovaultDir, { recursive: true });
  fs.writeFileSync(path.join(autovaultDir, 'index.html'), buildAutovaultPage());
  const wincheckDir = path.join(siteRoot, 'wincheck');
  fs.mkdirSync(wincheckDir, { recursive: true });
  fs.writeFileSync(path.join(wincheckDir, 'index.html'), buildAutovaultPage());
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
  fs.writeFileSync(
    path.join(siteRoot, 'tools.html'),
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="refresh" content="0; url=tools/"/>
<link rel="canonical" href="${SITE_URL}/tools/"/>
<title>Tools | TiltCheck</title>
</head>
<body>
<p><a href="tools/">Tools Directory</a></p>
</body>
</html>`
  );

  const zipSource = path.join(repoRoot, 'apps/web/public/downloads/tiltcheck-extension.zip');
  const zipDestDir = path.join(siteRoot, 'downloads');
  fs.mkdirSync(zipDestDir, { recursive: true });
  fs.copyFileSync(zipSource, path.join(zipDestDir, 'tiltcheck-extension.zip'));

  const glitterSrc = path.join(repoRoot, 'apps/web/public/assets/backgroundglitter.png');
  if (fs.existsSync(glitterSrc)) {
    fs.copyFileSync(glitterSrc, path.join(assetsDir, 'backgroundglitter.png'));
  }

  fs.writeFileSync(path.join(siteRoot, '.nojekyll'), '');
  fs.writeFileSync(path.join(siteRoot, 'CNAME'), 'tiltcheck.me\n');

  fs.writeFileSync(path.join(siteRoot, 'sitemap.xml'), buildPagesSitemapXml(indexEntries));
  fs.writeFileSync(path.join(siteRoot, 'robots.txt'), buildPagesRobotsTxt());

  const sitemapXsl = path.join(repoRoot, 'apps/web/public/sitemap.xsl');
  if (fs.existsSync(sitemapXsl)) {
    fs.copyFileSync(sitemapXsl, path.join(siteRoot, 'sitemap.xsl'));
  }

  const llmsTxt = path.join(repoRoot, 'apps/web/public/llms.txt');
  if (fs.existsSync(llmsTxt)) {
    fs.copyFileSync(llmsTxt, path.join(siteRoot, 'llms.txt'));
  }

  console.log(`Built Pages site: ${files.length} specs + single-page home → ${siteRoot}`);
}

run();
