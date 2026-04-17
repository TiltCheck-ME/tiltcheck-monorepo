/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15 */
import Link from 'next/link';
import React from 'react';

type ToolCardProps = {
  href: string;
  icon: string;
  category: string;
  title: string;
  description: string;
  status: 'live' | 'coming-soon' | 'featured';
  gridClasses?: string;
};

const ToolCard = ({ href, category, title, description, status, gridClasses }: ToolCardProps) => {
  const isComingSoon = status === 'coming-soon';
  const isFeatured = status === 'featured';

  const cardClasses = [
    'tool-card',
    'group',
    'relative',
    'p-6',
    'flex',
    'flex-col',
    'justify-between',
    'bg-gradient-to-br from-[#0E0E0F] to-[#0a0c10]',
    'border',
    'border-[#283347]',
    'rounded-none',
    'transition-all',
    'duration-300',
    'hover:border-[#17c3b2]',
    isComingSoon ? 'coming-soon' : 'live',
    isFeatured ? 'featured' : '',
    gridClasses || ''
  ].join(' ');

  const StatusBadge = () => {
    if (isComingSoon) {
      return <span className="absolute top-4 right-4 badge-notify" style={{fontSize:'0.65rem', fontWeight:900, letterSpacing:'0.12em', padding:'0.2rem 0.45rem', borderRadius:'9999px', textTransform:'uppercase'}}>GET NOTIFIED</span>;
    }
    if(status === 'live' || isFeatured) {
        return <span className="absolute top-4 right-4 badge-live">LIVE & TESTED</span>;
    }
    return null;
  };

  return (
    <Link href={href} className={cardClasses}>
      <div>
        <span className="category-label text-sm font-semibold uppercase tracking-wider text-[color:var(--color-primary)]">
          {category}
        </span>
        <h3 className="neon-tool-name mt-2 text-xl font-bold text-white">
          {title}
        </h3>
        <p className="tool-card-desc mt-2 text-gray-400">
          {description}
        </p>
      </div>
      <StatusBadge />
    </Link>
  );
};

export default ToolCard;
