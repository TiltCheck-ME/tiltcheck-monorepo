/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
import Link from 'next/link';
import Image from 'next/image';
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

const ToolCard = ({ href, icon, category, title, description, status, gridClasses }: ToolCardProps) => {
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
    'hover:-translate-y-2',
    'hover:-translate-x-2',
    'hover:border-[#17c3b2]',
    'hover:shadow-[6px_6px_0px_rgba(23,195,178,0.4)]',
    isComingSoon ? 'coming-soon' : 'live',
    isFeatured ? 'featured' : '',
    gridClasses || ''
  ].join(' ');

  const StatusBadge = () => {
    if (isComingSoon) {
      return <span className="absolute top-4 right-4 badge-beta">Still Cooking</span>;
    }
    if(status === 'live' || isFeatured) {
        return <span className="absolute top-4 right-4 badge-beta">LIVE & TESTED</span>;
    }
    return null;
  };

  return (
    <Link href={href} className={cardClasses}>
      <div>
        <Image
          src={`/assets/icons/tools/${icon}`}
          alt={`${title} icon`}
          width={48}
          height={48}
          className="tool-card-icon mb-4 transition-transform duration-200 group-hover:scale-110"
        />
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
