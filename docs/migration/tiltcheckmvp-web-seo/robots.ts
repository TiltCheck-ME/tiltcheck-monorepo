/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import type { MetadataRoute } from 'next';

const BASE = (process.env.NEXT_PUBLIC_WEB_URL ?? 'https://tiltcheck.me').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/login', '/dashboard', '/settings', '/_next/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Claude-Web',
          'Anthropic-AI',
          'anthropic-ai',
          'CCBot',
          'Google-Extended',
          'PerplexityBot',
          'cohere-ai',
        ],
        allow: '/',
        disallow: ['/dashboard', '/settings', '/login'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
