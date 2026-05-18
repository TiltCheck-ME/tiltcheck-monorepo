// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-12
/**
 * One-off external site map: homepage + same-origin links (polite limits).
 * Usage: node scripts/explore-external-sites.mjs
 */
import { chromium } from "@playwright/test";

const ORIGINS = [
  "https://stakecruncher.com",
  "https://stakestats.net",
  "https://ripguard.xyz",
];

const MAX_LINKS_FROM_HOME = 80;
const MAX_EXTRA_PAGES = 18;
const BETWEEN_MS = 600;
const GOTO_TIMEOUT = 35_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeUrl(href, origin) {
  try {
    const u = new URL(href, origin);
    if (u.origin !== new URL(origin).origin) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

async function collectPageSummary(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT });
  const summary = await page.evaluate(() => {
    const title = document.title || "";
    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() || "";
    const h1 = Array.from(document.querySelectorAll("h1"))
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
      .slice(0, 5);
    return { title, metaDesc, ogTitle, h1 };
  });
  return summary;
}

async function collectSameOriginLinks(page, origin) {
  return page.$$eval(
    "a[href]",
    (anchors, originStr) => {
      const out = new Set();
      for (const a of anchors) {
        const href = a.getAttribute("href");
        const hrefNorm = href?.trim().toLowerCase();
        if (
          !hrefNorm ||
          hrefNorm.startsWith("mailto:") ||
          hrefNorm.startsWith("tel:") ||
          hrefNorm.startsWith("javascript:") ||
          hrefNorm.startsWith("data:") ||
          hrefNorm.startsWith("vbscript:")
        )
          continue;
        try {
          const u = new URL(href, originStr);
          if (u.origin !== new URL(originStr).origin) continue;
          u.hash = "";
          out.add(u.toString());
        } catch {
          /* skip */
        }
      }
      return Array.from(out);
    },
    origin,
  );
}

async function exploreOrigin(browser, origin) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (compatible; TiltCheckMonorepoSiteMap/1.0; +https://tiltcheck.me) Playwright",
  });
  const page = await context.newPage();

  const home = `${origin}/`;
  const homeSummary = await collectPageSummary(page, home);
  await sleep(BETWEEN_MS);

  let links = await collectSameOriginLinks(page, origin);
  links = [...new Set(links)].sort();
  if (links.length > MAX_LINKS_FROM_HOME) links = links.slice(0, MAX_LINKS_FROM_HOME);

  const extra = links.filter((u) => u !== home).slice(0, MAX_EXTRA_PAGES);
  const pages = [{ url: home, ...homeSummary }];

  for (const url of extra) {
    await sleep(BETWEEN_MS);
    try {
      const s = await collectPageSummary(page, url);
      pages.push({ url, ...s });
    } catch (e) {
      pages.push({
        url,
        title: "",
        metaDesc: "",
        ogTitle: "",
        h1: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await context.close();
  return {
    origin,
    homepageLinksSampled: links.length,
    pages,
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  for (const origin of ORIGINS) {
    results.push(await exploreOrigin(browser, origin));
    await sleep(BETWEEN_MS);
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
