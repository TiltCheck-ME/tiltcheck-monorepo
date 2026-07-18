// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17

import { DISCORD_INVITE_URL, GITHUB_ORG_URL, SITE_URL } from '@/lib/site-links';
import { SITE_OG_TAGLINE, SITE_ONE_LINER, SITE_SEO_TITLE } from '@/lib/site-copy';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TiltCheck',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description: SITE_ONE_LINER,
    sameAs: [DISCORD_INVITE_URL, GITHUB_ORG_URL],
  };
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_SEO_TITLE,
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome',
    description: SITE_ONE_LINER,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    url: `${SITE_URL}/extension`,
  };
}

export function faqPageJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function webPageJsonLd(title: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_OG_TAGLINE,
      url: SITE_URL,
    },
  };
}
