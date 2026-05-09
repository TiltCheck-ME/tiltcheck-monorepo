/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CasinoProofPage from '@/components/CasinoProofPage';
import { CASINOS, getCasinoBySlug } from '@/lib/casino-trust';
import { getCasinoSeedAuditSurface } from '@/lib/seed-audit-surface';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CASINOS.map((casino) => ({ slug: casino.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const casino = getCasinoBySlug(slug);

  if (!casino) {
    return {
      title: 'Casino Proof Not Found | TiltCheck',
    };
  }

  const title = `${casino.name} Trust Evidence | TiltCheck`;
  const description = `Public trust evidence page for ${casino.name}. Manual bet verification lives on /tools/verify while this page separates seed health, proof quality, licensing, payout, scam, bonus, and RTP evidence.`;
  const url = `https://tiltcheck.me/casinos/${casino.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
    },
  };
}

export default async function CasinoProofRoute({ params }: Props) {
  const { slug } = await params;
  const casino = getCasinoBySlug(slug);

  if (!casino) {
    notFound();
  }

  const seedAudit = await getCasinoSeedAuditSurface(casino);

  return <CasinoProofPage casino={casino} seedAudit={seedAudit} />;
}
