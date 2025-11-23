#!/usr/bin/env node
/**
 * Lightweight Markdown → HTML converter for TiltCheck docs.
 * No external deps; supports:
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
 *   outDir = services/landing/public/docs
 */
import fs from 'fs';
import path from 'path';

const sourceRoot = path.resolve(process.argv[2] || 'docs/tiltcheck');
const outRoot = path.resolve(process.argv[3] || 'services/landing/public/docs');

function slugify(name){
  return name
    .replace(/^\d+-/, '') // drop numeric prefixes like 1-, 10-
    .replace(/\.md$/i,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

function renderMarkdown(md){
  const lines = md.split(/\r?\n/);
  const out = [];
  let inCode = false; let codeLang = '';
  let listOpen = false;
  for(const raw of lines){
    const line = raw.replace(/\t/g,'    ');
    const fenceMatch = line.match(/^```(.*)$/);
    if(fenceMatch){
      if(!inCode){ inCode = true; codeLang = fenceMatch[1].trim(); out.push(`<pre class="code-block" data-lang="${escapeHtml(codeLang)}"><code>`); }
      else { inCode = false; codeLang=''; out.push('</code></pre>'); }
      continue;
    }
    if(inCode){ out.push(escapeHtml(line)); continue; }
    if(/^\s*$/.test(line)){ if(listOpen){ out.push('</ul>'); listOpen=false; } out.push(''); continue; }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if(heading){ const level = heading[1].length; out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`); continue; }
    const list = line.match(/^[-*]\s+(.*)$/);
    if(list){ if(!listOpen){ out.push('<ul>'); listOpen=true; } out.push(`<li>${inline(list[1].trim())}</li>`); continue; }
    // Paragraph
    out.push(`<p>${inline(line.trim())}</p>`);
  }
  if(listOpen) out.push('</ul>');
  if(inCode) out.push('</code></pre>');
  return out.join('\n');
}

function inline(str){
  // links
  str = str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_,text,url)=>`<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`);
  // bold ** **
  str = str.replace(/\*\*([^*]+)\*\*/g, (_,t)=>`<strong>${escapeHtml(t)}</strong>`);
  // emphasis * * (avoid bold already)
  str = str.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, (_,pre,t)=>`${pre}<em>${escapeHtml(t)}</em>`);
  // inline code
  str = str.replace(/`([^`]+)`/g, (_,t)=>`<code>${escapeHtml(t)}</code>`);
  return str;
}

function extractMeta(md){
  // first heading as title; first paragraph as description
  let title=''; let description='';
  const heading = md.match(/^#\s+(.+)$/m); if(heading) title=heading[1].trim();
  const para = md.replace(/```[\s\S]*?```/g,'').match(/(^|\n)([^#\n][^\n]+)\n/); if(para) description=para[2].trim();
  return { title: title || 'Untitled', description: description.slice(0,180) };
}

function buildPage({ slug, title, description, body }){
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${escapeHtml(title)} - TiltCheck</title><meta name="description" content="${escapeHtml(description)}"/><link rel="stylesheet" href="/styles/base.css"/><style>body{background:#0a0a0a;color:#e0e0e0;font-family:Inter,system-ui,sans-serif;margin:0;padding:0}main{max-width:900px;margin:0 auto;padding:40px 18px;line-height:1.7}a{color:#00d4aa;text-decoration:none}a:hover{text-decoration:underline}.page-hero{padding:54px 24px 32px;background:linear-gradient(135deg,#121212,#181818);border-bottom:1px solid #222}.page-hero h1{margin:0 0 10px;font-size:2.4rem;background:linear-gradient(135deg,#00d4aa,#00a8ff);-webkit-background-clip:text;color:transparent}.lede{color:#aaa;font-size:1.05rem;max-width:760px}pre{background:#181818;padding:14px 16px;border:1px solid #222;border-radius:8px;overflow:auto;font-size:.85rem}code{font-family:ui-monospace,Monaco,Consolas,monospace;color:#00a8ff}.breadcrumb{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#888;margin:0 0 12px}.nav-inline{display:flex;gap:20px;align-items:center;font-size:.8rem;padding:10px 20px;background:#111;border-bottom:1px solid #222}nav a{color:#aaa}nav a[aria-current="page"]{color:#00d4aa;font-weight:600}</style></head><body><nav class="nav-inline"><a href="/" >Home</a><a href="/docs/index.html" aria-current="page">Docs</a><a href="/dashboard">Dashboard</a><a href="/about.html">About</a></nav><header class="page-hero"><div class="breadcrumb">Docs / ${escapeHtml(title)}</div><h1>${escapeHtml(title)}</h1><p class="lede">${escapeHtml(description)}</p></header><main id="content">${body}</main><footer style="padding:40px 24px;text-align:center;font-size:.75rem;color:#666;border-top:1px solid #222">TiltCheck Docs • Non-custodial • Signals only.</footer></body></html>`;
}

