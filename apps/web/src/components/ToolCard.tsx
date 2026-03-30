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
    'bg-[#0E0E0F]', // Brutalist dark background
    'border',
    'border-[#283347]',
    'rounded-none', // Sharp corners
    'transition-none', // Immediate snap on hover
    'hover:-translate-y-1',
    'hover:-translate-x-1',
    'hover:border-[#00ffaa]',
    'hover:shadow-[4px_4px_0px_#00ffaa]', // Harsh 90s offset shadow
    isComingSoon ? 'coming-soon' : 'live',
    isFeatured ? 'featured' : '',
    gridClasses || ''
  ].join(' ');

  const StatusBadge = () => {
    if (isComingSoon) {
      return <span className="absolute top-4 right-4 badge-beta">Still Cooking</span>;
    }
    if(status === 'live' || isFeatured) {
        return <span className="absolute top-4 right-4 badge-beta">STRENGTH TESTING</span>;
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
