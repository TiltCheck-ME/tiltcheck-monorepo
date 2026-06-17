/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import { buildSitemapXml } from '@/lib/sitemap-xml';

export const revalidate = 3600;

export async function GET() {
  const xml = buildSitemapXml(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tiltcheck.me');
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
