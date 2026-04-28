// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25

import { chromium } from 'playwright';

import { buildProfileFromCapture, extractBodyKeys, normalizeRouteSignature } from './core.js';
import type { RgsFingerprintProfile, ScrapeOptions } from './types.js';

const routeKeywords = [
  'rgs',
  'session',
  'init',
  'launch',
  'play',
  'spin',
  'result',
  'state',
  'wager',
  'bet',
  'card',
  'deck',
  'flip',
  'tarot',
  'difficulty',
];

function shouldCaptureUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return routeKeywords.some((keyword) => normalized.includes(keyword));
}

function getResponseHeader(headers: Record<string, string>, headerName: string): string | undefined {
  const targetName = headerName.toLowerCase();
  return Object.entries(headers).find(([name]) => name.toLowerCase() === targetName)?.[1];
}

function sizeToKb(sizeBytes: number | undefined): number | undefined {
  if (typeof sizeBytes !== 'number' || Number.isNaN(sizeBytes) || sizeBytes <= 0) {
    return undefined;
  }

  return Number((sizeBytes / 1024).toFixed(3));
}

export async function scrapePublicRgsProfile(options: ScrapeOptions): Promise<RgsFingerprintProfile> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const maxTrackedRequests = options.maxTrackedRequests ?? 200;
  const routeSignatures = new Set<string>();
  const requestBodyKeys = new Set<string>();
  const responseKeys = new Set<string>();
  const responseBodyPromises: Promise<void>[] = [];

  page.on('request', (request) => {
    if (routeSignatures.size >= maxTrackedRequests || !shouldCaptureUrl(request.url())) {
      return;
    }

    routeSignatures.add(normalizeRouteSignature(request.method(), request.url()));
    for (const key of extractBodyKeys(request.postData())) {
      requestBodyKeys.add(key);
    }
  });

  page.on('response', (response) => {
    const request = response.request();
    if (!shouldCaptureUrl(request.url())) {
      return;
    }

    responseBodyPromises.push((async () => {
      const contentType = getResponseHeader(response.headers(), 'content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return;
      }

      try {
        const body = await response.json() as unknown;
        const bodyKeys = extractBodyKeys(JSON.stringify(body));
        for (const key of bodyKeys) {
          responseKeys.add(key);
        }
      } catch {
        return;
      }
    })());
  });

  try {
    await page.goto(options.url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeoutMs ?? 30_000,
    });

    await page.waitForLoadState('networkidle', {
      timeout: Math.min(options.timeoutMs ?? 30_000, 10_000),
    }).catch(() => undefined);

    await page.waitForTimeout(options.settleMs ?? 5_000);

    const snapshot = await page.evaluate(() => {
      const scriptUrls = Array.from(document.querySelectorAll('script[src]'))
        .map((script) => (script as HTMLScriptElement).src)
        .filter(Boolean);

      const resourceEntries = performance.getEntriesByType('resource')
        .map((entry) => entry as PerformanceResourceTiming)
        .map((entry) => ({
          url: entry.name,
          initiatorType: entry.initiatorType,
          decodedBodySize: entry.decodedBodySize,
          encodedBodySize: entry.encodedBodySize,
          transferSize: entry.transferSize,
        }));

      return {
        title: document.title,
        html: document.documentElement.outerHTML,
        scriptUrls,
        resourceEntries,
      };
    });

    await Promise.all(responseBodyPromises);

    const scriptAssets = snapshot.resourceEntries
      .filter((entry) => entry.initiatorType === 'script' || entry.url.endsWith('.js') || entry.url.endsWith('.cjs'))
      .map((entry) => ({
        url: entry.url,
        sizeKb: sizeToKb(entry.decodedBodySize || entry.encodedBodySize || entry.transferSize),
      }));

    return buildProfileFromCapture({
      label: snapshot.title || new URL(options.url).hostname,
      url: options.url,
      scriptUrls: [...new Set([...snapshot.scriptUrls, ...scriptAssets.map((asset) => asset.url)])],
      scriptAssets,
      routeSignatures: [...routeSignatures],
      requestBodyKeys: [...requestBodyKeys],
      responseKeys: [...responseKeys],
      rawText: [snapshot.title, snapshot.html].join('\n'),
      notes: [
        `captured-route-count=${routeSignatures.size}`,
        `captured-script-count=${scriptAssets.length}`,
      ],
    });
  } finally {
    await context.close();
    await browser.close();
  }
}
