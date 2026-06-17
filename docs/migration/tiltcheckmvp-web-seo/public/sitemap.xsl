<?xml version="1.0" encoding="UTF-8"?>
<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>TiltCheck Sitemap</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #0a0c10;
            --panel: #12151c;
            --border: rgba(23, 195, 178, 0.18);
            --text: #e5e7eb;
            --muted: #8a97a8;
            --accent: #17c3b2;
            --gold: #ffd700;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            background: radial-gradient(circle at top, rgba(23,195,178,0.08), transparent 40%), var(--bg);
            color: var(--text);
            line-height: 1.5;
          }
          .wrap { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
          header {
            border: 1px solid var(--border);
            background: rgba(18, 21, 28, 0.92);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }
          h1 { margin: 0 0 0.35rem; font-size: 1.75rem; letter-spacing: -0.02em; }
          .eyebrow {
            font-size: 0.65rem;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--accent);
            font-weight: 800;
          }
          .sub { color: var(--muted); margin: 0.75rem 0 0; max-width: 52ch; }
          .meta { margin-top: 1rem; font-size: 0.85rem; color: var(--muted); }
          .meta strong { color: var(--gold); }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--border);
            background: var(--panel);
            border-radius: 16px;
            overflow: hidden;
          }
          th, td { padding: 0.85rem 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
          th {
            font-size: 0.65rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--muted);
            background: rgba(0,0,0,0.25);
          }
          tr:last-child td { border-bottom: 0; }
          a { color: var(--accent); text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
          .pill {
            display: inline-block;
            font-size: 0.65rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            border: 1px solid rgba(255,215,0,0.35);
            color: var(--gold);
            border-radius: 999px;
            padding: 0.15rem 0.45rem;
          }
          footer {
            margin-top: 1.5rem;
            text-align: center;
            color: var(--muted);
            font-size: 0.85rem;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <p class="eyebrow">TiltCheck // crawl map</p>
            <h1>Sitemap</h1>
            <p class="sub">Machine-readable URL index for tiltcheck.me. Humans: use the styled page at <a href="/site-map">/site-map</a>.</p>
            <p class="meta"><strong><xsl:value-of select="count(s:urlset/s:url)"/></strong> URLs in this feed.</p>
          </header>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Changefreq</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                  <td><span class="pill"><xsl:value-of select="s:changefreq"/></span></td>
                  <td><xsl:value-of select="s:priority"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          <footer>Made for Degens. By Degens.</footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
