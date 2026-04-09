/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all standard crawlers
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/_next/'],
      },
      {
        // Allow AI crawlers full access — llms.txt provides context
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
        disallow: ['/dashboard/'],
      },
    ],
    sitemap: 'https://tiltcheck.me/sitemap.xml',
    host: 'https://tiltcheck.me',
  };
}