function run(){
  if(!fs.existsSync(sourceRoot)){
    console.error('Source directory missing:', sourceRoot); process.exit(1);
  }
  fs.mkdirSync(outRoot, { recursive: true });
  const files = fs.readdirSync(sourceRoot).filter(f=>f.endsWith('.md'));
  const indexEntries = [];
  for(const file of files){
    const full = path.join(sourceRoot,file);
    const raw = fs.readFileSync(full,'utf-8');
    const slug = slugify(file);
    const meta = extractMeta(raw);
    const body = renderMarkdown(raw);
    const html = buildPage({ slug, title: meta.title, description: meta.description, body });
    fs.writeFileSync(path.join(outRoot, `${slug}.html`), html);
    indexEntries.push({ slug, title: meta.title, description: meta.description });
  }
  // Build index
  const listHtml = indexEntries.map(e=>`<li><a href="${e.slug}.html"><strong>${escapeHtml(e.title)}</strong></a><br/><span style=\"color:#888;font-size:.75rem\">${escapeHtml(e.description)}</span></li>`).join('\n');
  const indexPage = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Docs Index - TiltCheck</title><meta name="description" content="TiltCheck Documentation Index"/><link rel="stylesheet" href="/styles/base.css"/><style>body{background:#0a0a0a;color:#e0e0e0;font-family:Inter,system-ui,sans-serif;margin:0}main{max-width:900px;margin:0 auto;padding:44px 20px;line-height:1.6}a{color:#00d4aa;text-decoration:none}a:hover{text-decoration:underline}h1{font-size:2.4rem;margin:0 0 22px;background:linear-gradient(135deg,#00d4aa,#00a8ff);-webkit-background-clip:text;color:transparent}ul{list-style:disc;padding-left:22px}nav{display:flex;gap:20px;align-items:center;font-size:.8rem;padding:10px 20px;background:#111;border-bottom:1px solid #222}nav a{color:#aaa}nav a[aria-current='page']{color:#00d4aa;font-weight:600}</style></head><body><nav><a href="/">Home</a><a href="/docs/index.html" aria-current="page">Docs</a><a href="/dashboard">Dashboard</a><a href="/about.html">About</a></nav><main><h1>TiltCheck Docs</h1><p style="color:#aaa;font-size:1.05rem;max-width:760px">Developer and ecosystem documentation. Non-custodial trust & transparency modules, tool specs, prompts, architecture, and standards.</p><ul>${listHtml}</ul></main><footer style="padding:40px 24px;text-align:center;font-size:.75rem;color:#666;border-top:1px solid #222">TiltCheck Docs • Signals only • © 2024–2025</footer></body></html>`;
  fs.writeFileSync(path.join(outRoot,'index.html'), indexPage);
  console.log(`Converted ${files.length} markdown files to HTML in ${outRoot}`);
}

run();
