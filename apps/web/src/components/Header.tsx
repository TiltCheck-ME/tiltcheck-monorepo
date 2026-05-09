/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */
'use client';

import dynamic from 'next/dynamic';

const Nav = dynamic(() => import('./Nav'), { ssr: false });

// Nav handles its own positioning as a sticky top nav across the site.
const Header = () => <Nav />;

export default Header;
